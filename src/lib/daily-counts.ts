/*
 * Activité jour par jour du tableau de bord de l'équipe : inscriptions et messages des 14 derniers jours.
 * Les jours sont comptés en temps universel (GMT, l'heure de référence de la CADEV).
 */

export type DayCount = { day: string; count: number };

/** "2026-11-13": the UTC day of a date. */
export const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The last `days` days up to today, oldest first, each with its count. A day without a row counts 0:
 * the database only returns the days that had activity.
 */
export function dailyCounts(rows: Array<{ day: Date | string; count: number | bigint }>, days: number, now = new Date()): DayCount[] {
  const byDay = new Map(rows.map((r) => [typeof r.day === "string" ? r.day.slice(0, 10) : utcDay(r.day), Number(r.count)]));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) => {
    const day = utcDay(new Date(today - (days - 1 - i) * 86_400_000));
    return { day, count: byDay.get(day) ?? 0 };
  });
}

/** The last 7 days against the 7 before them, from a 14-day series. */
export function weekOverWeek(series: DayCount[]): { current: number; previous: number; change: number } {
  const sum = (list: DayCount[]) => list.reduce((s, d) => s + d.count, 0);
  const current = sum(series.slice(-7));
  const previous = sum(series.slice(-14, -7));
  return { current, previous, change: current - previous };
}
