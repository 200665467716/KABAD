import { requireUser } from "@/server/auth";
import { submitSolution } from "@/server/challenges";
import { readJson, route } from "@/server/http";
import { submissionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { solo: _solo, explainable: _explainable, ...input } = await readJson(request, submissionSchema);
  return Response.json(await submitSolution(user.id, id, input));
});
