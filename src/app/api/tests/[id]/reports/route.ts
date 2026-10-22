import { requireVerifiedUser } from "@/server/auth";
import { SCREENSHOT_MAX_BYTES, submitReport } from "@/server/community-tests";
import { DomainError } from "@/server/errors";
import { readLimitedBody, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { testReportSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

/** Multipart form: "report" (JSON) and one "shot" file per scenario step, in order. */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`test-report:${user.id}`, 20, 24 * 3600_000, "Vous avez envoyé beaucoup de rapports aujourd’hui.");
  // Read with a hard limit, whatever the headers claim: one screenshot of 2 MB at most per step (5 steps).
  const body = await readLimitedBody(request, 5 * SCREENSHOT_MAX_BYTES + 64 * 1024);
  const form = await new Response(body as BodyInit, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  if (!form) throw new DomainError("bad_form", "Requête invalide.", 400);
  if (form.getAll("shot").length > 5) throw new DomainError("too_many", "5 captures au plus.", 400);
  let report: unknown;
  try {
    report = JSON.parse(String(form.get("report") ?? "{}"));
  } catch {
    throw new DomainError("bad_json", "Requête invalide.", 400);
  }
  const input = testReportSchema.parse(report);
  const files = form.getAll("shot").filter((f): f is File => f instanceof File);
  const shots = await Promise.all(files.map(async (f) => ({ mime: f.type, data: new Uint8Array(await f.arrayBuffer()) })));
  return Response.json(await submitReport(user.id, id, input, shots), { status: 201 });
});
