import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { ZodError, type ZodType } from "zod";
import { zodFallbackError } from "@/lib/schemas";
import { DomainError } from "./errors";
import { requestLocale, translateError } from "./error-language";

/** Rejects state-changing requests sent from another site. Cookies are SameSite=Lax; this closes the remaining gap. */
export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new DomainError("bad_origin", "Requête refusée : origine inconnue.", 403);
  }
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("bad_json", "Requête invalide.", 400);
  }
  // Le message de repli est passé ici aussi : il ne dépend pas de l'ordre de chargement de z.config.
  return schema.parse(body, { error: zodFallbackError });
}

/**
 * Wraps a route handler: domain refusals and validation errors become clear JSON answers.
 * `sameOrigin: false` is for server-to-server calls (webhooks), which authenticate otherwise.
 */
export function route<A extends unknown[]>(handler: (request: Request, ...rest: A) => Promise<Response>, opts: { sameOrigin?: boolean } = {}) {
  return async (request: Request, ...rest: A): Promise<Response> => {
    // API answers depend on the session: never prerender them.
    await connection();
    try {
      if (opts.sameOrigin !== false) assertSameOrigin(request);
      return await handler(request, ...rest);
    } catch (e) {
      unstable_rethrow(e);
      // In the language of the page that called (English under /en).
      const say = (message: string) => translateError(message, requestLocale(request));
      if (e instanceof DomainError) return Response.json({ error: say(e.message), code: e.code, field: e.field, details: e.details }, { status: e.status });
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return Response.json({ error: say(first?.message ?? "Données invalides."), code: "invalid", field: first?.path.join(".") }, { status: 400 });
      }
      console.error(e);
      return Response.json({ error: say("Une erreur est survenue. Réessaie dans un instant."), code: "internal" }, { status: 500 });
    }
  };
}

/**
 * The visitor's IP as seen by our own reverse proxy. Each trusted proxy appends the address it received
 * the request from, so the real client is TRUSTED_PROXY_HOPS entries from the end of X-Forwarded-For;
 * the entries before it are written by the client and cannot be trusted.
 */
export function clientIp(request: Request): string {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);
  const list = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (hops > 0 ? list[list.length - hops] : undefined) ?? request.headers.get("x-real-ip") ?? "inconnue";
}

/** Reads at most `max` bytes of the body, whatever Content-Length says: a chunked upload cannot exhaust memory. */
export async function readLimitedBody(request: Request, max: number): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > max) throw new DomainError("too_big", "L’envoi est trop lourd.", 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new DomainError("too_big", "L’envoi est trop lourd.", 413);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
