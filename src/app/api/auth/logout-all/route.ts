import { signOutEverywhere } from "@/server/account";
import { destroySession, requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { notify } from "@/server/realtime-events";
import { db } from "@/server/db";

export const POST = route(async () => {
  const user = await requireUser();
  await signOutEverywhere(user.id);
  await destroySession();
  // Open realtime connections of this member are closed too.
  await db.$transaction((tx) => notify(tx, { t: "revoke", recipients: [user.id] }));
  return Response.json({ ok: true });
});
