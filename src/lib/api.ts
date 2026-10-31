"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    /** The form field the refusal is about, when the server knows it. */
    public readonly field?: string,
  ) {
    super(message);
  }
}

/**
 * Calls the KABAD API and returns the JSON answer, or throws an ApiError carrying the message to show.
 * A FormData body is sent as multipart (file uploads).
 */
export async function api<T = unknown>(path: string, init: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown } = {}): Promise<T> {
  const form = init.body instanceof FormData;
  // The API answers its errors in the language of the page.
  const english = typeof document !== "undefined" && document.documentElement.lang === "en";
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      headers: { "x-kabad-locale": english ? "en" : "fr", ...(init.body === undefined || form ? {} : { "content-type": "application/json" }) },
      body: init.body === undefined ? undefined : form ? (init.body as FormData) : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(english ? "No connection. Check your network and try again." : "Pas de connexion. Vérifiez votre réseau et réessayez.", 0, "offline");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? (english ? "Something went wrong." : "Une erreur est survenue."), res.status, data.code, data.field);
  return data as T;
}
