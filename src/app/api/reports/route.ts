import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createReport } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { reportSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  rateLimit(`report:${user.id}`, 20, 3600_000, "Vous avez envoyé beaucoup de signalements.");
  const input = await readJson(request, reportSchema);
  return Response.json(await createReport(user.id, input), { status: 201 });
});
