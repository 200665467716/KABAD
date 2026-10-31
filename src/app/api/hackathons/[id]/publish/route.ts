import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { publishHackathon } from "@/server/hackathons";

type Ctx = { params: Promise<{ id: string }> };

/** The KABAD team publishes a proposed hackathon. */
export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await publishHackathon(user.id, id));
});
