import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { unblock } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await unblock(user.id, id));
});
