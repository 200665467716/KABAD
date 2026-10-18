import { createSession, login, setSessionCookie } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const { email, password } = await readJson(request, loginSchema);
  const key = `login:${email.toLowerCase()}`;
  rateLimit(key, 5, 15 * 60_000, "Trop d’essais de connexion.");
  const user = await login(email, password);
  resetRateLimit(key);
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return Response.json({ id: user.id, name: user.name });
});
