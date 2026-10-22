import { requireUser } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { route } from "@/server/http";
import { confirmSession } from "@/server/mentoring";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  await rateLimit(`session-confirm:${user.id}`, 30, 3600_000, "Vous avez fait beaucoup de modifications récemment.");
  const { id } = await params;
  return Response.json(await confirmSession(user.id, id));
});
