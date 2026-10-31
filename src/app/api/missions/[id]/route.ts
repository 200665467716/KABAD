import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerMission } from "@/server/hackathons";
import { answerMissionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The mentor accepts or declines an instructor mission. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, answerMissionSchema);
  return Response.json(await answerMission(user.id, id, input.accept));
});
