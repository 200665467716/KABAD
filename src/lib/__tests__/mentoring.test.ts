import { describe, expect, it } from "vitest";
import { cashChallengeEligibility, confirmedMinutes, isSessionCounted, REQUIRED_MENTORING_MINUTES } from "../mentoring";

const s = (minutes: number, mentor = true, mentee = true) => ({ minutes, confirmedByMentor: mentor, confirmedByMentee: mentee });

describe("mentoring sessions", () => {
  it("counts a session only when both members confirmed it", () => {
    expect(isSessionCounted(s(90))).toBe(true);
    expect(isSessionCounted(s(90, true, false))).toBe(false);
    expect(isSessionCounted(s(90, false, true))).toBe(false);
    expect(isSessionCounted(s(0))).toBe(false);
  });

  it("adds up confirmed minutes only", () => {
    expect(confirmedMinutes([s(90), s(75), s(105), s(90, true, false)])).toBe(270);
  });
});

describe("cash challenge eligibility", () => {
  it("requires 6 hours by default", () => {
    expect(REQUIRED_MENTORING_MINUTES).toBe(360);
  });

  it("reports what is missing", () => {
    expect(cashChallengeEligibility([s(90), s(75), s(105), s(90, true, false)])).toEqual({ eligible: false, confirmed: 270, missing: 90, progress: 0.75 });
  });

  it("becomes eligible once the last session is confirmed", () => {
    const e = cashChallengeEligibility([s(90), s(75), s(105), s(90)]);
    expect(e.eligible).toBe(true);
    expect(e.missing).toBe(0);
    expect(e.progress).toBe(1);
  });
});
