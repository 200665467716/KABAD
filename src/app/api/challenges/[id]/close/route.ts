import { requireUser } from "@/server/auth";
import { closeChallenge } from "@/server/challenges";
import { route } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await closeChallenge(user.id, id));
});
