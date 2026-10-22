import { changePassword } from "@/server/account";
import { getCurrentSession } from "@/server/auth";
import { unauthorized } from "@/server/errors";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { changePasswordSchema } from "@/lib/schemas";

/** Changing the password signs out every other device. */
export const POST = route(async (request) => {
  const session = await getCurrentSession();
  if (!session) throw unauthorized();
  await rateLimit(`password:${session.userId}`, 5, 15 * 60_000, "Trop d’essais.");
  const { current, next } = await readJson(request, changePasswordSchema);
  await changePassword(session.userId, session.id, current, next);
  return Response.json({ ok: true });
});
