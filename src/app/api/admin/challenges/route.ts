import { createChallenge } from "@/server/admin";
import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { challengeCreateSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  return Response.json(await createChallenge(user.id, await readJson(request, challengeCreateSchema)), { status: 201 });
});
