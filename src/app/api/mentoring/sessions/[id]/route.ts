import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { readJson, route } from "@/server/http";
import { correctSession } from "@/server/mentoring";
import { sessionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  await rateLimit(`session-edit:${user.id}`, 30, 3600_000, "Vous avez fait beaucoup de modifications récemment.");
  const { id } = await params;
  const { pairId: _pairId, ...input } = await readJson(request, sessionSchema);
  return Response.json(await correctSession(user.id, id, input));
});
