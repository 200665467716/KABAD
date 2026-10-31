import { reinstateMember, revokeBadge, suspendMember } from "@/server/admin";
import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { adminMemberSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await readJson(request, adminMemberSchema);
  switch (input.action) {
    case "revoke":
      return Response.json(await revokeBadge(user.id, id, input.reason));
    case "suspend":
      return Response.json(await suspendMember(user.id, id, input.reason));
    case "reinstate":
      return Response.json(await reinstateMember(user.id, id));
  }
});
