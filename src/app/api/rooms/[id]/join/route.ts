import { requireVerifiedUser } from "@/server/auth";
import { route } from "@/server/http";
import { joinRoom } from "@/server/rooms";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await joinRoom(user, id));
});
