import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { setLocale } from "@/server/account";
import { localeSchema } from "@/lib/schemas";

/** Remembers the interface language on the account. */
export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  const input = await readJson(request, localeSchema);
  return Response.json(await setLocale(user.id, input.locale).then(() => ({ ok: true })));
});
