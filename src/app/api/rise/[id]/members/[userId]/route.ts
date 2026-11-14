import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { setCoLead } from "@/server/rise";
import { coLeadSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** The initiator names a member co-lead of the project, or takes the role back ({ coLead: false }). */
export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id, userId } = await params;
  const { coLead } = await readJson(request, coLeadSchema);
  return Response.json(await setCoLead(user.id, id, userId, coLead));
});
