import { describe, expect, it } from "vitest";
import { splitPrize } from "../prize";

describe("splitPrize (D6)", () => {
  it("level 3, with a mentor: 60 / 30 / 10", () => {
    expect(splitPrize(250_000)).toEqual({ winner: 150_000, mentor: 75_000, platform: 25_000, reserve: 12_500 });
  });

  it("level 2, without a mentor: 90 / 10", () => {
    expect(splitPrize(250_000, false)).toEqual({ winner: 225_000, mentor: 0, platform: 25_000, reserve: 12_500 });
  });

  it("never creates or loses a franc", () => {
    for (const total of [0, 1, 7, 99, 30_001, 1_234_567]) {
      for (const withMentor of [true, false]) {
        const s = splitPrize(total, withMentor);
        expect(s.winner + s.mentor + s.platform).toBe(total);
      }
    }
    expect(splitPrize(7)).toEqual({ winner: 4, mentor: 2, platform: 1, reserve: 0 });
  });

  it("refuses amounts that are not whole F CFA", () => {
    expect(() => splitPrize(-1)).toThrow(RangeError);
    expect(() => splitPrize(10.5)).toThrow(RangeError);
  });
});
