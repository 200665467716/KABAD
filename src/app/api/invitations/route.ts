import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { listInvitations, sendInvitation } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { invitationSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await listInvitations(user.id));
});

export const POST = route(async (request) => {
  const user = await requireUser();
  await rateLimit(`invite:${user.id}`, 20, 24 * 3600_000, "Vous avez envoyé beaucoup d’invitations aujourd’hui.");
  const input = await readJson(request, invitationSchema);
  return Response.json(await sendInvitation(user.id, input), { status: 201 });
});
