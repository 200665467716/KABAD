import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { submitSolution } from "@/server/hackathons";
import { isPublicRepo } from "@/server/repo-check";
import { submissionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The team's solution, editable until the end. */
export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const { teamAgrees: _teamAgrees, ...rest } = await readJson(request, submissionSchema);
  return Response.json(await submitSolution(user.id, id, rest, undefined, isPublicRepo));
});
