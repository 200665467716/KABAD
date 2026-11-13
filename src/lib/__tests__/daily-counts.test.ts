import { describe, expect, it } from "vitest";
import { dailyCounts, weekOverWeek } from "../daily-counts";

const now = new Date("2026-11-13T15:00:00Z");

describe("activité jour par jour du tableau de bord", () => {
  it("donne chaque jour, du plus ancien à aujourd'hui, avec 0 pour un jour sans activité", () => {
    const series = dailyCounts([{ day: new Date("2026-11-13T00:00:00Z"), count: BigInt(4) }, { day: "2026-11-11", count: 2 }], 4, now);
    expect(series).toEqual([
      { day: "2026-11-10", count: 0 },
      { day: "2026-11-11", count: 2 },
      { day: "2026-11-12", count: 0 },
      { day: "2026-11-13", count: 4 },
    ]);
  });

  it("ignore un jour hors de la période", () => {
    expect(dailyCounts([{ day: "2026-10-01", count: 9 }], 2, now)).toEqual([
      { day: "2026-11-12", count: 0 },
      { day: "2026-11-13", count: 0 },
    ]);
  });

  it("compare les 7 derniers jours aux 7 d'avant", () => {
    const series = dailyCounts([{ day: "2026-11-01", count: 5 }, { day: "2026-11-08", count: 1 }, { day: "2026-11-13", count: 6 }], 14, now);
    expect(weekOverWeek(series)).toEqual({ current: 7, previous: 5, change: 2 });
  });
});
