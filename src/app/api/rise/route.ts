import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createProject } from "@/server/rise";
import { riseProjectSchema } from "@/lib/schemas";

/** Launches a project and its members' chat. */
export const POST = route(async (request: Request) => {
  const user = await requireVerifiedUser();
  const input = await readJson(request, riseProjectSchema);
  await rateLimit(`rise-project:${user.id}`, 5, 24 * 3600_000, "Tu as lancé beaucoup de projets aujourd’hui. Réessaie demain.");
  return Response.json(await createProject(user.id, input), { status: 201 });
});
