import { requireUser } from "@/server/auth";
import { getScreenshot } from "@/server/community-tests";
import { route } from "@/server/http";

type Ctx = { params: Promise<{ id: string; n: string }> };

const EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** A capture of a test report, for its tester and the app's author. `?telecharger=1` saves it as a file. */
export const GET = route(async (request: Request, { params }: Ctx) => {
  const user = await requireUser();
  const { id, n } = await params;
  const position = Number.parseInt(n, 10) || 0;
  const shot = await getScreenshot(user.id, id, position);
  const download = new URL(request.url).searchParams.get("telecharger") === "1";
  return new Response(new Uint8Array(shot.data), {
    headers: {
      "Content-Type": shot.mime,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      ...(download ? { "Content-Disposition": `attachment; filename="capture-etape-${position + 1}.${EXTENSIONS[shot.mime] ?? "img"}"` } : {}),
    },
  });
});
