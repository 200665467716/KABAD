import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerRequest } from "@/server/mentoring";
import { answerRequestSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const { accept } = await readJson(request, answerRequestSchema);
  return Response.json(await answerRequest(user.id, id, accept));
});
