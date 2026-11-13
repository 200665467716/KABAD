import { describe, expect, it } from "vitest";
import { googleCalendarUrl, icsText, outlookCalendarUrl } from "../calendar";

const session = { id: "seance-momo", title: "Mentorat avec Awa Diop", description: "Interconnecter des API", startsAt: "2026-11-12T15:00:00.000Z", minutes: 30, url: "https://meet.google.com/kbd-awad-dem" };

describe("ajouter à son agenda", () => {
  it("ouvre Google Agenda avec le titre, l'heure de début et de fin, et le lien Meet", () => {
    const url = new URL(googleCalendarUrl(session));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Mentorat avec Awa Diop");
    expect(url.searchParams.get("dates")).toBe("20261112T150000Z/20261112T153000Z");
    expect(url.searchParams.get("location")).toBe("https://meet.google.com/kbd-awad-dem");
    expect(url.searchParams.get("details")).toContain("https://meet.google.com/kbd-awad-dem");
  });

  it("ouvre Outlook avec les mêmes heures", () => {
    const url = new URL(outlookCalendarUrl(session));
    expect(url.searchParams.get("startdt")).toBe("2026-11-12T15:00:00.000Z");
    expect(url.searchParams.get("enddt")).toBe("2026-11-12T15:30:00.000Z");
  });

  it("écrit un fichier .ics valable pour les autres agendas", () => {
    const ics = icsText({ ...session, description: "API ; webhooks, tests" }, new Date("2026-11-11T10:00:00Z"));
    expect(ics).toContain("DTSTART:20261112T150000Z");
    expect(ics).toContain("DTEND:20261112T153000Z");
    expect(ics).toContain(String.raw`DESCRIPTION:API \; webhooks\, tests`);
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
