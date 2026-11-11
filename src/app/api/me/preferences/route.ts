import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { setPreferences } from "@/server/account";
import { preferencesSchema } from "@/lib/schemas";

/** Preferences of the account: e-mail notifications on or off. */
export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  return Response.json(await setPreferences(user.id, await readJson(request, preferencesSchema)));
});
