import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createProject } from "@/server/rise";
import { riseProjectSchema } from "@/lib/schemas";

/** Launches a project and its members' chat. */
export const POST = route(async (request: Request) => {
  const user = await requireVerifiedUser();
  const input = await readJson(request, riseProjectSchema);
  return Response.json(await createProject(user.id, input), { status: 201 });
});
