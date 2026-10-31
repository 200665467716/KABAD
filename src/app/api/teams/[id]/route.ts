import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { leaveTeam, updateTeam } from "@/server/hackathons";
import { teamUpdateSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, teamUpdateSchema);
  return Response.json(await updateTeam(user.id, id, input));
});

/** Leaves the team before registrations close. */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await leaveTeam(user.id, id));
});
