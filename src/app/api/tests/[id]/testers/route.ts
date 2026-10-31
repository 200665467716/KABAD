import { requireUser, requireVerifiedUser } from "@/server/auth";
import { route } from "@/server/http";
import { joinTest, leaveTest } from "@/server/community-tests";

type Ctx = { params: Promise<{ id: string }> };

/** Takes a place and opens the testers' group. */
export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await joinTest(user.id, id));
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await leaveTest(user.id, id));
});
