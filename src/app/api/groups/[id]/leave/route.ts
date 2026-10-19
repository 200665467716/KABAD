import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { leaveGroup } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await leaveGroup(user.id, id));
});
