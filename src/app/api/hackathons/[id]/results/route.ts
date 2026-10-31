import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { publishResults } from "@/server/hackathons";

type Ctx = { params: Promise<{ id: string }> };

/** Publishes the ranking and prepares the transfers. */
export const POST = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await publishResults(user.id, id));
});
