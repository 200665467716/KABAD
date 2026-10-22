/**
 * Where to go after signing in. Only a path on this site is accepted:
 * "//evil.com", "/\evil.com" or control characters would leave the site once resolved.
 */
export function safeNext(raw: unknown, fallback = "/accueil"): string {
  if (typeof raw !== "string" || !/^\/(?![/\\])/.test(raw) || /[\u0000-\u001f\\]/.test(raw)) return fallback;
  const base = "https://kabad.invalid";
  const u = new URL(raw, base);
  return u.origin === base ? u.pathname + u.search + u.hash : fallback;
}
