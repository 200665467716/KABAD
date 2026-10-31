import { requireVerifiedUser } from "@/server/auth";
import { createTestApp } from "@/server/community-tests";
import { readJson, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { testAppSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireVerifiedUser();
  await rateLimit(`test-app:${user.id}`, 5, 24 * 3600_000, "Tu as publié beaucoup d’applications aujourd’hui.");
  return Response.json(await createTestApp(user.id, await readJson(request, testAppSchema)), { status: 201 });
});
