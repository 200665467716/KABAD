import { requireUser, requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { myBadgeRequest, requestBadge } from "@/server/badges";
import { badgeRequestSchema } from "@/lib/schemas";

export const GET = route(async (_request: Request) => {
  const user = await requireUser();
  return Response.json(await myBadgeRequest(user.id));
});

/** Sends the mentor badge request, or updates the one under review. */
export const POST = route(async (request: Request) => {
  const user = await requireVerifiedUser();
  const input = await readJson(request, badgeRequestSchema);
  return Response.json(await requestBadge(user.id, input), { status: 201 });
});
