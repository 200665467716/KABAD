import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createGroup, addGroupMembers, answerInvitation, block, createReport, sendInvitation } from "@/server/messaging";
import { dashboard, reinstateMember, resolveReport, suspendMember } from "@/server/admin";
import { userFromToken, createSession } from "@/server/auth";
import { rateLimit } from "@/server/rate-limit";
import { makeContacts, makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Moussa", "Yao", "Awa", "Nadia", "Ibrahim", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
});
afterAll(() => prisma.$disconnect());

describe("blocage", () => {
  it("coupe le contact : la personne bloquée ne peut plus ajouter sa cible à un groupe", async () => {
    await makeContacts("kossi", "moussa");
    await block("kossi", "moussa", prisma);
    expect(await prisma.contact.count()).toBe(0);
    await refused(createGroup("moussa", { name: "x", memberIds: ["kossi"] }, prisma), "forbidden");
  });

  it("empêche d’accepter une invitation entre deux membres dont l’un a bloqué l’autre", async () => {
    const { id } = await sendInvitation("moussa", { toId: "kossi", message: "Salut" }, prisma);
    await prisma.block.create({ data: { blockerId: "moussa", blockedId: "kossi" } });
    await refused(answerInvitation("kossi", id, true, prisma), "forbidden");
  });

  it("refuse d’ajouter à un groupe un contact bloqué", async () => {
    await makeContacts("kossi", "yao");
    await makeContacts("kossi", "moussa");
    const { id } = await createGroup("kossi", { name: "Groupe", memberIds: ["yao"] }, prisma);
    await prisma.block.create({ data: { blockerId: "moussa", blockedId: "kossi" } });
    await refused(addGroupMembers("kossi", id, ["moussa"], prisma), "forbidden");
  });
});

describe("invitations", () => {
  it("deux acceptations simultanées n’ouvrent la conversation qu’une fois", async () => {
    const { id } = await sendInvitation("moussa", { toId: "kossi", message: "Salut" }, prisma);
    const results = await Promise.allSettled([answerInvitation("kossi", id, true, prisma), answerInvitation("kossi", id, true, prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.message.count({ where: { kind: "TEXT" } })).toBe(1);
  });
});

describe("comptes", () => {
  it("un membre suspendu perd ses sessions et ne peut plus se reconnecter", async () => {
    const { token } = await createSession("moussa", prisma);
    await suspendMember("equipe", "moussa", "Harcèlement", prisma);
    expect(await userFromToken(token, prisma)).toBeNull();
    expect(await prisma.adminAction.count({ where: { action: "member:suspend" } })).toBe(1);
  });

  it("réintégrer un membre inconnu répond « introuvable », pas une erreur 500", async () => {
    await refused(reinstateMember("equipe", "personne", prisma), "not_found");
    await suspendMember("equipe", "moussa", "Spam", prisma);
    await reinstateMember("equipe", "moussa", prisma);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: "moussa" } })).suspendedAt).toBeNull();
  });

  it("seul un administrateur traite un signalement, et un message retiré est masqué", async () => {
    await makeContacts("kossi", "moussa");
    const conv = await prisma.conversation.create({ data: { kind: "DIRECT", directKey: "kossi:moussa", members: { create: [{ userId: "kossi" }, { userId: "moussa" }] } } });
    const msg = await prisma.message.create({ data: { conversationId: conv.id, authorId: "moussa", body: "insulte" } });
    await createReport("kossi", { targetType: "MESSAGE", targetId: msg.id, reason: "Spam ou arnaque", block: false }, prisma);
    const report = await prisma.report.findFirstOrThrow();
    expect(report.targetUserId).toBe("moussa");
    await refused(resolveReport("kossi", report.id, "hide", undefined, prisma), "forbidden");
    await resolveReport("equipe", report.id, "hide", undefined, prisma);
    expect((await prisma.message.findUniqueOrThrow({ where: { id: msg.id } })).hiddenAt).not.toBeNull();
  });

  it("le limiteur partagé compte en base et bloque au-delà du maximum", async () => {
    for (let i = 0; i < 3; i++) await rateLimit("test-key", 3, 60_000, "Trop.", prisma);
    await refused(rateLimit("test-key", 3, 60_000, "Trop.", prisma), "rate_limited");
  });
});

describe("tableau de bord de l'équipe", () => {
  it("compte inscriptions et messages jour par jour, sans les lignes ajoutées par KABAD", async () => {
    const day = 86_400_000;
    await prisma.user.update({ where: { id: "yao" }, data: { createdAt: new Date(Date.now() - 9 * day) } });
    await prisma.user.update({ where: { id: "awa" }, data: { createdAt: new Date(Date.now() - 40 * day) } });
    await makeContacts("kossi", "moussa");
    const conv = await prisma.conversation.create({ data: { kind: "DIRECT", directKey: "kossi:moussa", members: { create: [{ userId: "kossi" }, { userId: "moussa" }] } } });
    await prisma.message.createMany({
      data: [
        { conversationId: conv.id, authorId: "kossi", body: "Salut" },
        { conversationId: conv.id, authorId: "moussa", body: "Bonjour" },
        { conversationId: conv.id, authorId: null, kind: "SYSTEM", body: "Kossi a rejoint la conversation" },
        { conversationId: conv.id, authorId: "kossi", body: "Il y a 8 jours", createdAt: new Date(Date.now() - 8 * day) },
      ],
    });

    await refused(dashboard("kossi", prisma), "forbidden");
    const d = await dashboard("equipe", prisma);
    expect(d.signups).toHaveLength(14);
    // Kossi, Moussa, Nadia, Ibrahim cette semaine (l'équipe n'est pas comptée), Yao la semaine d'avant, Awa hors période.
    expect(d.signupsWeek).toEqual({ current: 4, previous: 1, change: 3 });
    expect(d.signups.at(-1)?.count).toBe(4);
    expect(d.messagesWeek).toEqual({ current: 2, previous: 1, change: 1 });
    expect(d.latest.map((u) => u.id)).not.toContain("equipe");
    expect(d.latest).toHaveLength(5);
  });
});
