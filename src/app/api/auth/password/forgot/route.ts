import { requestPasswordReset } from "@/server/account";
import { clientIp, readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { forgotPasswordSchema } from "@/lib/schemas";

/** Same answer whether the address has an account or not. */
export const POST = route(async (request) => {
  const { email } = await readJson(request, forgotPasswordSchema);
  await rateLimit(`forgot-ip:${clientIp(request)}`, 10, 3600_000, "Trop de demandes depuis cette connexion.");
  await rateLimit(`forgot:${email.toLowerCase()}`, 3, 3600_000, "Plusieurs e-mails sont déjà partis pour cette adresse.");
  await requestPasswordReset(email);
  return Response.json({ ok: true });
});
