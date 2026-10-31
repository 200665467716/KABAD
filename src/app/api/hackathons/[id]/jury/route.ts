import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { setJury } from "@/server/admin";
import { jurySchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, jurySchema);
  return Response.json(await setJury(user.id, id, input.jurorIds));
});
