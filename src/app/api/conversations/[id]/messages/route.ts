import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { sendMessage } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { sendMessageSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  rateLimit(`message:${user.id}`, 30, 60_000, "Vous envoyez trop de messages d’un coup.");
  const { id } = await params;
  const input = await readJson(request, sendMessageSchema);
  return Response.json(await sendMessage(user.id, id, input), { status: 201 });
});
