import { describe, expect, it } from "vitest";
import { translateError } from "../../server/error-language";
import { juryScoreSchema, signupSchema, testStepSchema } from "../schemas";

const first = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

describe("messages de validation", () => {
  it("n'affiche jamais le texte anglais de Zod, même sans message dans la règle", () => {
    const score = { submissionId: "s", works: 6, code: 3, tests: 3, explain: 3 };
    expect(first(juryScoreSchema.safeParse(score))).toBe("Ce nombre est trop grand.");
    expect(first(testStepSchema.safeParse({ index: -1, done: true }))).toBe("Ce nombre est trop petit.");
    expect(first(testStepSchema.safeParse({ index: "1", done: true }))).toBe("Données invalides.");
  });

  it("garde le message écrit dans la règle", () => {
    expect(first(signupSchema.safeParse({ name: "", email: "a@b.co", password: "kabad2026" }))).toBe("Indique ton nom complet.");
  });

  it("a une traduction anglaise pour chaque message de repli", () => {
    for (const m of ["Ce nombre est trop grand.", "Ce nombre est trop petit.", "Il y a trop d’éléments.", "Il manque des éléments.", "Ce texte est trop long.", "Ce texte est trop court.", "Données invalides."]) {
      expect(translateError(m, "en")).not.toBe(m);
    }
  });

  it("traduit sous /en les erreurs du formulaire d'inscription", () => {
    const r = signupSchema.safeParse({ name: "", email: "x", password: "motdepasse" });
    const issues = r.error?.issues ?? [];
    expect(issues.length).toBeGreaterThanOrEqual(3);
    for (const i of issues) expect(translateError(i.message, "en")).not.toBe(i.message);
  });
});
