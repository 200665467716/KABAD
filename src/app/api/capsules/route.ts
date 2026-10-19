import { requireUser } from "@/server/auth";
import { publishCapsule } from "@/server/capsules";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { capsuleSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  await rateLimit(`capsule:${user.id}`, 10, 24 * 3600_000, "Vous avez publié beaucoup de capsules aujourd’hui.");
  return Response.json(await publishCapsule(user.id, await readJson(request, capsuleSchema)), { status: 201 });
});
