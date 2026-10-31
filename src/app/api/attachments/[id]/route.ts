import { requireUser } from "@/server/auth";
import { route } from "@/server/http";
import { getAttachment } from "@/server/messaging";

type Ctx = { params: Promise<{ id: string }> };

/** Images and voice notes are shown in the conversation; a PDF is downloaded. Nothing here can run as a page. */
export const GET = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id } = await params;
  const file = await getAttachment(user.id, id);
  const inline = file.mime.startsWith("image/") || file.mime.startsWith("audio/");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
