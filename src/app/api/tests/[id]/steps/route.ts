import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { setStep } from "@/server/community-tests";
import { testStepSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, testStepSchema);
  return Response.json(await setStep(user.id, id, input.index, input.done));
});
