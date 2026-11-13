import { requireVerifiedUser } from "@/server/auth";
import { createTestApp } from "@/server/community-tests";
import { readJson, route } from "@/server/http";
import { testAppSchema } from "@/lib/schemas";

/** Publishes a listing. The daily limit is counted by createTestApp, only for a listing that is published. */
export const POST = route(async (request) => {
  const user = await requireVerifiedUser();
  return Response.json(await createTestApp(user.id, await readJson(request, testAppSchema)), { status: 201 });
});
