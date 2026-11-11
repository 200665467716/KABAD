import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { inviteToTeam } from "@/server/hackathons";
import { rateLimit } from "@/server/rate-limit";
import { teamInviteSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The captain invites contacts into the team (H3). */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`team-invite:${user.id}`, 30, 3600_000, "Tu as envoyé beaucoup d’invitations. Réessaie dans un moment.");
  const input = await readJson(request, teamInviteSchema);
  return Response.json(await inviteToTeam(user.id, id, input.memberIds), { status: 201 });
});
