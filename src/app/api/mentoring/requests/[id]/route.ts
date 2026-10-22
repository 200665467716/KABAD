import { requireUser, requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerRequest, cancelRequest } from "@/server/mentoring";
import { answerRequestSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const { accept } = await readJson(request, answerRequestSchema);
  return Response.json(await answerRequest(user.id, id, accept));
});

/** The junior withdraws a request that has not been answered. */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await cancelRequest(user.id, id));
});
