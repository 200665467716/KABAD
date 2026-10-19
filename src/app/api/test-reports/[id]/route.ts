import { requireUser } from "@/server/auth";
import { reviewReport } from "@/server/community-tests";
import { readJson, route } from "@/server/http";
import { reviewReportSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await reviewReport(user.id, id, await readJson(request, reviewReportSchema)));
});
