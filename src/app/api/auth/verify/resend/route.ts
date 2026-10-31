import { sendVerificationEmail } from "@/server/account";
import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async () => {
  const user = await requireUser();
  await rateLimit(`verify-mail:${user.id}`, 3, 3600_000, "Tu as déjà demandé plusieurs e-mails.");
  return Response.json(await sendVerificationEmail(user.id));
});
