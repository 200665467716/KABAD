import { requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { bookSlot } from "@/server/mentoring";
import { bookingSchema } from "@/lib/schemas";

/** A member books a free slot of a mentor. */
export const POST = route(async (request: Request) => {
  const user = await requireVerifiedUser();
  const input = await readJson(request, bookingSchema);
  return Response.json(await bookSlot(user.id, input), { status: 201 });
});
