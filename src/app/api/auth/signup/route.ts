import { sendVerificationEmail } from "@/server/account";
import { createSession, hashPassword, setSessionCookie } from "@/server/auth";
import { db } from "@/server/db";
import { DomainError } from "@/server/errors";
import { clientIp, readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { signupSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  await rateLimit(`signup:${clientIp(request)}`, 10, 60 * 60_000, "Trop de comptes créés depuis cette connexion.");
  const { name, email, password } = await readJson(request, signupSchema);
  const normalized = email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email: normalized }, select: { id: true } })) {
    throw new DomainError("email_taken", "Cette adresse a déjà un compte. Connectez-vous, ou utilisez « Mot de passe oublié ».", 409, "email");
  }
  const user = await db.user.create({ data: { name, email: normalized, passwordHash: await hashPassword(password) } });
  // The account works right away; contacting members waits for the e-mail check.
  await sendVerificationEmail(user.id).catch((e) => console.error("E-mail de vérification non envoyé", e));
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return Response.json({ id: user.id, name: user.name }, { status: 201 });
});
