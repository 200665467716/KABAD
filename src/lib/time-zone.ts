/*
 * Fuseaux horaires. Le serveur rend les pages à l'heure de Lomé (GMT) ; l'appareil remet ensuite ses
 * propres heures (voir device-time-zone.ts). Les jours se comptent dans un fuseau donné, jamais dans celui
 * de la machine : le serveur et le téléphone trouvent ainsi le même « Hier » pendant l'hydratation.
 */

/** The zone of the server-rendered pages, and of a member who did not give one. */
export const DEFAULT_TIME_ZONE = "Africa/Lome";

/** "2026-11-14": the calendar day of a date in a time zone. */
export function dayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Whole calendar days from `a` to `b` in a time zone: 1 when `a` was yesterday and `b` is today. */
export function daysApart(a: Date, b: Date, timeZone: string): number {
  return Math.round((Date.parse(dayKey(b, timeZone)) - Date.parse(dayKey(a, timeZone))) / 86_400_000);
}
