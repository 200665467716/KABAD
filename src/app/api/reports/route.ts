import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { createReport } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { reportPost } from "@/server/rise";
import { reportSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  await rateLimit(`report:${user.id}`, 20, 3600_000, "Tu as envoyé beaucoup de signalements.");
  const input = await readJson(request, reportSchema);
  // A post of a Rise-Up project follows its own rule: a lead of the project hides it at once.
  if (input.targetType === "RISE_POST") return Response.json(await reportPost(user.id, input.targetId, input), { status: 201 });
  return Response.json(await createReport(user.id, { ...input, targetType: input.targetType }), { status: 201 });
});
