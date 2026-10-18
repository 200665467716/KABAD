import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { listConversations } from "@/server/messaging";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ conversations: await listConversations(user.id) });
});
