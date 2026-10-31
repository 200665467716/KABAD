import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { proposeMissions } from "@/server/hackathons";
import { missionsSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The organizer offers paid instructor missions to mentors. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, missionsSchema);
  return Response.json(await proposeMissions(user.id, id, input.mentorIds));
});
