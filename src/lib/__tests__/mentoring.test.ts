import { describe, expect, it } from "vitest";
import { jitsiRoom } from "../mentoring";

describe("video rooms", () => {
  it("creates unguessable video rooms", () => {
    const a = jitsiRoom();
    expect(a).toMatch(/^https:\/\/meet\.jit\.si\/kabad-[\w-]{12}$/);
    expect(jitsiRoom()).not.toBe(a);
  });
});
