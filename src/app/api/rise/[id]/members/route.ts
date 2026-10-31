import { requireUser, requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { joinProject, leaveProject } from "@/server/rise";
import { joinSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, joinSchema);
  return Response.json(await joinProject(user.id, id, input));
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await leaveProject(user.id, id));
});
