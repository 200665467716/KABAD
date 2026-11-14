import { requireVerifiedUser } from "@/server/auth";
import { route } from "@/server/http";
import { removeMessage } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

/** The lead of a group removes a message unfit for the group (P5). */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id, messageId } = await params;
  return Response.json(await removeMessage(user.id, id, messageId));
});
