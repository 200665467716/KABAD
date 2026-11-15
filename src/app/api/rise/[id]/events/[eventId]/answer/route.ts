import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerRoom } from "@/server/rise";
import { answerRoomSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string; eventId: string }> };

/** A lead of the project approves a room proposed by a member ({ approve: true }) or refuses it. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id, eventId } = await params;
  const { approve } = await readJson(request, answerRoomSchema);
  return Response.json(await answerRoom(user.id, id, eventId, approve));
});
