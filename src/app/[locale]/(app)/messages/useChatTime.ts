"use client";

import { useFormatter, useTranslations } from "next-intl";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Time labels of the messaging screens, in the interface language: "10:31", "Hier", "lun.", "5 nov.". */
export function useChatTime() {
  const format = useFormatter();
  const t = useTranslations("messaging.conversation");
  return {
    short(iso: string, now = new Date()) {
      const d = new Date(iso);
      if (sameDay(d, now)) return format.dateTime(d, { hour: "2-digit", minute: "2-digit" });
      if (sameDay(d, new Date(now.getTime() - 86_400_000))) return t("yesterday");
      if (now.getTime() - d.getTime() < 6 * 86_400_000) return format.dateTime(d, { weekday: "short" });
      return format.dateTime(d, { day: "numeric", month: "short" });
    },
    clock: (iso: string) => format.dateTime(new Date(iso), { hour: "2-digit", minute: "2-digit" }),
    day(iso: string, now = new Date()) {
      const d = new Date(iso);
      if (sameDay(d, now)) return t("today");
      if (sameDay(d, new Date(now.getTime() - 86_400_000))) return t("yesterday");
      return format.dateTime(d, { weekday: "long", day: "numeric", month: "long" });
    },
  };
}
