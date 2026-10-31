import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { verifyEmailCode } from "@/server/account";
import { verifyCodeSchema } from "@/lib/schemas";

/** The 6-digit code typed at sign-up. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const input = await readJson(request, verifyCodeSchema);
  return Response.json(await verifyEmailCode(user.id, input.code));
});
