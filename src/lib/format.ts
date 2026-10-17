const NBSP = " ";

/** 250000 → "250 000" with non-breaking spaces, as written in French. */
export function formatNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 250000 → "250 000 F CFA". */
export function formatFCFA(value: number): string {
  return `${formatNumber(value)}${NBSP}F${NBSP}CFA`;
}

/** 270 → "4 h 30", 60 → "1 h", 45 → "45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}${NBSP}h`;
  return `${h}${NBSP}h${NBSP}${m.toString().padStart(2, "0")}`;
}

/** "Awa Diop" → "AD". Works with letters such as Ɔ or Ɗ. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase("fr") ?? "")
    .join("");
}
