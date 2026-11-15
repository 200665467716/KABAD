/*
 * Ajouter une séance ou un événement à son agenda (P10) : un lien qui ouvre Google Agenda ou Outlook
 * avec l'événement déjà rempli, sans compte KABAD ni téléchargement. Le fichier .ics reste pour les
 * autres agendas (Apple, Thunderbird…).
 */

export type CalendarEvent = { id: string; title: string; description: string; startsAt: string; minutes: number; url: string | null };

const end = (e: CalendarEvent) => new Date(new Date(e.startsAt).getTime() + e.minutes * 60_000);
/** "20261112T150000Z": the UTC form both Google and the .ics format read. */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const details = (e: CalendarEvent) => (e.url ? `${e.description}\n\n${e.url}` : e.description);

/** Opens Google Agenda's "new event" page, filled in. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(new Date(e.startsAt))}/${stamp(end(e))}`, details: details(e) });
  if (e.url) q.set("location", e.url);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Opens Outlook on the web with the event filled in. */
export function outlookCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: e.title, startdt: new Date(e.startsAt).toISOString(), enddt: end(e).toISOString(), body: details(e) });
  if (e.url) q.set("location", e.url);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** A one-event .ics file, for any other calendar. */
export function icsText(e: CalendarEvent, now = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KABAD//FR",
    "BEGIN:VEVENT",
    `UID:${e.id}@kabad.app`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(new Date(e.startsAt))}`,
    `DTEND:${stamp(end(e))}`,
    `SUMMARY:${escape(e.title)}`,
    `DESCRIPTION:${escape(details(e))}`,
    ...(e.url ? [`URL:${e.url}`, `LOCATION:${escape(e.url)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
