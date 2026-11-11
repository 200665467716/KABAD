import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { updateGroup } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { updateGroupSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The owner renames a private group or changes its theme. */
export const PATCH = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`group-edit:${user.id}`, 30, 3600_000, "Tu as modifié des groupes de nombreuses fois. Réessaie dans un moment.");
  const input = await readJson(request, updateGroupSchema);
  return Response.json(await updateGroup(user.id, id, input));
});
