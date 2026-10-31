import { describe, expect, it } from "vitest";
import { requestLocale, translateError } from "../error-language";

describe("messages d’erreur en anglais", () => {
  it("traduit un message connu, un message construit et un message composé", () => {
    expect(translateError("Requête invalide.", "en")).not.toBe("Requête invalide.");
    expect(translateError("Un groupe compte 50 membres au plus.", "en")).toMatch(/50/);
    expect(translateError("Trop d’essais de connexion. Réessaie dans 5 min.", "en")).not.toMatch(/Trop|Réessaie/);
  });

  it("laisse le français en français, et un message inconnu tel quel", () => {
    expect(translateError("Requête invalide.", "fr")).toBe("Requête invalide.");
    expect(translateError("Message inconnu.", "en")).toBe("Message inconnu.");
  });

  it("lit la langue de la page qui appelle", () => {
    expect(requestLocale(new Request("http://x/api", { headers: { "x-kabad-locale": "en" } }))).toBe("en");
    expect(requestLocale(new Request("http://x/api", { headers: { referer: "http://x/en/hackathons" } }))).toBe("en");
    expect(requestLocale(new Request("http://x/api", { headers: { referer: "http://x/hackathons" } }))).toBe("fr");
  });
});
