import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerJoinRequest, cancelTeamInvite } from "@/server/hackathons";
import { answerJoinSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The captain answers a request to join the team; an invited member answers the invitation. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, answerJoinSchema);
  return Response.json(await answerJoinRequest(user.id, id, input.accept));
});

/** The captain takes back an invitation still waiting for an answer. */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await cancelTeamInvite(user.id, id));
});
