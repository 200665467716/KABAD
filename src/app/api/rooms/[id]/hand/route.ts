import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { roomHandSchema } from "@/lib/schemas";
import { raiseHand } from "@/server/rooms";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { up } = await readJson(request, roomHandSchema);
  return Response.json(await raiseHand(user.id, id, up));
});
