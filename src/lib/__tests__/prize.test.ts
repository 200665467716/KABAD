import { describe, expect, it } from "vitest";
import { splitPrize } from "../prize";

describe("splitPrize (D6)", () => {
  it("donne 90 % à l'équipe gagnante et 10 % à KABAD, dont la moitié en réserve", () => {
    expect(splitPrize(250_000)).toEqual({ winner: 225_000, platform: 25_000, reserve: 12_500 });
  });

  it("ne perd ni ne crée un franc à l'arrondi", () => {
    for (const total of [0, 1, 7, 99, 1_001, 333_333]) {
      const s = splitPrize(total);
      expect(s.winner + s.platform).toBe(total);
    }
    expect(splitPrize(7)).toEqual({ winner: 6, platform: 1, reserve: 0 });
  });

  it("refuse un montant négatif ou décimal", () => {
    expect(() => splitPrize(-1)).toThrow(RangeError);
    expect(() => splitPrize(10.5)).toThrow(RangeError);
  });
});
