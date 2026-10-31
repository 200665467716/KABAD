import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { addPost } from "@/server/rise";
import { risePostSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** A post, or a reply to a post, in the project's feed. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, risePostSchema);
  return Response.json(await addPost(user.id, id, input), { status: 201 });
});
