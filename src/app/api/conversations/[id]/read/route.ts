import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { markRead } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  await markRead(user.id, id);
  return new Response(null, { status: 204 });
});
