"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { formatClock } from "@/lib/format";
import { SLOT_MINUTES } from "@/lib/slots";
import { zoneCity } from "@/lib/time-zones";

/** "2026-11-05": the calendar day of a moment in a time zone. */
function dayOf(iso: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * Month calendar and slots of a mentor (screen M3), shown at the member's own time.
 * Days with at least one free slot are in bold; a slot already booked is shown crossed out and cannot be
 * picked; picking a free slot leads to the booking form.
 */
/** `zone` is computed on the server ("UTC+0"): Node and the browser do not always name an offset the same way. */
export function SlotPicker({ mentorId, slots, taken = [], timeZone, zone }: { mentorId: string; slots: string[]; taken?: string[]; timeZone: string; zone: string }) {
  const t = useTranslations("mentoring.profile");
  const format = useFormatter();
  const locale = useLocale();
  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots) {
      const k = dayOf(s, timeZone);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots, timeZone]);
  const booked = useMemo(() => new Set(taken), [taken]);
  const firstDay = slots.length ? dayOf(slots[0], timeZone) : dayOf(new Date(), timeZone);
  const [month, setMonth] = useState(firstDay.slice(0, 7));
  const [day, setDay] = useState<string | null>(slots.length ? firstDay : null);
  const [slot, setSlot] = useState<string | null>(null);

  const months = [...new Set([dayOf(new Date(), timeZone).slice(0, 7), ...[...byDay.keys()].map((k) => k.slice(0, 7))])].sort();
  const mi = months.indexOf(month);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const monthLabel = format.dateTime(new Date(Date.UTC(y, m - 1, 15)), { month: "long", year: "numeric", timeZone: "UTC" });
  const weekdays = Array.from({ length: 7 }, (_, i) => format.dateTime(new Date(Date.UTC(2026, 10, 2 + i)), { weekday: "short", timeZone: "UTC" }));
  // The free slots of the day and, among them in order of time, those someone already booked.
  const daySlots = day ? [...(byDay.get(day) ?? []), ...taken.filter((s) => dayOf(s, timeZone) === day)].sort() : [];
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone });

  if (slots.length === 0) return <p className="rounded-action bg-bg px-4 py-6 text-center text-muted">{t("noSlots")}</p>;

  return (
    <>
      <section aria-labelledby="mp-month" className="grid gap-2 rounded-lg border-2 border-line-strong bg-raised p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label={t("prevMonth")} disabled={mi <= 0} onClick={() => setMonth(months[mi - 1])} className="inline-grid size-11 place-items-center rounded-full hover:bg-bg disabled:opacity-30">
            <Icon name="back" size={20} />
          </button>
          <h2 id="mp-month" className="font-display text-base font-bold capitalize">
            {monthLabel}
          </h2>
          <button type="button" aria-label={t("nextMonth")} disabled={mi >= months.length - 1} onClick={() => setMonth(months[mi + 1])} className="inline-grid size-11 place-items-center rounded-full hover:bg-bg disabled:opacity-30">
            <Icon name="chevron" size={20} />
          </button>
        </div>
        <div aria-hidden="true" className="grid grid-cols-7 text-center text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
          {weekdays.map((w) => (
            <span key={w}>{w.replace(".", "")}</span>
          ))}
        </div>
        <div role="group" aria-label={t("days")} className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const key = `${month}-${String(i + 1).padStart(2, "0")}`;
            const open = byDay.has(key);
            const label = format.dateTime(new Date(`${key}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
            return (
              <button
                key={key}
                type="button"
                disabled={!open}
                aria-pressed={day === key}
                aria-label={open ? t("dayAvailable", { day: label }) : t("dayUnavailable", { day: label })}
                onClick={() => {
                  setDay(key);
                  setSlot(null);
                }}
                className={cn(
                  "grid h-11 place-items-center rounded-md text-sm tabular",
                  open ? "font-extrabold text-ink hover:bg-brand-wash" : "text-subtle",
                  day === key && "bg-brand text-on-brand hover:bg-brand",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="mp-hours" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="mp-hours" className="font-display text-md font-extrabold uppercase">
            {day ? format.dateTime(new Date(`${day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : t("hours")}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted">
            <Icon name="globe" size={16} />
            {t("localTime", { city: zoneCity(timeZone), zone })}
          </span>
        </div>
        {day ? (
          <div role="group" aria-label={t("hours")} className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {daySlots.map((s) =>
              booked.has(s) ? (
                <button key={s} type="button" disabled aria-label={t("slotTaken", { time: time(s) })} className="h-12 rounded-md border-2 border-dashed border-muted text-[15px] font-normal text-muted line-through tabular">
                  {time(s)}
                </button>
              ) : (
                <button
                  key={s}
                  type="button"
                  aria-pressed={slot === s}
                  onClick={() => setSlot(s)}
                  className={cn("h-12 rounded-md border-2 border-line-strong text-[15px] font-extrabold tabular", slot === s ? "bg-ink text-raised" : "bg-raised text-ink hover:bg-bg")}
                >
                  {time(s)}
                </button>
              ),
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("pickDay")}</p>
        )}
      </section>

      <div className="grid gap-2">
        {/* M3: « Jeu. 5 nov. · 15 h 00 – 15 h 30 ». */}
        {slot && (
          <p className="text-center text-sm font-bold first-letter:uppercase">
            {t("summary", {
              date: format.dateTime(new Date(slot), { weekday: "short", day: "numeric", month: "short", timeZone }),
              from: formatClock(new Date(slot), locale, timeZone),
              to: formatClock(new Date(new Date(slot).getTime() + SLOT_MINUTES * 60_000), locale, timeZone),
            })}
          </p>
        )}
        {slot ? (
          <ButtonLink href={`/mentorat/mentors/${mentorId}/reserver?creneau=${encodeURIComponent(slot)}`} size="lg" block>
            {t("continue")}
          </ButtonLink>
        ) : (
          <Button size="lg" block disabled>
            {t("pickSlot")}
          </Button>
        )}
      </div>
    </>
  );
}
