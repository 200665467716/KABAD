import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { reviewBadge } from "@/server/badges";
import { reviewBadgeSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The KABAD team grants or refuses the badge. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, reviewBadgeSchema);
  return Response.json(await reviewBadge(user.id, id, input));
});
