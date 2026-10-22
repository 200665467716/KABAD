import { verifyEmail } from "@/server/account";
import { readJson, route } from "@/server/http";
import { verifyEmailSchema } from "@/lib/schemas";

/** POST, not GET: mail scanners that open links do not use up the token. */
export const POST = route(async (request) => {
  const { token } = await readJson(request, verifyEmailSchema);
  await verifyEmail(token);
  return Response.json({ ok: true });
});
