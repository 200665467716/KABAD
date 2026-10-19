import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { correctSession } from "@/server/mentoring";
import { sessionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { pairId: _pairId, ...input } = await readJson(request, sessionSchema);
  return Response.json(await correctSession(user.id, id, input));
});
