"use client";

/**
 * A full page load instead of a client-side navigation: used when the signed-in member changes
 * (sign-in, sign-out, account deleted), so nothing from the previous member stays in memory.
 */
export function hardNavigate(path: string) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full reload is the point here
  window.location.assign(path);
}
