import { requireUser } from "@/server/auth";
import { markPayoutSent } from "@/server/hackathons";
import { readJson, route } from "@/server/http";
import { payoutSentSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { reference } = await readJson(request, payoutSentSchema);
  return Response.json(await markPayoutSent(user.id, id, reference));
});
