import { createSession, hashPassword, setSessionCookie } from "@/server/auth";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { signupSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  rateLimit(`signup:${ip}`, 10, 60 * 60_000, "Trop de comptes créés depuis cette connexion.");
  const { name, email, password } = await readJson(request, signupSchema);
  const normalized = email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email: normalized }, select: { id: true } })) {
    throw new DomainError("email_taken", "Un compte existe déjà avec cette adresse. Connectez-vous.", 409);
  }
  const user = await db.user.create({ data: { name, email: normalized, passwordHash: await hashPassword(password) } });
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return Response.json({ id: user.id, name: user.name }, { status: 201 });
});
