"use client";

import { Button } from "@/components/ui/Button";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Downloads an .ics file: the event goes into any calendar app, with its video link. */
export function CalendarButton({ title, description, url, startsAt, minutes, label }: { title: string; description: string; url: string; startsAt: string; minutes: number; label: string }) {
  function download() {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + minutes * 60_000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//KABAD//Africa Rise-Up//FR",
      "BEGIN:VEVENT",
      `UID:${stamp(start)}-${encodeURIComponent(title).slice(0, 40)}@kabad.app`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escape(title)}`,
      `DESCRIPTION:${escape(`${description}\n${url}`)}`,
      `URL:${url}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    link.download = "kabad-evenement.ics";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <Button variant="secondary" block icon="clock" onClick={download}>
      {label}
    </Button>
  );
}
