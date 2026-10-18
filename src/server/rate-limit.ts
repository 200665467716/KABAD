import { DomainError } from "./errors";

/*
 * Fixed-window limiter kept in memory. Enough for one web instance on the VPS;
 * move it to PostgreSQL or Redis before running several instances.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number, message: string) {
  const now = Date.now();
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  w.count += 1;
  if (w.count > max) {
    const minutes = Math.ceil((w.resetAt - now) / 60_000);
    throw new DomainError("rate_limited", `${message} Réessayez dans ${minutes} min.`, 429);
  }
}

export function resetRateLimit(key: string) {
  windows.delete(key);
}
