import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { readJson, route } from "@/server/http";
import { planNextSession } from "@/server/mentoring";
import { nextSessionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  await rateLimit(`pair-plan:${user.id}`, 30, 3600_000, "Vous avez fait beaucoup de modifications récemment.");
  const { id } = await params;
  const { at } = await readJson(request, nextSessionSchema);
  return Response.json(await planNextSession(user.id, id, at));
});
