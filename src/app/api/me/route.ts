import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { updateProfile } from "@/server/members";
import { unreadTotal } from "@/server/messaging";
import { unreadNotifications } from "@/server/notifications";
import { profileSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const user = await requireUser();
  const [unreadMessages, notifications] = await Promise.all([unreadTotal(user.id), unreadNotifications(user.id)]);
  return Response.json({ id: user.id, name: user.name, role: user.role, city: user.city, isAdmin: user.isAdmin, unreadMessages, unreadNotifications: notifications });
});

/** Second sign-up step, and later profile changes. */
export const PATCH = route(async (request) => {
  const user = await requireUser();
  await updateProfile(user.id, await readJson(request, profileSchema));
  return Response.json({ ok: true });
});
