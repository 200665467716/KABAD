import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { roomSpeakerSchema } from "@/lib/schemas";
import { setSpeaker } from "@/server/rooms";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { userId, speak } = await readJson(request, roomSpeakerSchema);
  return Response.json(await setSpeaker(user.id, id, userId, speak));
});
