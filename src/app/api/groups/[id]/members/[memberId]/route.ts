import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { removeGroupMember } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, memberId } = await params;
  return Response.json(await removeGroupMember(user.id, id, memberId));
});
