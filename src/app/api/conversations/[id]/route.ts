import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getConversation } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const before = new URL(request.url).searchParams.get("avant") ?? undefined;
  if (before && Number.isNaN(Date.parse(before))) return Response.json({ error: "Date invalide." }, { status: 400 });
  return Response.json(await getConversation(user.id, id, { before }));
});
