import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getRoom } from "@/server/rooms";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await getRoom(user.id, id));
});
