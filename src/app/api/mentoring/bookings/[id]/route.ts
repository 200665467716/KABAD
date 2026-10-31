import { requireUser, requireVerifiedUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { answerBooking, cancelBooking } from "@/server/mentoring";
import { answerBookingSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** The mentor accepts or declines. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  const input = await readJson(request, answerBookingSchema);
  return Response.json(await answerBooking(user.id, id, input));
});

/** Either member cancels a session that has not started. */
export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  return Response.json(await cancelBooking(user.id, id));
});
