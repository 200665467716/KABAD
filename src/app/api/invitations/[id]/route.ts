import { requireUser, requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerInvitation, cancelInvitation, getInvitation } from "@/server/messaging";
import { answerInvitationSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await getInvitation(user.id, id));
});

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const { accept } = await readJson(request, answerInvitationSchema);
  return Response.json(await answerInvitation(user.id, id, accept));
});

/** The sender withdraws an invitation not answered yet. */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await cancelInvitation(user.id, id));
});
