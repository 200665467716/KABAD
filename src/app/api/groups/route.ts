import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createGroup } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { createGroupSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  await rateLimit(`group:${user.id}`, 10, 3600_000, "Vous avez créé beaucoup de groupes.");
  const input = await readJson(request, createGroupSchema);
  return Response.json(await createGroup(user.id, input), { status: 201 });
});
