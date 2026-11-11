import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getProfilePhoto } from "@/server/members";

type Ctx = { params: Promise<{ id: string }> };

/** The profile photo of a member, for signed-in members. Its address changes with the photo, so it is cached for long. */
export const GET = route(async (_request: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const photo = await getProfilePhoto(id);
  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
