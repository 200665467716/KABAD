import { resetPassword } from "@/server/account";
import { createSession, setSessionCookie } from "@/server/auth";
import { clientIp, readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { resetPasswordSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  await rateLimit(`reset-ip:${clientIp(request)}`, 10, 3600_000, "Trop de tentatives depuis cette connexion.");
  const { token, password } = await readJson(request, resetPasswordSchema);
  const { userId } = await resetPassword(token, password);
  const session = await createSession(userId);
  await setSessionCookie(session.token, session.expiresAt);
  return Response.json({ ok: true });
});
