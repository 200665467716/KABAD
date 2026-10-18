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
