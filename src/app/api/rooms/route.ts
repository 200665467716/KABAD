import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createRoom } from "@/server/rooms";
import { roomSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireVerifiedUser();
  await rateLimit(`room:${user.id}`, 5, 24 * 3600_000, "Vous avez créé beaucoup de salons aujourd’hui.");
  return Response.json(await createRoom(user.id, await readJson(request, roomSchema)), { status: 201 });
});
