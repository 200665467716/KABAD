import { requireUser } from "@/server/auth";
import { readJson, route } from "@/server/http";
import { getAvailability, saveAvailability } from "@/server/mentoring";
import { availabilitySchema } from "@/lib/schemas";

export const GET = route(async (_request: Request) => {
  const user = await requireUser();
  return Response.json(await getAvailability(user.id));
});

/** Weekly ranges, days off, time zone and video link of a mentor. */
export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  const input = await readJson(request, availabilitySchema);
  return Response.json(await saveAvailability(user.id, input));
});
