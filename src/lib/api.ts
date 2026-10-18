"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

/** Calls the KABAD API and returns the JSON answer, or throws an ApiError carrying the message to show. */
export async function api<T = unknown>(path: string, init: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("Pas de connexion. Vérifiez votre réseau et réessayez.", 0, "offline");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Une erreur est survenue.", res.status, data.code);
  return data as T;
}
