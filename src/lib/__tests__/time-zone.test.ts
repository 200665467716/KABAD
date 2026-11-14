import { describe, expect, it } from "vitest";
import { dayKey, daysApart } from "../time-zone";

describe("jours comptés dans un fuseau", () => {
  // 23 h 30 à Lomé (GMT) le 13 novembre, c'est déjà le 14 à Cotonou (GMT+1).
  const lateEvening = new Date("2026-11-13T23:30:00Z");
  const morning = new Date("2026-11-14T08:00:00Z");

  it("donne le jour du calendrier dans le fuseau demandé", () => {
    expect(dayKey(lateEvening, "Africa/Lome")).toBe("2026-11-13");
    expect(dayKey(lateEvening, "Africa/Porto-Novo")).toBe("2026-11-14");
  });

  it("compte les jours d'écart dans ce fuseau, pas dans celui de la machine", () => {
    expect(daysApart(lateEvening, morning, "Africa/Lome")).toBe(1);
    expect(daysApart(lateEvening, morning, "Africa/Porto-Novo")).toBe(0);
    expect(daysApart(new Date("2026-11-01T12:00:00Z"), morning, "Africa/Lome")).toBe(13);
  });
});
