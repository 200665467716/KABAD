import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { listContacts } from "@/server/messaging";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ contacts: await listContacts(user.id) });
});
