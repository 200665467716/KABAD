import { describe, expect, it } from "vitest";
import { heldMinutes, jitsiRoom, mentoringEligibility } from "../mentoring";

const now = new Date("2026-11-10T12:00:00Z");
const b = (status: string, iso: string, minutes = 30) => ({ status, startsAt: new Date(iso), minutes });

describe("held mentoring time", () => {
  it("counts accepted sessions that are over, and nothing else", () => {
    const list = [
      b("ACCEPTED", "2026-11-05T15:00:00Z"),
      b("ACCEPTED", "2026-11-10T11:30:00Z"),
      b("ACCEPTED", "2026-11-10T11:45:00Z"), // still running
      b("PENDING", "2026-11-04T15:00:00Z"),
      b("DECLINED", "2026-11-03T15:00:00Z"),
      b("ACCEPTED", "2026-11-12T15:00:00Z"), // to come
    ];
    expect(heldMinutes(list, now)).toBe(60);
  });
});

describe("hackathon eligibility", () => {
  it("compares held time with what the hackathon requires", () => {
    expect(mentoringEligibility(90, 120)).toEqual({ eligible: false, held: 90, required: 120, missing: 30, progress: 0.75 });
    expect(mentoringEligibility(150, 120).eligible).toBe(true);
    expect(mentoringEligibility(0, 0)).toEqual({ eligible: true, held: 0, required: 0, missing: 0, progress: 1 });
  });

  it("creates unguessable video rooms", () => {
    const a = jitsiRoom();
    expect(a).toMatch(/^https:\/\/meet\.jit\.si\/kabad-[\w-]{12}$/);
    expect(jitsiRoom()).not.toBe(a);
  });
});
