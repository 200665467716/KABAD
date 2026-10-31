/** The current time, read once per request by the server pages (dates and countdowns). */
export function readClock(): number {
  return Date.now();
}
