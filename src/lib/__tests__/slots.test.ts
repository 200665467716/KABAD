import { describe, expect, it } from "vitest";
import { dayKey, freeSlots, isOfferedSlot, localDay, rangesProblem, zonedToUtc } from "../slots";

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
