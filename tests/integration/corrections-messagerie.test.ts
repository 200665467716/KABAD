import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog, resolveReport, setJury } from "@/server/admin";
import { addGroupMembers, answerInvitation, areContacts, block, createGroup, createReport, getConversation, sendInvitation, sendMessage, unblock, updateGroup } from "@/server/messaging";
import { createTestApp, joinTest, leaveTest } from "@/server/community-tests";
import { captureEvents, makeContacts, makeUsers, prisma, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Moussa", "Yao", "Edem", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
});
afterAll(() => prisma.$disconnect());

/** Kossi et Moussa deviennent contacts par une invitation acceptée : leur conversation existe. */
async function friends() {
  const { id } = await sendInvitation("kossi", { toId: "moussa", message: "" }, prisma);
  const { conversationId } = await answerInvitation("moussa", id, true, prisma);
  return conversationId!;
}

describe("groupes : ajout de participants", () => {
  it("tous les membres, anciens et nouveaux, rechargent le groupe pour voir la nouvelle liste", async () => {
    await makeContacts("kossi", "moussa");
    await makeContacts("kossi", "yao");
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa"] }, prisma);
    const { events } = await captureEvents(() => addGroupMembers("kossi", id, ["yao"], prisma));
    const changed = events.find((e) => e.t === "conversation");
    expect(changed?.recipients).toEqual(expect.arrayContaining(["kossi", "moussa", "yao"]));
  });

  it("les membres arrivés ensemble ont un ordre stable", async () => {
    await makeContacts("kossi", "moussa");
    await makeContacts("kossi", "yao");
    await makeContacts("kossi", "edem");
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["yao", "edem", "moussa"] }, prisma);
    const first = (await getConversation("kossi", id, {}, prisma)).members.map((m) => m.id);
    const again = (await getConversation("kossi", id, {}, prisma)).members.map((m) => m.id);
    expect(again).toEqual(first);
  });

  it("renommer et changer le thème en même temps laisse une ligne pour chacun", async () => {
    await makeContacts("kossi", "moussa");
    const { id } = await createGroup("kossi", { name: "API Lomé", memberIds: ["moussa"] }, prisma);
    await updateGroup("kossi", id, { name: "API Dakar", theme: "Fintech" }, prisma);
    const bodies = (await getConversation("moussa", id, {}, prisma)).messages.map((m) => m.body);
    expect(bodies).toEqual(expect.arrayContaining(["Kossi a renommé le groupe « API Dakar »", "Kossi a changé le thème du groupe"]));
  });
});

describe("groupes communautaires", () => {
  it("quitter puis rejoindre un test laisse une ligne de départ entre les deux arrivées", async () => {
    const app = { name: "Kalo", platforms: ["WEB" as const], url: "https://kalo.tg", minutes: 10, slots: 5, pitch: "p", task: "t", steps: ["Ajouter une dépense"], questions: [] };
    const { id, conversationId } = await createTestApp("kossi", app, prisma);
    await joinTest("yao", id, prisma);
    await leaveTest("yao", id, prisma);
    await joinTest("yao", id, prisma);
    const bodies = (await getConversation("kossi", conversationId, {}, prisma)).messages.filter((m) => m.system).map((m) => m.body);
    expect(bodies.slice(1)).toEqual(["Yao a rejoint le groupe", "Yao a quitté le groupe", "Yao a rejoint le groupe"]);
  });
});

describe("blocage et déblocage", () => {
  it("bloquer prévient les deux membres en direct, pour fermer le champ de saisie", async () => {
    const conversationId = await friends();
    const { events } = await captureEvents(() => block("kossi", "moussa", prisma));
    expect(events).toContainEqual(expect.objectContaining({ t: "conversation", conversationId, recipients: expect.arrayContaining(["kossi", "moussa"]) }));
    await expect(sendMessage("moussa", conversationId, { body: "Tu es là ?" }, prisma)).rejects.toMatchObject({ status: 403 });
  });

  it("bloquer depuis un signalement prévient aussi en direct", async () => {
    const conversationId = await friends();
    const { events } = await captureEvents(() => createReport("kossi", { targetType: "CONVERSATION", targetId: conversationId, reason: "Spam ou arnaque", block: true }, prisma));
    expect(events.some((e) => e.t === "conversation" && e.conversationId === conversationId)).toBe(true);
  });

  it("débloquer après une conversation rend les deux contacts, et l'annonce en direct", async () => {
    const conversationId = await friends();
    await block("kossi", "moussa", prisma);
    expect(await areContacts("kossi", "moussa", prisma)).toBe(false);
    const { events } = await captureEvents(() => unblock("kossi", "moussa", prisma));
    expect(await areContacts("kossi", "moussa", prisma)).toBe(true);
    expect(await areContacts("moussa", "kossi", prisma)).toBe(true);
    expect(events.some((e) => e.t === "conversation" && e.conversationId === conversationId)).toBe(true);
    await expect(sendMessage("kossi", conversationId, { body: "On reprend" }, prisma)).resolves.toMatchObject({ body: "On reprend" });
  });

  it("débloquer ne rend pas le contact tant que l'autre bloque encore, ni sans conversation passée", async () => {
    await friends();
    await block("kossi", "moussa", prisma);
    await block("moussa", "kossi", prisma);
    await unblock("kossi", "moussa", prisma);
    expect(await areContacts("kossi", "moussa", prisma)).toBe(false);

    // Yao n'a jamais parlé à Kossi : le déblocage ne crée aucun lien, il faudra une invitation.
    await block("kossi", "yao", prisma);
    await unblock("kossi", "yao", prisma);
    expect(await areContacts("kossi", "yao", prisma)).toBe(false);
  });
});

describe("journal d'administration", () => {
  it("nomme le membre visé et garde la note sans libellé français en tête", async () => {
    const conversationId = await friends();
    const msg = await sendMessage("moussa", conversationId, { body: "insulte" }, prisma);
    await createReport("kossi", { targetType: "MESSAGE", targetId: msg.id, reason: "Harcèlement ou propos haineux", block: false }, prisma);
    const report = await prisma.report.findFirstOrThrow();
    await resolveReport("equipe", report.id, "hide", "Propos insultants", prisma);
    // Le signalement garde sa décision complète ; le journal, seulement la note.
    expect((await prisma.report.findUniqueOrThrow({ where: { id: report.id } })).resolution).toBe("Contenu retiré : Propos insultants");
    const [row] = await auditLog("equipe", prisma);
    expect(row).toMatchObject({ action: "report:hide", target: "Moussa", details: "Propos insultants" });
  });

  it("un jury montre le nom des jurés et du hackathon, pas leurs identifiants", async () => {
    const soon = new Date(Date.now() + 86_400_000);
    await makeUsers("Ama", "Bio", "Cheikh");
    await prisma.user.updateMany({ where: { id: { in: ["ama", "bio", "cheikh"] } }, data: { seniorVerifiedAt: new Date() } });
    const h = await prisma.hackathon.create({
      data: { id: "h", title: "Hack Lomé", organizerName: "LoméLab", format: "ONLINE", startsAt: soon, endsAt: new Date(soon.getTime() + 2 * 86_400_000), closesAt: soon, level: "Tous niveaux", stack: "Web", description: "…", publishedAt: new Date() },
    });
    await setJury("equipe", h.id, ["ama", "bio", "cheikh"], prisma);
    const [row] = await auditLog("equipe", prisma);
    expect(row.target).toBe("Hack Lomé");
    expect(row.details?.split(", ").sort()).toEqual(["Ama", "Bio", "Cheikh"]);
  });
});
