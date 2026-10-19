import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DomainError } from "./errors";

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
  return schema.parse(body);
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
      if (e instanceof DomainError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return Response.json({ error: first?.message ?? "Données invalides.", code: "invalid", field: first?.path.join(".") }, { status: 400 });
      }
      console.error(e);
      return Response.json({ error: "Une erreur est survenue. Réessayez dans un instant.", code: "internal" }, { status: 500 });
    }
  };
}

export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
