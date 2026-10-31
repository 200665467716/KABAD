import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { updateProfile } from "@/server/members";
import { unreadTotal } from "@/server/messaging";
import { unreadNotifications } from "@/server/notifications";
import { deleteAccountSchema, profileSchema } from "@/lib/schemas";
import { deleteAccount } from "@/server/account";
import { destroySession } from "@/server/auth";

export const GET = route(async () => {
  const user = await requireUser();
  const [unreadMessages, notifications] = await Promise.all([unreadTotal(user.id), unreadNotifications(user.id)]);
  return Response.json({
    id: user.id,
    name: user.name,
    role: user.role,
    level: user.level,
    city: user.city,
    locale: user.locale,
    isAdmin: user.isAdmin,
    isMentor: user.seniorVerifiedAt !== null,
    emailVerified: user.emailVerifiedAt !== null,
    unreadMessages,
    unreadNotifications: notifications,
  });
});

/** Second sign-up step, and later profile changes. */
export const PATCH = route(async (request) => {
  const user = await requireUser();
  await updateProfile(user.id, await readJson(request, profileSchema));
  return Response.json({ ok: true });
});

/** Deletes the account for good. Messages stay in the others' conversations, without author. */
export const DELETE = route(async (request) => {
  const user = await requireUser();
  const { password } = await readJson(request, deleteAccountSchema);
  await deleteAccount(user.id, password);
  await destroySession();
  return Response.json({ ok: true });
});
