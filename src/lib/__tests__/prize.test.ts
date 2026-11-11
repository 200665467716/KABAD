import { describe, expect, it } from "vitest";
import { MAX_PRIZES, prizeFor } from "../prize";

describe("prix d’un hackathon (D12)", () => {
  const prizes = ["Un ordinateur portable", "Un an d’hébergement", "Des livres"];

  it("donne les prix dans l’ordre du classement", () => {
    expect(prizeFor(prizes, 1)).toBe("Un ordinateur portable");
    expect(prizeFor(prizes, 2)).toBe("Un an d’hébergement");
    expect(prizeFor(prizes, 3)).toBe("Des livres");
  });

  it("ne donne rien au-delà des prix annoncés", () => {
    expect(prizeFor(prizes, 4)).toBeNull();
    expect(prizeFor([], 1)).toBeNull();
  });

  it("refuse une place qui n’existe pas", () => {
    expect(prizeFor(prizes, 0)).toBeNull();
    expect(prizeFor(prizes, 1.5)).toBeNull();
    expect(prizeFor(["a", "b", "c", "d", "e", "f"], MAX_PRIZES + 1)).toBeNull();
  });
});
