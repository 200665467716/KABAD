"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useDeviceTimeZone } from "@/lib/device-time-zone";
import { daysApart } from "@/lib/time-zone";

/** Time labels of the messaging screens, in the interface language and the device's time: "10:31", "Hier", "lun.", "5 nov.". */
export function useChatTime() {
  const format = useFormatter();
  const t = useTranslations("messaging.conversation");
  // The device's clock: a message sent at 4:37 in Cotonou reads 4:37 there, not 3:37 (Lomé time).
  // Days are counted in that same zone, so the server and the phone agree while the page hydrates.
  const timeZone = useDeviceTimeZone();
  const ago = (d: Date, now: Date) => daysApart(d, now, timeZone);
  return {
    short(iso: string, now = new Date()) {
      const d = new Date(iso);
      if (ago(d, now) === 0) return format.dateTime(d, { hour: "2-digit", minute: "2-digit", timeZone });
      if (ago(d, now) === 1) return t("yesterday");
      if (ago(d, now) < 6) return format.dateTime(d, { weekday: "short", timeZone });
      return format.dateTime(d, { day: "numeric", month: "short", timeZone });
    },
    clock: (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit", timeZone }),
    day(iso: string, now = new Date()) {
      const d = new Date(iso);
      if (ago(d, now) === 0) return t("today");
      if (ago(d, now) === 1) return t("yesterday");
      return format.dateTime(d, { weekday: "long", day: "numeric", month: "long", timeZone });
    },
  };
}
