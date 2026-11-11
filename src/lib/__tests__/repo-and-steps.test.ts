import { describe, expect, it } from "vitest";
import { teamTitle } from "../format";
import { normalizeRepoUrl, REPO_URL, repoIsPublic } from "../repo";
import { submissionSchema } from "../schemas";
import { parseSteps } from "../test-steps";

describe("lien du dépôt (H5)", () => {
  it("ajoute https:// et retire ce qui est en trop", () => {
    expect(normalizeRepoUrl("github.com/equipe/tontine-pay")).toBe("https://github.com/equipe/tontine-pay");
    expect(normalizeRepoUrl("  http://www.github.com/equipe/tontine-pay.git/ ")).toBe("https://github.com/equipe/tontine-pay");
    expect(normalizeRepoUrl("https://gitlab.com/equipe/projet/")).toBe("https://gitlab.com/equipe/projet");
    expect(normalizeRepoUrl("")).toBe("");
  });

  it("n’accepte que l’adresse d’un dépôt sur une forge connue", () => {
    expect(REPO_URL.test("https://github.com/equipe/projet")).toBe(true);
    expect(REPO_URL.test("https://codeberg.org/equipe/projet")).toBe(true);
    expect(REPO_URL.test("https://github.com/equipe")).toBe(false);
    expect(REPO_URL.test("https://exemple.com/equipe/projet")).toBe(false);
    expect(REPO_URL.test("https://github.com.pirate.io/equipe/projet")).toBe(false);
  });

  it("le formulaire complète le lien avant de le vérifier, et refuse « abc »", () => {
    const base = { projectName: "Tontine Pay", explanation: "x".repeat(40), teamAgrees: true as const };
    expect(submissionSchema.parse({ ...base, repoUrl: "github.com/equipe/tontine-pay" }).repoUrl).toBe("https://github.com/equipe/tontine-pay");
    expect(submissionSchema.safeParse({ ...base, repoUrl: "abc" }).success).toBe(false);
  });

  it("lit la réponse de la forge : public, privé ou introuvable, ou rien à en dire", () => {
    expect(repoIsPublic(200, null)).toBe(true);
    expect(repoIsPublic(404, null)).toBe(false);
    // GitLab sends a private repository to the sign-in page.
    expect(repoIsPublic(302, "https://gitlab.com/users/sign_in")).toBe(false);
    // A renamed repository moves and stays public.
    expect(repoIsPublic(301, "https://github.com/equipe/nouveau-nom")).toBe(true);
    // Too many requests, or the forge is down: the team is not blocked.
    expect(repoIsPublic(429, null)).toBeNull();
    expect(repoIsPublic(503, null)).toBeNull();
  });
});

describe("tâches d’une annonce de test (T3)", () => {
  it("une tâche par ligne, sans le numéro ni le tiret tapés devant", () => {
    expect(parseSteps("1. S’inscrire avec un numéro\n2) Ajouter une dépense\n\n- Partager le budget\n• Noter l’app")).toEqual(["S’inscrire avec un numéro", "Ajouter une dépense", "Partager le budget", "Noter l’app"]);
  });

  it("garde un chiffre qui fait partie de la tâche", () => {
    expect(parseSteps("Commander 3 produits\n3 produits à commander")).toEqual(["Commander 3 produits", "3 produits à commander"]);
  });
});

describe("nom d’une équipe", () => {
  it("ajoute « Équipe » sauf si le nom le dit déjà", () => {
    expect(teamTitle("Baobab")).toBe("Équipe Baobab");
    expect(teamTitle("Équipe Kora")).toBe("Équipe Kora");
    expect(teamTitle("Team Rocket", "Team")).toBe("Team Rocket");
    expect(teamTitle("Baobab", "Team")).toBe("Team Baobab");
  });
});
