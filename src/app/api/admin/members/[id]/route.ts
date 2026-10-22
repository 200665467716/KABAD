import { rejectSenior, reinstateMember, suspendMember } from "@/server/admin";
import { requireUser } from "@/server/auth";
import { verifySenior } from "@/server/challenges";
import { readJson, route } from "@/server/http";
import { adminMemberSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, adminMemberSchema);
  switch (input.action) {
    case "verify":
      return Response.json(await verifySenior(user.id, id));
    case "reject":
      return Response.json(await rejectSenior(user.id, id, input.reason));
    case "suspend":
      return Response.json(await suspendMember(user.id, id, input.reason));
    case "reinstate":
      return Response.json(await reinstateMember(user.id, id));
  }
});
