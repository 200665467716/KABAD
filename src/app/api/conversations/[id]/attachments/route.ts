import { requireVerifiedUser } from "@/server/auth";
import { DomainError } from "@/server/errors";
import { readLimitedBody, route } from "@/server/http";
import { sendAttachment } from "@/server/messaging";
import { rateLimit } from "@/server/rate-limit";
import { ATTACHMENT_MAX_BYTES } from "@/lib/attachments";

type Ctx = { params: Promise<{ id: string }> };

/** Multipart form: "file", "kind" (FILE or VOICE), and optionally "seconds", "caption", "clientId", "replyToId". */
export const POST = route(async (request: Request, { params }: Ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await params;
  await rateLimit(`attachment:${user.id}`, 30, 3600_000, "Tu envoies beaucoup de fichiers : réessaie dans un moment.");
  // Read with a hard limit, whatever the headers claim.
  const body = await readLimitedBody(request, ATTACHMENT_MAX_BYTES + 64 * 1024);
  const form = await new Response(body as BodyInit, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) throw new DomainError("bad_form", "Requête invalide.", 400);
  const kind = form.get("kind") === "VOICE" ? "VOICE" : "FILE";
  const seconds = Number(form.get("seconds") ?? 0) || undefined;
  const caption = String(form.get("caption") ?? "").trim() || undefined;
  const clientId = String(form.get("clientId") ?? "").slice(0, 64) || undefined;
  const replyToId = String(form.get("replyToId") ?? "").slice(0, 64) || undefined;
  const data = new Uint8Array(await file.arrayBuffer());
  return Response.json(await sendAttachment(user.id, id, { kind, name: file.name, data, seconds, caption, clientId, replyToId }), { status: 201 });
});
