import { requireUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { readLimitedBody, route } from "@/server/http";
import { setProfilePhoto } from "@/server/members";
import { rateLimit } from "@/server/rate-limit";
import { GROUP_PHOTO_MAX_BYTES } from "@/lib/attachments";

/** The member sends their new photo: a multipart form with "photo", an image already resized by the browser. */
export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  await rateLimit(`profile-photo:${user.id}`, 20, 3600_000, "Tu as changé de photo de nombreuses fois. Réessaie dans un moment.");
  // Read with a hard limit, whatever the headers claim.
  const body = await readLimitedBody(request, GROUP_PHOTO_MAX_BYTES + 16 * 1024);
  const form = await new Response(body as BodyInit, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) throw new DomainError("bad_form", "Requête invalide.", 400);
  return Response.json(await setProfilePhoto(user.id, new Uint8Array(await file.arrayBuffer())));
});

export const DELETE = route(async () => {
  const user = await requireUser();
  return Response.json(await setProfilePhoto(user.id, null));
});
