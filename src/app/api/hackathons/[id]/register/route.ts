import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { register } from "@/server/hackathons";
import { registerSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Enters alone, creates a team, or asks to join one. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, registerSchema);
  return Response.json(await register(user.id, id, input));
});
