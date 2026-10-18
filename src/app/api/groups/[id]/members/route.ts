import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { addGroupMembers } from "@/server/messaging";
import { addMembersSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { memberIds } = await readJson(request, addMembersSchema);
  return Response.json(await addGroupMembers(user.id, id, memberIds));
});
