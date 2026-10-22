import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createGroup, addGroupMembers, answerInvitation, block, createReport, sendInvitation } from "@/server/messaging";
import { noteSession } from "@/server/mentoring";
import { publishResults, scoreSubmission } from "@/server/challenges";
import { signInWithGithub } from "@/server/github";
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

describe("mentorat", () => {
  it("refuse une séance antidatée, antérieure au binôme ou au-delà de 4 h par jour", async () => {
    await prisma.user.update({ where: { id: "awa" }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
    const pair = await prisma.pair.create({ data: { mentorId: "awa", menteeId: "kossi", project: "API", createdAt: new Date(Date.now() - 30 * 86_400_000) } });
    const base = { pairId: pair.id, topic: "Tests", done: "Nous avons écrit des tests.", next: "Continuer" };
    await refused(noteSession("awa", { ...base, startsAt: new Date(Date.now() - 20 * 86_400_000).toISOString(), minutes: 60 }, prisma), "too_old");
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    await noteSession("awa", { ...base, startsAt: yesterday, minutes: 180 }, prisma);
    await refused(noteSession("awa", { ...base, startsAt: yesterday, minutes: 90 }, prisma), "too_much");
  });
});

describe("défis", () => {
  async function challengeInJury() {
    for (const id of ["awa", "nadia", "ibrahim"]) await prisma.user.update({ where: { id }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
    await prisma.challenge.create({
      data: { id: "d", title: "Défi", kind: "CAGNOTTE", status: "JURY", level: "Débutant", stack: "JS", description: "…", closesAt: new Date(), sponsorAmount: 10000, jurors: { create: [{ userId: "awa" }, { userId: "nadia" }, { userId: "ibrahim" }] } },
    });
    // Awa mentors Kossi.
    await prisma.pair.create({ data: { mentorId: "awa", menteeId: "kossi", project: "API" } });
    const k = await prisma.submission.create({ data: { challengeId: "d", userId: "kossi", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40), payoutOperator: "Moov Money", payoutPhone: "+22890000000" } });
    const y = await prisma.submission.create({ data: { challengeId: "d", userId: "yao", repoUrl: "https://github.com/y/r", explanation: "x".repeat(40), payoutOperator: "Moov Money", payoutPhone: "+22890000001" } });
    return { k, y };
  }
  const marks = { works: 4, code: 4, tests: 4, explain: 4 };

  it("un juré ne note pas la solution de quelqu’un qu’il accompagne", async () => {
    const { k } = await challengeInJury();
    await refused(scoreSubmission("awa", "d", { submissionId: k.id, ...marks }, prisma), "forbidden");
  });

  it("publier deux fois en même temps ne crée qu’une série de versements", async () => {
    const { k, y } = await challengeInJury();
    for (const j of ["nadia", "ibrahim"]) for (const s of [k, y]) await scoreSubmission(j, "d", { submissionId: s.id, ...marks }, prisma);
    await scoreSubmission("awa", "d", { submissionId: y.id, ...marks }, prisma);
    const results = await Promise.allSettled([publishResults("equipe", "d", prisma), publishResults("equipe", "d", prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.payout.count()).toBeGreaterThan(0);
    expect(await prisma.payout.groupBy({ by: ["role"], _count: { _all: true } })).toEqual(expect.not.arrayContaining([expect.objectContaining({ _count: { _all: 2 } })]));
  });
});

describe("comptes", () => {
  it("GitHub : un compte créé avec l’adresse d’autrui sans la confirmer perd son mot de passe et ses sessions à la liaison", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { passwordHash: "hash-de-l-attaquant", emailVerifiedAt: null } });
    const { token } = await createSession("kossi", prisma);
    const { user } = await signInWithGithub({ githubId: 42, login: "kossi", name: "Kossi", email: "kossi@test.kabad", profile: "github.com/kossi" }, prisma);
    expect(user.passwordHash).toBeNull();
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(await userFromToken(token, prisma)).toBeNull();
  });

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
