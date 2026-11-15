import { describe, expect, it } from "vitest";
import { splitResolution } from "../report-decision";
import { localizeGroupName, localizeRoomTitle, localizeSystemText } from "../system-text";

describe("localizeSystemText", () => {
  it("laisse le français tel quel", () => {
    expect(localizeSystemText("Yao a quitté le groupe", "fr")).toBe("Yao a quitté le groupe");
  });

  it("traduit les lignes système enregistrées en français", () => {
    const en = (s: string) => localizeSystemText(s, "en");
    expect(en("Yao a accepté l’invitation")).toBe("Yao accepted the invitation");
    expect(en("Kossi a créé le groupe et ajouté Fatou, Yao, Chidi et Edem")).toBe("Kossi created the group and added Fatou, Yao, Chidi and Edem");
    expect(en("Fatou a ajouté Edem")).toBe("Fatou added Edem");
    expect(en("Fatou a retiré Edem")).toBe("Fatou removed Edem");
    expect(en("Fatou a retiré la photo du groupe")).toBe("Fatou removed the group photo");
    expect(en("Fatou a renommé le groupe « API Dakar »")).toBe("Fatou renamed the group “API Dakar”");
    expect(en("Fatou a changé le thème du groupe")).toBe("Fatou changed the group theme");
    expect(en("Yao a quitté le groupe")).toBe("Yao left the group");
    expect(en("Fatou a quitté le groupe. Yao gère maintenant le groupe")).toBe("Fatou left the group. Yao now manages the group");
    expect(en("Fatou a rejoint le groupe")).toBe("Fatou joined the group");
    expect(en("Yao a ouvert le groupe de test. Installer l’app : https://kora.app")).toBe("Yao opened the test group. Install the app: https://kora.app");
    expect(en("Awa a créé l’équipe Les Lions. Cette discussion est réservée à ses membres.")).toBe("Awa created the team Les Lions. This chat is for its members only.");
    expect(en("Kossi a lancé le projet « Kora »")).toBe("Kossi launched the project “Kora”");
    expect(en("Kossi a épinglé un message")).toBe("Kossi pinned a message");
    expect(en("Kossi a désépinglé un message")).toBe("Kossi unpinned a message");
    expect(en("Kossi a changé la description du groupe")).toBe("Kossi changed the group description");
    expect(en("Chidi a retiré Fatou du test")).toBe("Chidi removed Fatou from the test");
    expect(en("Groupe des instructeurs de « Fintech » : organisation, modalités et questions des équipes.")).toBe("Instructors' group of “Fintech”: organisation, arrangements and the teams' questions.");
  });

  it("traduit le message retiré partout, mais jamais un message tapé par un membre", () => {
    expect(localizeSystemText("Message retiré par la modération.", "en", false)).toBe("Message removed by moderation.");
    expect(localizeSystemText("Yao a rejoint le groupe", "en", false)).toBe("Yao a rejoint le groupe");
    expect(localizeSystemText("Un texte inconnu", "en")).toBe("Un texte inconnu");
  });

  it("traduit les noms et titres écrits par l'application", () => {
    expect(localizeGroupName("Testeurs Kora", "en")).toBe("Testers Kora");
    expect(localizeGroupName("Testeurs Kora", "fr")).toBe("Testeurs Kora");
    expect(localizeGroupName("Instructeurs · Fintech", "en")).toBe("Instructors · Fintech");
    expect(localizeRoomTitle("Salon de discussion", "en")).toBe("Discussion room");
    expect(localizeRoomTitle("Point QA", "en")).toBe("Point QA");
  });
});

describe("splitResolution", () => {
  it("sépare la décision enregistrée en français de la note", () => {
    expect(splitResolution("Contenu retiré : Traité par l’équipe")).toEqual({ decision: "hide", note: "Traité par l’équipe" });
    expect(splitResolution("Classé sans suite")).toEqual({ decision: "dismiss", note: "" });
    expect(splitResolution("Une note seule")).toEqual({ decision: null, note: "Une note seule" });
  });
});
