import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { noteSession } from "@/server/mentoring";
import { sessionSchema } from "@/lib/schemas";

export const POST = route(async (request) => {
  const user = await requireUser();
  return Response.json(await noteSession(user.id, await readJson(request, sessionSchema)), { status: 201 });
});
