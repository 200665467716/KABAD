import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateSession } from "@/server/mentoring";
import { rateSessionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The dev rates a session that is over, once. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await rateSession(user.id, id, await readJson(request, rateSessionSchema)), { status: 201 });
});
