import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerJoinRequest } from "@/server/hackathons";
import { answerJoinSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The captain answers a request to join the team. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, answerJoinSchema);
  return Response.json(await answerJoinRequest(user.id, id, input.accept));
});
