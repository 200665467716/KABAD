import { describe, expect, it } from "vitest";
import { changePasswordSchema, signupSchema } from "../schemas";
import { passwordRules } from "../password";

describe("mot de passe", () => {
  it("demande 8 caractères au moins, dont un chiffre", () => {
    expect(passwordRules("kabad202")).toEqual({ length: true, digit: true });
    expect(passwordRules("kabad20")).toEqual({ length: false, digit: true });
    expect(passwordRules("motdepasse")).toEqual({ length: true, digit: false });
  });

  it("refuse à l'inscription et au changement un mot de passe sans chiffre ou trop court", () => {
    const base = { name: "Ama Diaka", email: "ama@exemple.gh" };
    expect(signupSchema.safeParse({ ...base, password: "kabad-2026" }).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, password: "un-mot-de-passe" }).error?.issues[0].message).toBe("Le mot de passe doit contenir au moins un chiffre.");
    expect(changePasswordSchema.safeParse({ current: "x", next: "abc1" }).error?.issues[0].message).toBe("Le mot de passe doit faire au moins 8 caractères.");
  });
});
