import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { roomMemberSchema } from "@/lib/schemas";
import { removeFromRoom } from "@/server/rooms";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { userId } = await readJson(request, roomMemberSchema);
  return Response.json(await removeFromRoom(user.id, id, userId));
});
