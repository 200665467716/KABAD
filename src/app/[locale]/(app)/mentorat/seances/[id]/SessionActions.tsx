"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Display";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";

type CalendarEvent = { startsAt: string; minutes: number; title: string; description: string; url: string | null };

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** A one-event .ics file, built in the browser: no calendar account needed. */
function downloadIcs(id: string, e: CalendarEvent) {
  const start = new Date(e.startsAt);
  const end = new Date(start.getTime() + e.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KABAD//Mentorat//FR",
    "BEGIN:VEVENT",
    `UID:${id}@kabad.app`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    `DESCRIPTION:${escape(e.description)}`,
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${escape(e.url)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "kabad-mentorat.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function SessionActions({ id, cancellable, calendar }: { id: string; cancellable: boolean; calendar: CalendarEvent | null }) {
  const t = useTranslations("mentoring");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm(t("session.cancelConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/mentoring/bookings/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {calendar && (
        <Button variant="secondary" block icon="clock" onClick={() => downloadIcs(id, calendar)}>
          {t("session.calendar")}
        </Button>
      )}
      {cancellable && (
        <Button variant="ghost" block onClick={cancel} disabled={busy}>
          {t("session.cancel")}
        </Button>
      )}
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
    </>
  );
}
