import { requireUser } from "@/server/auth";
import { scoreSubmission } from "@/server/challenges";
import { readJson, route } from "@/server/http";
import { juryScoreSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await scoreSubmission(user.id, id, await readJson(request, juryScoreSchema)));
});
