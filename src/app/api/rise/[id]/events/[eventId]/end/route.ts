import { requireVerifiedUser } from "@/server/auth";
import { route } from "@/server/http";
import { closeRoom } from "@/server/rise";

type Ctx = { params: Promise<{ id: string; eventId: string }> };

/** Closes a live room before its planned end, or cancels an event (its author or a lead of the project). */
export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id, eventId } = await params;
  return Response.json(await closeRoom(user.id, id, eventId));
});
