import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { addGroupMembers } from "@/server/messaging";
import { addMembersSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`group-add:${user.id}`, 20, 3600_000, "Vous avez ajouté beaucoup de participants récemment.");
  const { memberIds } = await readJson(request, addMembersSchema);
  return Response.json(await addGroupMembers(user.id, id, memberIds));
});
