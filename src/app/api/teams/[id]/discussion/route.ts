import { requireVerifiedUser } from "@/server/auth";
import { route } from "@/server/http";
import { teamDiscussion } from "@/server/hackathons";

type Ctx = { params: Promise<{ id: string }> };

/** Gives the team's discussion, and opens it for a team created before discussions existed (H4). */
export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await teamDiscussion(user.id, id));
});
