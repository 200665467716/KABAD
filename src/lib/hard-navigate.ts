"use client";

/**
 * A full page load instead of a client-side navigation: used when the signed-in member changes
 * (sign-in, sign-out, account deleted), so nothing from the previous member stays in memory.
 * `path` is written without the language ("/accueil"): the English prefix is added back when needed.
 */
export function hardNavigate(path: string) {
  const english = /^\/en(\/|$)/.test(window.location.pathname);
  const local = path.startsWith("/") && !path.startsWith("/api/") && !/^\/en(\/|$|\?)/.test(path);
  window.location.assign(english && local ? `/en${path === "/" ? "" : path}` : path);
}
