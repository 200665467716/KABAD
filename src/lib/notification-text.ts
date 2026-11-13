/**
 * Notifications are stored with a key and values; each screen writes them in the reader's language.
 * "at" is an ISO date shown in the time zone "tz" (the reader's, chosen by the server).
 */
import type fr from "../../messages/fr/notifications.json";
import { formatSlot } from "./time";

export type NotificationKey = keyof (typeof fr)["notifications"]["kinds"];
export type NotificationParams = Record<string, string | number>;

/** Turns the stored values into what the message shows: the date "at" becomes "jeu. 5 nov. à 15 h 00" or "Thu, Nov 5, 3:00 PM". */
export function messageValues(params: NotificationParams | null | undefined, locale: string): Record<string, string | number> {
  const { at, tz, ...rest } = params ?? {};
  return at ? { ...rest, at: formatSlot(new Date(String(at)), tz ? String(tz) : undefined, locale.startsWith("fr") ? "fr-FR" : "en-US") } : rest;
}
