import { db, type Db } from "./db";
import { DomainError } from "./errors";

/*
 * Fixed-window limiter stored in PostgreSQL, so every web instance shares the same counters.
 * One atomic statement: a new window starts at 1, an open window counts up.
 */
export async function rateLimit(key: string, max: number, windowMs: number, message: string, prisma: Db = db) {
  const resetAt = new Date(Date.now() + windowMs);
  const [row] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimit" (key, count, "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count     = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit".count + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING count, "resetAt"`;
  if (row.count > max) {
    const minutes = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 60_000));
    throw new DomainError("rate_limited", `${message} Réessayez dans ${minutes} min.`, 429);
  }
}

export async function resetRateLimit(key: string, prisma: Db = db) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Expired windows are useless; removed now and then so the table stays small. */
export async function purgeRateLimits(prisma: Db = db) {
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
