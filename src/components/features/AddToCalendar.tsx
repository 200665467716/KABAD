"use client";

import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { googleCalendarUrl, icsText, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar";

/**
 * P10: « Ajouter à Google Agenda » opens the calendar with the event filled in, in a new tab.
 * Outlook and a .ics file stay one tap away, for the other calendars.
 */
export function AddToCalendar({ event }: { event: CalendarEvent }) {
  const t = useTranslations("common.calendar");

  function download() {
    const url = URL.createObjectURL(new Blob([icsText(event)], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kabad.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-1.5">
      {/* A plain <a>: Google Agenda lives outside KABAD. */}
      <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className={buttonClass({ variant: "secondary", block: true, className: "no-underline" })}>
        <Icon name="calendar" size={20} />
        {t("google")}
      </a>
      <p className="flex flex-wrap items-center justify-center gap-x-3 text-[13px] text-muted">
        {t("other")}
        <a href={outlookCalendarUrl(event)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-extrabold text-brand-text">
          Outlook
        </a>
        <button type="button" onClick={download} className="inline-flex min-h-11 items-center font-extrabold text-brand-text">
          {t("ics")}
        </button>
      </p>
    </div>
  );
}
