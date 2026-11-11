import { describe, expect, it } from "vitest";
import { isMeetLink, normalizeMeetLink } from "../mentoring";

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
