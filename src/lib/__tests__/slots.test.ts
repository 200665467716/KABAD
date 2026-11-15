import { describe, expect, it } from "vitest";
import { dayKey, daysBetween, freeSlots, groupDays, isDay, isOfferedSlot, localDay, rangesProblem, suggestRange, zonedToUtc } from "../slots";

// Thursday 5 November 2026. Lomé is on UTC all year; Paris is on UTC+1 in November.
const now = new Date("2026-11-01T00:00:00Z");

describe("zonedToUtc", () => {
  it("converts a local time to the right moment", () => {
    expect(zonedToUtc({ y: 2026, m: 11, d: 5 }, 15 * 60, "Africa/Lome").toISOString()).toBe("2026-11-05T15:00:00.000Z");
    expect(zonedToUtc({ y: 2026, m: 11, d: 5 }, 15 * 60, "Europe/Paris").toISOString()).toBe("2026-11-05T14:00:00.000Z");
    expect(zonedToUtc({ y: 2026, m: 7, d: 5 }, 15 * 60, "Europe/Paris").toISOString()).toBe("2026-07-05T13:00:00.000Z");
  });

  it("knows the local weekday", () => {
    expect(localDay(new Date("2026-11-05T12:00:00Z"), "Africa/Lome")).toEqual({ y: 2026, m: 11, d: 5, weekday: 4 });
    expect(dayKey({ y: 2026, m: 1, d: 9 })).toBe("2026-01-09");
  });
});

describe("freeSlots", () => {
  const ranges = [{ weekday: 4, startMin: 15 * 60, endMin: 16 * 60 + 30 }];
  const week = { from: new Date("2026-11-02T00:00:00Z"), to: new Date("2026-11-09T00:00:00Z") };

  it("cuts a weekly range into 30-minute slots", () => {
    const slots = freeSlots({ ranges, timeZone: "Africa/Lome", now, ...week });
    expect(slots.map((s) => s.toISOString())).toEqual(["2026-11-05T15:00:00.000Z", "2026-11-05T15:30:00.000Z", "2026-11-05T16:00:00.000Z"]);
  });

  it("skips booked slots, days off and slots too close to now", () => {
    const taken = [Date.parse("2026-11-05T15:30:00Z")];
    expect(freeSlots({ ranges, timeZone: "Africa/Lome", now, ...week, taken }).length).toBe(2);
    expect(freeSlots({ ranges, timeZone: "Africa/Lome", now, ...week, blocked: ["2026-11-05"] })).toEqual([]);
    const soon = new Date("2026-11-05T14:00:00Z");
    expect(freeSlots({ ranges, timeZone: "Africa/Lome", now: soon, ...week }).map((s) => s.toISOString())).toEqual(["2026-11-05T16:00:00.000Z"]);
  });

  it("checks one slot for a booking", () => {
    const q = { ranges, timeZone: "Africa/Lome", now };
    expect(isOfferedSlot(new Date("2026-11-05T15:30:00Z"), q)).toBe(true);
    expect(isOfferedSlot(new Date("2026-11-05T15:10:00Z"), q)).toBe(false);
    expect(isOfferedSlot(new Date("2026-11-06T15:30:00Z"), q)).toBe(false);
  });
});

describe("rangesProblem", () => {
  it("accepts clean ranges and refuses broken ones", () => {
    expect(rangesProblem([{ weekday: 1, startMin: 1080, endMin: 1200 }, { weekday: 1, startMin: 1200, endMin: 1260 }])).toBeNull();
    expect(rangesProblem([{ weekday: 1, startMin: 1080, endMin: 1200 }, { weekday: 1, startMin: 1140, endMin: 1260 }])).toMatch(/chevauchent/);
    expect(rangesProblem([{ weekday: 1, startMin: 1085, endMin: 1200 }])).toMatch(/demie/);
    expect(rangesProblem([{ weekday: 8, startMin: 0, endMin: 60 }])).toMatch(/Jour/);
  });
});

describe("suggestRange", () => {
  const h = (n: number) => n * 60;
  const ok = (day: Array<{ startMin: number; endMin: number }>) => rangesProblem([...day, suggestRange(day)!].map((r) => ({ weekday: 1, ...r })));

  it("offers the evening on an empty day, then an hour after the last range", () => {
    expect(suggestRange([])).toEqual({ startMin: h(18), endMin: h(20) });
    expect(suggestRange([{ startMin: h(9), endMin: h(12) }])).toEqual({ startMin: h(13), endMin: h(15) });
  });

  it("never overlaps, even after a range that ends at midnight", () => {
    // The old rule offered 22:00–24:00 here, on top of the evening range.
    const evening = [{ startMin: h(20), endMin: h(24) }];
    expect(suggestRange(evening)).toEqual({ startMin: h(18), endMin: h(20) });
    expect(ok(evening)).toBeNull();
    expect(ok([{ startMin: h(9), endMin: h(23) }])).toBeNull();
    expect(ok([{ startMin: h(0), endMin: h(8) }, { startMin: h(10), endMin: h(24) }])).toBeNull();
  });

  it("offers nothing when the day is full", () => {
    expect(suggestRange([{ startMin: 0, endMin: h(24) }])).toBeNull();
    expect(suggestRange([{ startMin: 0, endMin: h(12) }, { startMin: h(12) + 30, endMin: h(24) }])).toBeNull();
  });
});

describe("bloquer plusieurs jours (P17)", () => {
  it("donne tous les jours d'une période, bornes comprises, même à cheval sur deux mois", () => {
    expect(daysBetween("2026-11-28", "2026-12-02")).toEqual(["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(daysBetween("2026-11-20", "")).toEqual(["2026-11-20"]);
    // Un champ date en cours de saisie (année à 6 chiffres, 31 février) ne fait plus planter l'écran (P5-6).
    expect(daysBetween("2026-12-28", "202701-01-03")).toEqual(["2026-12-28"]);
    expect(daysBetween("202612-12-28", "2027-01-03")).toEqual([]);
    expect(daysBetween("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(isDay("2026-02-31")).toBe(false);
    expect(isDay("2026-02-28")).toBe(true);
    expect(daysBetween("2026-11-20", "2026-11-18")).toEqual(["2026-11-20"]);
    expect(daysBetween("2026-11-01", "2027-06-01")).toHaveLength(60);
  });

  it("regroupe les jours qui se suivent avec le même motif", () => {
    const days = [
      { day: "2026-11-21", reason: "Congés" },
      { day: "2026-11-20", reason: "Congés" },
      { day: "2026-11-22", reason: "Congés" },
      { day: "2026-11-23", reason: "Examen" },
      { day: "2026-12-05", reason: "" },
    ];
    expect(groupDays(days).map((g) => [g.from, g.to, g.reason, g.days.length])).toEqual([
      ["2026-11-20", "2026-11-22", "Congés", 3],
      ["2026-11-23", "2026-11-23", "Examen", 1],
      ["2026-12-05", "2026-12-05", "", 1],
    ]);
  });
});

