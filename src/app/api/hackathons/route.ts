import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createHackathon } from "@/server/hackathons";
import { hackathonSchema } from "@/lib/schemas";

/** An organizer proposes a hackathon; the KABAD team publishes it. */
export const POST = route(async (request: Request) => {
  const user = await requireVerifiedUser();
  const input = await readJson(request, hackathonSchema);
  return Response.json(await createHackathon(user.id, input), { status: 201 });
});
