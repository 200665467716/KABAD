import { requireVerifiedUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { readJson, route } from "@/server/http";
import { noteSession } from "@/server/mentoring";
import { sessionSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireVerifiedUser();
  await rateLimit(`session-note:${user.id}`, 30, 3600_000, "Vous avez fait beaucoup de modifications récemment.");
  return Response.json(await noteSession(user.id, await readJson(request, sessionSchema)), { status: 201 });
});
