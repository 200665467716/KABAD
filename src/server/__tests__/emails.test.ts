import { describe, expect, it } from "vitest";
import { mailLocale, passwordResetMail, verificationMail } from "../emails";

describe("e-mails du compte", () => {
  it("écrit en français par défaut, en tutoyant", () => {
    const m = verificationMail(mailLocale(null), "Awa Diallo", "123456", "abc");
    expect(m.subject).toBe("123456 : ton code de confirmation KABAD");
    expect(m.text).toContain("Bonjour Awa,");
    expect(m.text).toContain("/verifier-email?jeton=abc");
    expect(m.text).not.toContain("/en/");
    expect(m.text).not.toMatch(/\bvous\b/i);
  });

  it("écrit en anglais avec un lien vers la page anglaise", () => {
    const m = passwordResetMail(mailLocale("en"), "Kossi Mensah", "tok");
    expect(m.subject).toBe("Reset your KABAD password");
    expect(m.text).toContain("Hello Kossi,");
    expect(m.text).toMatch(/\/en\/reinitialiser\?jeton=tok$/m);
  });
});
