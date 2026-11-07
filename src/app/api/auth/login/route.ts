import { createSession, login, setSessionCookie } from "@/server/auth";
import { clientIp, readJson, route } from "@/server/http";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/lib/schemas";
import { DomainError } from "@/server/errors";

/** Wrong passwords allowed per account and connection, every 15 minutes. */
const LOGIN_ATTEMPTS = 5;

export const POST = route(async (request) => {
  const { email, password } = await readJson(request, loginSchema);
  const ip = clientIp(request);
  // Per connection: stops trying one password on many accounts. Per account and connection: stops guessing,
  // without letting a stranger lock someone else out of their account.
  await rateLimit(`login-ip:${ip}`, 30, 15 * 60_000, "Trop d’essais de connexion depuis cette connexion.");
  const key = `login:${email.toLowerCase()}:${ip}`;
  const { left } = await rateLimit(key, LOGIN_ATTEMPTS, 15 * 60_000, "Trop d’essais de connexion.");
  const user = await login(email, password).catch((e) => {
    // A7e: the screen says how many attempts are left before the 15-minute block.
    if (e instanceof DomainError && e.code === "bad_credentials") throw new DomainError(e.code, e.message, e.status, "password", { left });
    throw e;
  });
  await resetRateLimit(key);
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return Response.json({ id: user.id, name: user.name, locale: user.locale });
});
