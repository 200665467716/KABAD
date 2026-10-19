import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { planNextSession } from "@/server/mentoring";
import { nextSessionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { at } = await readJson(request, nextSessionSchema);
  return Response.json(await planNextSession(user.id, id, at));
});
