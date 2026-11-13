import { describe, expect, it } from "vitest";
import { findMentions, mentionQuery, splitMentions } from "../mentions";

const members = [
  { id: "nadia", name: "Nadia Bello" },
  { id: "yao", name: "Yao Agbeko" },
  { id: "aicha", name: "Aïcha Kouassi" },
];

describe("mentions dans un groupe", () => {
  it("repère un membre par son prénom ou son nom complet, sans tenir compte des majuscules", () => {
    expect(findMentions("Bienvenue @Nadia !", members)).toEqual(["nadia"]);
    expect(findMentions("@yao agbeko tu relis ?", members)).toEqual(["yao"]);
    expect(findMentions("Merci @Aïcha et @Nadia, et encore @Nadia", members)).toEqual(["aicha", "nadia"]);
  });

  it("ignore une adresse e-mail, un nom collé à d'autres lettres et un inconnu", () => {
    expect(findMentions("Écris à nadia@exemple.ca", members)).toEqual([]);
    expect(findMentions("@Nadiab n’existe pas", members)).toEqual([]);
    expect(findMentions("@Fatou est absente", members)).toEqual([]);
  });

  it("découpe le texte pour l'affichage, le nom complet passant avant le prénom", () => {
    expect(splitMentions("Salut @Nadia Bello, ça va ?", members)).toEqual([{ text: "Salut " }, { text: "@Nadia Bello", mention: "nadia" }, { text: ", ça va ?" }]);
    expect(splitMentions("Rien à signaler", members)).toEqual([{ text: "Rien à signaler" }]);
  });

  it("donne le mot tapé après @ pour proposer des membres", () => {
    expect(mentionQuery("Salut @Na", 9)).toEqual({ query: "Na", start: 6 });
    expect(mentionQuery("@", 1)).toEqual({ query: "", start: 0 });
    expect(mentionQuery("mail@exe", 8)).toBeNull();
    expect(mentionQuery("Salut @Nadia ", 13)).toBeNull();
  });
});
