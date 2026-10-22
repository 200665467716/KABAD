"use client";

/**
 * A full page load instead of a client-side navigation: used when the signed-in member changes
 * (sign-in, sign-out, account deleted), so nothing from the previous member stays in memory.
 */
export function hardNavigate(path: string) {
  window.location.assign(path);
}
