/**
 * Mentoring slots. A mentor gives weekly ranges in their own time zone ("Tuesday 15:00 – 18:00");
 * KABAD cuts them into 30-minute slots. Pure functions, without any library: the time zone
 * arithmetic relies on Intl, available in Node and in every browser.
 */
export const SLOT_MINUTES = 30;
/** A slot can be booked up to 2 hours before it starts, so the mentor has time to read the request. */
export const MIN_NOTICE_MINUTES = 120;

/** weekday: 1 = Monday … 7 = Sunday. Minutes from local midnight. */
export type WeeklyRange = { weekday: number; startMin: number; endMin: number };
export type LocalDay = { y: number; m: number; d: number; weekday: number };

function parts(date: Date, timeZone: string) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(date)) out[p.type] = p.value;
  return out;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The calendar day a moment falls on, in a time zone. */
export function localDay(date: Date, timeZone: string): LocalDay {
  const p = parts(date, timeZone);
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), weekday: WEEKDAYS.indexOf(p.weekday) + 1 };
}

/** "2026-11-05": the key of a local day, used for blocked dates. */
export function dayKey(day: Pick<LocalDay, "y" | "m" | "d">): string {
  return `${day.y}-${String(day.m).padStart(2, "0")}-${String(day.d).padStart(2, "0")}`;
}

/** Offset of a time zone from UTC at a given moment, in milliseconds. */
function offsetAt(date: Date, timeZone: string): number {
  const p = parts(date, timeZone);
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The moment a local wall-clock time happens. Two passes handle the days the clocks change (diaspora in Europe). */
export function zonedToUtc(day: Pick<LocalDay, "y" | "m" | "d">, minutes: number, timeZone: string): Date {
  const guess = Date.UTC(day.y, day.m - 1, day.d, 0, minutes);
  const first = guess - offsetAt(new Date(guess), timeZone);
  return new Date(guess - offsetAt(new Date(first), timeZone));
}

function nextDay(day: LocalDay): LocalDay {
  const t = new Date(Date.UTC(day.y, day.m - 1, day.d + 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), weekday: (day.weekday % 7) + 1 };
}

/** Refuses ranges that are out of the day, not on the half hour, empty or overlapping on the same day. */
export function rangesProblem(ranges: WeeklyRange[]): string | null {
  for (const r of ranges) {
    if (!Number.isInteger(r.weekday) || r.weekday < 1 || r.weekday > 7) return "Jour invalide.";
    if (r.startMin < 0 || r.endMin > 24 * 60 || r.startMin % SLOT_MINUTES || r.endMin % SLOT_MINUTES) return "Les plages commencent et finissent à l’heure ou à la demie.";
    if (r.endMin - r.startMin < SLOT_MINUTES) return "Une plage dure au moins 30 minutes.";
  }
  for (let w = 1; w <= 7; w++) {
    const day = ranges.filter((r) => r.weekday === w).sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < day.length; i++) if (day[i].startMin < day[i - 1].endMin) return "Deux plages du même jour se chevauchent.";
  }
  return null;
}

/** The whole day, in minutes. */
const DAY_MINUTES = 24 * 60;

/**
 * The range offered when a mentor adds one to a day (screen M8): two hours in the evening on an empty day,
 * otherwise after the last range (an hour later when the day allows it), otherwise in the widest gap left.
 * Null when no free hour is left: the new range never overlaps the others.
 */
export function suggestRange(day: Array<Pick<WeeklyRange, "startMin" | "endMin">>): { startMin: number; endMin: number } | null {
  if (day.length === 0) return { startMin: 18 * 60, endMin: 20 * 60 };
  const sorted = [...day].sort((a, b) => a.startMin - b.startMin);
  const last = sorted[sorted.length - 1];
  if (last.endMin + 60 <= DAY_MINUTES) {
    const startMin = last.endMin + 120 <= DAY_MINUTES ? last.endMin + 60 : last.endMin;
    return { startMin, endMin: Math.min(startMin + 120, DAY_MINUTES) };
  }
  // No room after the last range (it ends at midnight): the widest gap before it.
  let best: { startMin: number; endMin: number } | null = null;
  let from = 0;
  for (const r of sorted) {
    if (r.startMin - from >= 60 && (!best || r.startMin - from > best.endMin - best.startMin)) best = { startMin: from, endMin: r.startMin };
    from = Math.max(from, r.endMin);
  }
  if (!best) return null;
  // At most two hours, placed at the end of the gap, just before the next range.
  return { startMin: Math.max(best.startMin, best.endMin - 120), endMin: best.endMin };
}

export type SlotQuery = {
  ranges: WeeklyRange[];
  timeZone: string;
  from: Date;
  to: Date;
  now: Date;
  /** Local days off, as dayKey(). */
  blocked?: Iterable<string>;
  /** Start times already booked, in milliseconds. */
  taken?: Iterable<number>;
  noticeMinutes?: number;
};

/** Free 30-minute slots between `from` and `to`, in chronological order. */
export function freeSlots(q: SlotQuery): Date[] {
  const blocked = new Set(q.blocked ?? []);
  const taken = new Set(q.taken ?? []);
  const earliest = q.now.getTime() + (q.noticeMinutes ?? MIN_NOTICE_MINUTES) * 60_000;
  const out: Date[] = [];
  const last = dayKey(localDay(q.to, q.timeZone));
  for (let day = localDay(q.from, q.timeZone); ; day = nextDay(day)) {
    const key = dayKey(day);
    if (!blocked.has(key)) {
      for (const r of q.ranges.filter((x) => x.weekday === day.weekday)) {
        for (let m = r.startMin; m + SLOT_MINUTES <= r.endMin; m += SLOT_MINUTES) {
          const at = zonedToUtc(day, m, q.timeZone);
          const t = at.getTime();
          if (t >= earliest && t >= q.from.getTime() && t < q.to.getTime() && !taken.has(t)) out.push(at);
        }
      }
    }
    if (key >= last) break;
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/** True when `at` is one of the mentor's slots: used to check a booking on the server. */
export function isOfferedSlot(at: Date, q: Omit<SlotQuery, "from" | "to">): boolean {
  const from = new Date(at.getTime());
  const to = new Date(at.getTime() + 1);
  return freeSlots({ ...q, from, to }).some((s) => s.getTime() === at.getTime());
}

/** The most days blocked at once, as the server allows (src/lib/schemas.ts, availabilitySchema). */
export const MAX_BLOCKED_DAYS = 60;

/** "2026-11-20" + n days, in calendar days (no time zone involved). */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The days from `from` to `to`, both included (P17: block a holiday in one go). An end before the start, or no end,
 * gives the start day alone; the list stops at `max` days.
 */
export function daysBetween(from: string, to: string | null | undefined, max = MAX_BLOCKED_DAYS): string[] {
  if (!to || to <= from) return [from];
  const out: string[] = [];
  for (let day = from; day <= to && out.length < max; day = addDays(day, 1)) out.push(day);
  return out;
}

export type BlockedDay = { day: string; reason: string };

/** Consecutive days with the same reason, shown as one line « du 20 au 24 novembre ». The days are sorted first. */
export function groupDays(days: BlockedDay[]): Array<{ from: string; to: string; reason: string; days: string[] }> {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const out: Array<{ from: string; to: string; reason: string; days: string[] }> = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && last.reason === d.reason && addDays(last.to, 1) === d.day) {
      last.to = d.day;
      last.days.push(d.day);
    } else {
      out.push({ from: d.day, to: d.day, reason: d.reason, days: [d.day] });
    }
  }
  return out;
}
