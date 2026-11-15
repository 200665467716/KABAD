import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { pinMessage } from "@/server/messaging";
import { pinMessageSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

/** The owner of a group pins a message, or unpins it ({ pinned: false }). */
export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id, messageId } = await params;
  const { pinned } = await readJson(request, pinMessageSchema);
  return Response.json(await pinMessage(user.id, id, messageId, pinned));
});
