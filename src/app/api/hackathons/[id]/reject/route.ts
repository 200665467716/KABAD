import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rejectHackathon } from "@/server/hackathons";
import { rejectHackathonSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The KABAD team refuses a proposed hackathon, with a reason for its organizer (P7). */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { reason } = await readJson(request, rejectHackathonSchema);
  return Response.json(await rejectHackathon(user.id, id, reason));
});
