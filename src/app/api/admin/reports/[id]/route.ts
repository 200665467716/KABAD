import { resolveReport } from "@/server/admin";
import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { adminReportSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const { decision, note } = await readJson(request, adminReportSchema);
  return Response.json(await resolveReport(user.id, id, decision, note));
});
