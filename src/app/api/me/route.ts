import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { unreadTotal } from "@/server/messaging";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({
    id: user.id,
    name: user.name,
    role: user.role,
    city: user.city,
    unreadMessages: await unreadTotal(user.id),
  });
});
