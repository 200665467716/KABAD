import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { requestMentoring } from "@/server/mentoring";
import { rateLimit } from "@/server/rate-limit";
import { mentorRequestSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireVerifiedUser();
  await rateLimit(`mentor-request:${user.id}`, 10, 24 * 3600_000, "Vous avez envoyé beaucoup de demandes aujourd’hui.");
  return Response.json(await requestMentoring(user.id, await readJson(request, mentorRequestSchema)), { status: 201 });
});
