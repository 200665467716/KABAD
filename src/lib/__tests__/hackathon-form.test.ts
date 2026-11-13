import { describe, expect, it } from "vitest";
import { checkStep1, checkStep2, levelIndex } from "../hackathon-form";

const now = new Date("2026-11-13T12:00:00").getTime();
const ok = { title: "Agritech Sahel", organizerName: "Yao", format: "ONSITE", city: "Lomé", startsAt: "2026-11-20T09:00", endsAt: "2026-11-22T18:00", closesAt: "2026-11-19T23:00", stack: "Web" };

describe("formulaire « Organiser »", () => {
  it("laisse passer une étape 1 correcte", () => {
    expect(checkStep1(ok, now)).toEqual({});
  });

  it("donne toutes les erreurs de l’étape 1 à la fois, dans l’ordre de l’écran", () => {
    const found = checkStep1({ ...ok, city: "", stack: "", endsAt: "2026-11-19T09:00", closesAt: "2026-11-21T09:00" }, now);
    expect(found).toEqual({ city: "city", endsAt: "endBeforeStart", closesAt: "closesAfterStart", stack: "stack" });
    expect(Object.keys(found)[0]).toBe("city");
  });

  it("refuse une clôture passée et des dates vides ; un hackathon en ligne n’a pas de ville", () => {
    expect(checkStep1({ ...ok, closesAt: "2026-11-12T09:00" }, now)).toEqual({ closesAt: "closesPast" });
    expect(checkStep1({ ...ok, startsAt: "", endsAt: "", closesAt: "" }, now)).toEqual({ startsAt: "start", endsAt: "end", closesAt: "closes" });
    expect(checkStep1({ ...ok, format: "ONLINE", city: "" }, now)).toEqual({});
  });

  it("vérifie le défi et le lien du règlement à l’étape 2", () => {
    expect(checkStep2({ description: "Trop court", rulesUrl: "http://x.tg" })).toEqual({ description: "description", rulesUrl: "rulesUrl" });
    expect(checkStep2({ description: "x".repeat(30), rulesUrl: "" })).toEqual({});
    expect(checkStep2({ description: "x".repeat(30), rulesUrl: "https://finlab.tg/reglement" })).toEqual({});
  });

  it("retrouve le rang d’un niveau enregistré en français", () => {
    expect(levelIndex("Tous niveaux")).toBe(0);
    expect(levelIndex("Avancé")).toBe(3);
    expect(levelIndex("Expert")).toBeNull();
  });
});
