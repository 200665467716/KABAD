import { describe, expect, it } from "vitest";
import { isMeetLink, normalizeMeetLink, sessionBucket } from "../mentoring";
import { riseEventSchema, riseRoomSchema } from "../schemas";

describe("lien Google Meet du mentor", () => {
  it("accepte un lien meet.google.com, avec ou sans https://", () => {
    expect(isMeetLink("https://meet.google.com/abc-defg-hij")).toBe(true);
    expect(normalizeMeetLink("  meet.google.com/abc-defg-hij ")).toBe("https://meet.google.com/abc-defg-hij");
    expect(isMeetLink(normalizeMeetLink("meet.google.com/abc-defg-hij"))).toBe(true);
  });

  it("refuse les autres services, http et un lien sans salle", () => {
    for (const link of ["https://meet.jit.si/kabad-x", "http://meet.google.com/abc-defg-hij", "https://meet.google.com/", "https://meet.google.com.exemple.org/abc", "abc", ""]) {
      expect(isMeetLink(link)).toBe(false);
    }
  });
});

describe("historique des séances", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const at = (status: string, iso: string) => sessionBucket({ status, startsAt: iso, minutes: 30 }, now);

  it("range chaque séance : à venir, passée, ou close sans avoir eu lieu", () => {
    expect(at("PENDING", "2026-11-12T15:00:00Z")).toBe("upcoming");
    expect(at("ACCEPTED", "2026-11-12T15:00:00Z")).toBe("upcoming");
    expect(at("ACCEPTED", "2026-11-10T11:45:00Z")).toBe("upcoming"); // en cours
    expect(at("ACCEPTED", "2026-11-05T15:00:00Z")).toBe("past");
    expect(at("DECLINED", "2026-11-12T15:00:00Z")).toBe("closed");
    expect(at("CANCELLED", "2026-11-05T15:00:00Z")).toBe("closed");
    expect(at("PENDING", "2026-11-05T15:00:00Z")).toBe("closed"); // restée sans réponse
  });
});


describe("lien Google Meet d’un événement ou d’un salon Rise-Up", () => {
  const room = { meetingUrl: "meet.google.com/abc-defg-hij" };

  it("est obligatoire et complété avec https://", () => {
    expect(riseRoomSchema.parse(room).meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    expect(riseRoomSchema.safeParse({ meetingUrl: "" }).success).toBe(false);
  });

  it("refuse Jitsi et les autres services", () => {
    expect(riseRoomSchema.safeParse({ meetingUrl: "https://meet.jit.si/kabad" }).success).toBe(false);
    expect(riseEventSchema.safeParse({ title: "Point", agenda: "Avancement", startsAt: "2026-12-01T10:00:00Z", minutes: 30, meetingUrl: "https://zoom.us/j/1" }).success).toBe(false);
  });
});
