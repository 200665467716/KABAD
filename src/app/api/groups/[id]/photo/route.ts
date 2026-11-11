import { requireUser, requireVerifiedUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { readLimitedBody, route } from "@/server/http";
import { getGroupPhoto, setGroupPhoto } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { GROUP_PHOTO_MAX_BYTES } from "@/lib/attachments";

type Ctx = { params: Promise<{ id: string }> };

/** The photo of a group, shown to its members only. Its address changes with the photo, so it is cached for long. */
export const GET = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const photo = await getGroupPhoto(user.id, id);
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});

/** The owner sends the new photo: a multipart form with "photo", an image already resized by the browser. */
export const PUT = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`group-edit:${user.id}`, 30, 3600_000, "Tu as modifié des groupes de nombreuses fois. Réessaie dans un moment.");
  // Read with a hard limit, whatever the headers claim.
  const body = await readLimitedBody(request, GROUP_PHOTO_MAX_BYTES + 16 * 1024);
  const form = await new Response(body as BodyInit, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) throw new DomainError("bad_form", "Requête invalide.", 400);
  return Response.json(await setGroupPhoto(user.id, id, new Uint8Array(await file.arrayBuffer())));
});

export const DELETE = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  return Response.json(await setGroupPhoto(user.id, id, null));
});
