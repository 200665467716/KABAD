"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TIME_ZONE } from "./time-zone";

/*
 * Le fuseau de l'appareil (« Africa/Porto-Novo »). Les heures de ce qui vient d'arriver (messages,
 * notifications) suivent l'horloge du téléphone, comme dans toutes les messageries. Le serveur ne la
 * connaît pas : il rend la page à l'heure de Lomé, puis l'appareil remet ses heures juste après l'hydratation.
 */

/** The device's time zone, or undefined when the browser does not give one. */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

const noop = () => () => {};
const onDevice = () => deviceTimeZone() ?? DEFAULT_TIME_ZONE;
const onServer = () => DEFAULT_TIME_ZONE;

/** The device's time zone in a client component; Lomé's while the server-rendered HTML is hydrated. */
export function useDeviceTimeZone(): string {
  return useSyncExternalStore(noop, onDevice, onServer);
}
