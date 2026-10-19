import { requireUser } from "@/server/auth";
import { getScreenshot } from "@/server/community-tests";
import { route } from "@/server/http";

type Ctx = { params: Promise<{ id: string; n: string }> };

export const GET = route(async (_request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, n } = await params;
  const shot = await getScreenshot(user.id, id, Number.parseInt(n, 10) || 0);
  return new Response(new Uint8Array(shot.data), {
    headers: { "Content-Type": shot.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" },
  });
});
