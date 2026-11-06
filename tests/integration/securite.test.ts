import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createGroup, addGroupMembers, answerInvitation, block, createReport, sendInvitation } from "@/server/messaging";
import { resolveReport, suspendMember } from "@/server/admin";
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
