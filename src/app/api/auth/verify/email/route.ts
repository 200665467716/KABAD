import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { changeUnverifiedEmail } from "@/server/account";
import { changeEmailSchema } from "@/lib/schemas";

/** Fixes a typo in the address before it is confirmed. */
export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  const input = await readJson(request, changeEmailSchema);
  return Response.json(await changeUnverifiedEmail(user.id, input.email));
});
