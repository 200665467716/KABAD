import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError } from "./errors";

/*
 * Fixed-window limiter stored in PostgreSQL, so every web instance shares the same counters.
 * One atomic statement: a new window starts at 1, an open window counts up.
 */
/**
 * Counts one more attempt and refuses past `max`. Returns how many attempts are left in the window.
 * Called inside a transaction, the count is kept only if the transaction succeeds.
 */
export async function rateLimit(key: string, max: number, windowMs: number, message: string, prisma: Db | Prisma.TransactionClient = db): Promise<{ left: number }> {
  // Now and then, clear expired counters and sessions so the tables stay small (outside a transaction only).
  if ("$connect" in prisma && Math.random() < 0.01) void purgeRateLimits(prisma).catch(() => {});
  // The time comes from the app, like every date Prisma stores (UTC, column without time zone):
  // PostgreSQL's now() would follow the server's time zone and shift the windows.
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const [row] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimit" (key, count, "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count     = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit".count + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
    RETURNING count, "resetAt"`;
  if (row.count > max) {
    const minutes = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 60_000));
    // Past an hour and a half, hours read better: "24 h" rather than "1440 min".
    const wait = minutes > 90 ? `${Math.ceil(minutes / 60)} h` : `${minutes} min`;
    throw new DomainError("rate_limited", `${message} Réessaie dans ${wait}.`, 429);
  }
  return { left: max - row.count };
}

export async function resetRateLimit(key: string, prisma: Db = db) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Expired windows are useless; removed now and then so the table stays small. */
export async function purgeRateLimits(prisma: Db = db) {
  const now = new Date();
  await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.emailToken.deleteMany({ where: { expiresAt: { lt: now } } });
}
