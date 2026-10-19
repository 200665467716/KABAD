const TZ = "Africa/Lome";

/** "14:02" today, "Hier", "mer." this week, then "12 oct.". Shown in West Africa time (UTC+0). */
export function shortTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("fr-FR", { timeZone: TZ });
  if (day(d) === day(now)) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(d) === day(yesterday)) return "Hier";
  if (now.getTime() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: TZ });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

/** "Aujourd’hui", "Hier" or "vendredi 16 octobre", to separate days in a conversation. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("fr-FR", { timeZone: TZ });
  if (day(d) === day(now)) return "Aujourd’hui";
  if (day(d) === day(new Date(now.getTime() - 86_400_000))) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}

const NBSP = " ";

/** "19 h 00", as written in French. */
export function hourLabel(iso: string): string {
  const [h, m] = clockTime(iso).split(":");
  return `${Number(h)}${NBSP}h${NBSP}${m}`;
}

/** "17 oct." */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
}

/** "17 octobre" */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ });
}

/** "23 octobre à 23 h 59" */
export function dateAndHour(iso: string): string {
  return `${longDate(iso)} à ${hourLabel(iso)}`;
}

/** "Aujourd’hui · 19 h 00", "Demain · 19 h 00" or "vendredi 23 octobre · 19 h 00". */
export function sessionWhen(iso: string, now = new Date()): string {
  const day = (x: Date) => x.toLocaleDateString("fr-FR", { timeZone: TZ });
  const d = new Date(iso);
  const label =
    day(d) === day(now)
      ? "Aujourd’hui"
      : day(d) === day(new Date(now.getTime() + 86_400_000))
        ? "Demain"
        : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  return `${label} · ${hourLabel(iso)}`;
}

/** Time left before a deadline: "6 jours", "5 h", "40 min". */
export function timeLeft(iso: string, now = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "0 min";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}${NBSP}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}${NBSP}h`;
  const days = Math.round(hours / 24);
  return `${days}${NBSP}jours`;
}

/** "Il y a 12 min", "Il y a 3 h", then the short time ("Hier", "mar.", "12 oct."). */
export function agoLabel(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes}${NBSP}min`;
  if (minutes < 6 * 60) return `Il y a ${Math.floor(minutes / 60)}${NBSP}h`;
  return shortTime(iso, now);
}

/** True when the date falls on the same calendar day as `now`, in West Africa time. */
export function isToday(iso: string, now = new Date()): boolean {
  const day = (x: Date) => x.toLocaleDateString("fr-FR", { timeZone: TZ });
  return day(new Date(iso)) === day(now);
}
