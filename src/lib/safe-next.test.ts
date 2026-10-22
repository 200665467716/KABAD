import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps paths on the site", () => {
    expect(safeNext("/messages")).toBe("/messages");
    expect(safeNext("/defis/x?onglet=a#b")).toBe("/defis/x?onglet=a#b");
  });
  it("refuses anything that would leave the site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "evil.com", "", null, undefined, 42]) {
      expect(safeNext(bad)).toBe("/accueil");
    }
  });
});
