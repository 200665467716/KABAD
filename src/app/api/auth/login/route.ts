import { createSession, login, setSessionCookie } from "@/server/auth";
import { clientIp, readJson, route } from "@/server/http";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const { email, password } = await readJson(request, loginSchema);
  const ip = clientIp(request);
  // Per connection: stops trying one password on many accounts. Per account and connection: stops guessing,
  // without letting a stranger lock someone else out of their account.
  await rateLimit(`login-ip:${ip}`, 30, 15 * 60_000, "Trop d’essais de connexion depuis cette connexion.");
  const key = `login:${email.toLowerCase()}:${ip}`;
  await rateLimit(key, 5, 15 * 60_000, "Trop d’essais de connexion.");
  const user = await login(email, password);
  await resetRateLimit(key);
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return Response.json({ id: user.id, name: user.name });
});
