import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { scoreSubmission } from "@/server/hackathons";
import { juryScoreSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, juryScoreSchema);
  return Response.json(await scoreSubmission(user.id, id, input));
});
