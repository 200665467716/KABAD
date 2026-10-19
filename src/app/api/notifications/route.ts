import { z } from "zod";
import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { listNotifications, markNotificationsRead } from "@/server/notifications";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await listNotifications(user.id));
});

/** Marks one notification ({ id }) or all of them ({}) as read. */
export const POST = route(async (request) => {
  const user = await requireUser();
  const { id } = await readJson(request, z.object({ id: z.string().max(64).optional() }));
  await markNotificationsRead(user.id, id);
  return Response.json({ ok: true });
});
