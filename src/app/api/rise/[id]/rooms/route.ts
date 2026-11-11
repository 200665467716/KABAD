import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { openRoom } from "@/server/rise";
import { riseRoomSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Opens a room in the project's channel: a video call that starts now, on a Google Meet link. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, riseRoomSchema);
  await rateLimit(`rise-room:${user.id}`, 10, 3600_000, "Tu as ouvert beaucoup de salons. Réessaie dans une heure.");
  return Response.json(await openRoom(user.id, id, input), { status: 201 });
});
