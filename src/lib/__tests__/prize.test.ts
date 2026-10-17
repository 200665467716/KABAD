import { describe, expect, it } from "vitest";
import { splitPrize } from "../prize";

describe("splitPrize", () => {
  it("splits 60 / 30 / 10", () => {
    expect(splitPrize(250_000)).toEqual({ winner: 150_000, mentor: 75_000, platform: 25_000 });
    expect(splitPrize(30_000)).toEqual({ winner: 18_000, mentor: 9_000, platform: 3_000 });
  });

  it("never creates or loses money when rounding", () => {
    for (const total of [1, 7, 99, 101, 12_345, 999_999]) {
      const s = splitPrize(total);
      expect(s.winner + s.mentor + s.platform).toBe(total);
      expect(s.platform).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives any rounding remainder to KABAD, never to less than the winner's share", () => {
    expect(splitPrize(7)).toEqual({ winner: 4, mentor: 2, platform: 1 });
  });

  it("rejects amounts that are not whole positive F CFA", () => {
    expect(() => splitPrize(-1)).toThrow(RangeError);
    expect(() => splitPrize(10.5)).toThrow(RangeError);
  });
});
