import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createEvent } from "@/server/rise";
import { riseEventSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Schedules a meeting held on an external video link (D7). */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, riseEventSchema);
  return Response.json(await createEvent(user.id, id, input), { status: 201 });
});
