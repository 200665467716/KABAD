import { describe, expect, it } from "vitest";
import { formatDuration, formatFCFA, initials } from "../format";
import { charactersLeft, checkInvitationMessage, INVITATION_MAX_LENGTH } from "../invitation";
import { averageMark, totalScore } from "../jury";

const NBSP = " ";

describe("format", () => {
  it("writes F CFA amounts the French way, with non-breaking spaces", () => {
    expect(formatFCFA(250000)).toBe(`250${NBSP}000${NBSP}F${NBSP}CFA`);
    expect(formatFCFA(500)).toBe(`500${NBSP}F${NBSP}CFA`);
  });

  it("writes durations as hours and minutes", () => {
    expect(formatDuration(270)).toBe(`4${NBSP}h${NBSP}30`);
    expect(formatDuration(60)).toBe(`1${NBSP}h`);
    expect(formatDuration(45)).toBe(`45${NBSP}min`);
    expect(formatDuration(65)).toBe(`1${NBSP}h${NBSP}05`);
  });

  it("builds initials, including from African letters", () => {
    expect(initials("Awa Diop")).toBe("AD");
    expect(initials("ɔdɔ ɗan")).toBe("ƆƊ");
  });
});

describe("invitation message", () => {
  it("accepts no message at all: the message is optional", () => {
    expect(checkInvitationMessage("   ")).toEqual({ ok: true, message: "" });
  });

  it("accepts up to 300 characters, counted as the reader sees them", () => {
    expect(checkInvitationMessage("ɛ".repeat(INVITATION_MAX_LENGTH)).ok).toBe(true);
    expect(checkInvitationMessage("ɛ".repeat(INVITATION_MAX_LENGTH + 1)).ok).toBe(false);
    expect(charactersLeft("Akpe")).toBe(296);
  });
});

describe("jury", () => {
  it("adds four criteria scored from 1 to 5", () => {
    expect(totalScore({ works: 5, code: 4, tests: 3, explain: 4 })).toBe(16);
    expect(() => totalScore({ works: 6, code: 4, tests: 3, explain: 4 })).toThrow(RangeError);
  });

  it("averages the three jurors to one decimal", () => {
    expect(averageMark([17, 18, 17])).toBe(17.3);
    expect(averageMark([])).toBe(0);
  });
});
