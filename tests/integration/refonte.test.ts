import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { answerBooking, bookSlot, eligibility, getMentor, saveAvailability } from "@/server/mentoring";
import { requestBadge, reviewBadge } from "@/server/badges";
import { answerJoinRequest, getHackathon, publishResults, register, scoreSubmission, submitSolution } from "@/server/hackathons";
import { createTestApp, joinTest, leaveTest, setStep } from "@/server/community-tests";
import { leaveGroup, listConversations } from "@/server/messaging";
import { addPost, createProject, joinProject } from "@/server/rise";
import { sendVerificationEmail, verifyEmailCode } from "@/server/account";
import { makeUsers, prisma, resetDb } from "./helpers";

async function refused(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(DomainError);
  await expect(p).rejects.toMatchObject({ code });
}

const DAY = 86_400_000;

beforeEach(async () => {
  await resetDb();
  await makeUsers("Kossi", "Yao", "Fatou", "Awa", "Nadia", "Ibrahim", "Aicha", "Equipe");
  await prisma.user.update({ where: { id: "equipe" }, data: { isAdmin: true } });
  for (const id of ["awa", "nadia", "ibrahim", "aicha"]) await prisma.user.update({ where: { id }, data: { role: "SENIOR", seniorVerifiedAt: new Date() } });
});
afterAll(() => prisma.$disconnect());

/** Awa opens every day from 09:00 to 18:00, Lomé time (UTC). */
async function awaOpensEveryDay() {
  await saveAvailability("awa", { timeZone: "Africa/Lome", ranges: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, startMin: 9 * 60, endMin: 18 * 60 })), blocked: [] }, prisma);
  const { slots } = await getMentor("awa", prisma);
  return slots;
}
const booking = (startsAt: string) => ({ mentorId: "awa", startsAt, topic: "Webhooks", problem: "Je ne sais pas gérer les confirmations en retard." });

describe("mentorat par créneaux", () => {
  it("deux membres qui réservent le même créneau au même instant : un seul l’obtient", async () => {
    const [slot] = await awaOpensEveryDay();
    const results = await Promise.allSettled([bookSlot("kossi", booking(slot), prisma), bookSlot("yao", booking(slot), prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failure = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ code: "slot_taken" });
  });

  it("refuse un créneau que le mentor n’a pas ouvert, et ses propres créneaux", async () => {
    await awaOpensEveryDay();
    const night = new Date(Date.now() + 3 * DAY);
    night.setUTCHours(2, 0, 0, 0);
    await refused(bookSlot("kossi", booking(night.toISOString()), prisma), "bad_slot");
    await refused(bookSlot("awa", booking(night.toISOString()), prisma), "self");
  });

  it("une séance acceptée donne un lien de visio et compte une fois passée", async () => {
    const [slot] = await awaOpensEveryDay();
    const { id } = await bookSlot("kossi", booking(slot), prisma);
    const { meetingUrl } = await answerBooking("awa", id, { accept: true }, prisma);
    expect(meetingUrl).toMatch(/^https:\/\/meet\.jit\.si\//);
    expect((await eligibility("kossi", 30, prisma)).eligible).toBe(false);
    await prisma.mentoringBooking.update({ where: { id }, data: { startsAt: new Date(Date.now() - DAY) } });
    expect((await eligibility("kossi", 30, prisma)).eligible).toBe(true);
    await refused(answerBooking("awa", id, { accept: false }, prisma), "answered");
  });
});

describe("badge mentor", () => {
  const input = { domains: ["Backend"], technologies: ["Node.js"], experience: "5-10" as const, jobTitle: "Lead backend", githubUrl: "https://github.com/kossi", bio: "Je construis des API depuis cinq ans.", topics: "Concevoir une API." };

  it("exige un lien, puis fait du membre un mentor une fois validé", async () => {
    await refused(requestBadge("kossi", { ...input, githubUrl: undefined }, prisma), "links");
    const { id } = await requestBadge("kossi", input, prisma);
    await refused(reviewBadge("kossi", id, { approve: true }, prisma), "forbidden");
    await refused(reviewBadge("equipe", id, { approve: false }, prisma), "reason");
    await reviewBadge("equipe", id, { approve: true }, prisma);
    const kossi = await prisma.user.findUniqueOrThrow({ where: { id: "kossi" } });
    expect(kossi.seniorVerifiedAt).not.toBeNull();
    expect(kossi.role).toBe("SENIOR");
    await refused(reviewBadge("equipe", id, { approve: true }, prisma), "reviewed");
  });
});

describe("hackathons", () => {
  async function hackathon(extra: Record<string, unknown> = {}) {
    await prisma.hackathon.create({
      data: {
        id: "h",
        title: "Fintech",
        organizerName: "FinLab",
        format: "ONLINE",
        startsAt: new Date(Date.now() - DAY),
        endsAt: new Date(Date.now() + DAY),
        closesAt: new Date(Date.now() + DAY / 2),
        teamMin: 1,
        teamMax: 2,
        level: "Tous niveaux",
        stack: "Web",
        description: "Un service pour les commerçants.",
        publishedAt: new Date(),
        ...extra,
      },
    });
  }

  it("un membre n’est que dans une équipe, et une équipe pleine refuse les nouvelles demandes", async () => {
    await hackathon();
    const { teamId } = (await register("kossi", "h", { mode: "create", teamName: "Baobab" }, prisma)) as { teamId: string };
    await refused(register("kossi", "h", { mode: "solo" }, prisma), "already_in");
    const { requestId } = (await register("yao", "h", { mode: "join", teamId }, prisma)) as { requestId: string };
    await answerJoinRequest("kossi", requestId, true, prisma);
    await refused(register("fatou", "h", { mode: "join", teamId }, prisma), "full");
    expect((await getHackathon("yao", "h", prisma)).myTeam?.members).toHaveLength(2);
  });

  it("un juré ne note pas l’équipe d’un membre qu’il a accompagné en séance", async () => {
    await hackathon({ status: "JURY", endsAt: new Date(Date.now() - 1000), jurors: { create: [{ userId: "awa" }, { userId: "nadia" }, { userId: "ibrahim" }] } });
    await prisma.team.create({ data: { id: "t", hackathonId: "h", name: "Baobab", captainId: "kossi", members: { create: { userId: "kossi", hackathonId: "h" } } } });
    const sub = await prisma.submission.create({ data: { hackathonId: "h", teamId: "t", projectName: "P", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40) } });
    await prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "kossi", startsAt: new Date(Date.now() - 3 * DAY), topic: "API", problem: "…", status: "ACCEPTED" } });
    await refused(scoreSubmission("awa", "h", { submissionId: sub.id, works: 4, code: 4, tests: 4, explain: 4 }, prisma), "forbidden");
  });

  it("partage le gain 90/10 sans mentorat exigé, 60/30/10 avec, et une seule fois", async () => {
    await hackathon({ prizeKind: "SPONSORISE", sponsorAmount: 100_000, mentoringMinutes: 30, jurors: { create: [{ userId: "nadia" }, { userId: "ibrahim" }, { userId: "aicha" }] } });
    await prisma.mentoringBooking.create({ data: { mentorId: "awa", menteeId: "kossi", startsAt: new Date(Date.now() - 3 * DAY), topic: "API", problem: "…", status: "ACCEPTED" } });
    await register("kossi", "h", { mode: "solo" }, prisma);
    await submitSolution("kossi", "h", { projectName: "Momo", repoUrl: "https://github.com/k/r", explanation: "x".repeat(40), payoutOperator: "Wave", payoutPhone: "+22890000000" }, prisma);
    await prisma.hackathon.update({ where: { id: "h" }, data: { status: "JURY" } });
    const sub = await prisma.submission.findFirstOrThrow();
    for (const j of ["nadia", "ibrahim", "aicha"]) await scoreSubmission(j, "h", { submissionId: sub.id, works: 4, code: 4, tests: 4, explain: 4 }, prisma);
    const results = await Promise.allSettled([publishResults("equipe", "h", prisma), publishResults("equipe", "h", prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const payouts = Object.fromEntries((await prisma.payout.findMany()).map((p) => [p.role, p.amount]));
    expect(payouts).toEqual({ WINNER: 60_000, MENTOR: 30_000, PLATFORM: 10_000 });
  });
});

describe("tests communautaires", () => {
  it("les places sont limitées et seules les étapes connues se cochent", async () => {
    await prisma.testApp.create({ data: { id: "app", ownerId: "awa", name: "Marché Vert", platforms: ["ANDROID"], url: "https://x.tg", minutes: 10, slots: 1, pitch: "p", task: "t", steps: ["Créer un compte", "Commander"], questions: [] } });
    await joinTest("kossi", "app", prisma);
    await refused(joinTest("yao", "app", prisma), "full");
    expect((await setStep("kossi", "app", 1, true, prisma)).doneSteps).toEqual([1]);
    await refused(setStep("kossi", "app", 5, true, prisma), "step");
    await refused(setStep("yao", "app", 0, true, prisma), "forbidden");
  });

  it("deux inscriptions simultanées ne prennent pas deux fois la dernière place", async () => {
    await prisma.testApp.create({ data: { id: "app", ownerId: "awa", name: "Kalo", platforms: ["WEB"], url: "https://x.tg", minutes: 10, slots: 1, pitch: "p", task: "t", steps: ["Créer"], questions: [] } });
    const results = await Promise.allSettled([joinTest("kossi", "app", prisma), joinTest("yao", "app", prisma)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.testParticipant.count({ where: { testAppId: "app" } })).toBe(1);
  });

  it("l’auteur ouvre le groupe de testeurs à la publication ; il suit le test dans la messagerie", async () => {
    const app = { name: "Kalo", platforms: ["WEB" as const], url: "https://kalo.tg", minutes: 10, slots: 5, pitch: "p", task: "t", steps: ["Ajouter une dépense"], questions: [] };
    const { id, conversationId } = await createTestApp("awa", app, prisma);
    expect(await listConversations("awa", prisma)).toEqual([expect.objectContaining({ id: conversationId, title: "Testeurs Kalo", kind: "GROUP", isOwner: true })]);

    expect((await joinTest("kossi", id, prisma)).conversationId).toBe(conversationId);
    expect((await listConversations("kossi", prisma)).map((c) => c.id)).toEqual([conversationId]);
    // On entre et on sort du groupe par le test, pas par la messagerie : l’auteur ne peut pas le perdre.
    await refused(leaveGroup("awa", conversationId, prisma), "community_group");
    await refused(leaveGroup("kossi", conversationId, prisma), "community_group");
    await leaveTest("kossi", id, prisma);
    expect(await listConversations("kossi", prisma)).toHaveLength(0);
    expect(await listConversations("awa", prisma)).toHaveLength(1);
  });

  it("une application publiée sans groupe en reçoit un, ouvert par son auteur, avec les testeurs déjà inscrits", async () => {
    await prisma.testApp.create({ data: { id: "ancienne", ownerId: "awa", name: "Tontine", platforms: ["WEB"], url: "https://x.tg", minutes: 10, slots: 5, pitch: "p", task: "t", steps: ["Créer"], questions: [], participants: { create: { userId: "fatou" } } } });
    const [first, again] = await Promise.all([joinTest("kossi", "ancienne", prisma), joinTest("yao", "ancienne", prisma)]);
    expect(again.conversationId).toBe(first.conversationId);
    const group = await prisma.conversation.findUniqueOrThrow({ where: { id: first.conversationId }, include: { members: true } });
    expect(group.createdById).toBe("awa");
    expect(group.members.map((m) => m.userId).sort()).toEqual(["awa", "fatou", "kossi", "yao"]);
  });
});

describe("Africa Rise-Up", () => {
  it("un projet ouvre son canal ; seuls les membres écrivent dans la discussion", async () => {
    const { id } = await createProject("yao", { name: "Forages au Sahel", domain: "WATER", summary: "Une carte des forages.", problem: "x".repeat(40), skills: [] }, prisma);
    await refused(addPost("kossi", id, { body: "Bonjour" }, prisma), "forbidden");
    await joinProject("kossi", id, {}, prisma);
    await addPost("kossi", id, { body: "Bonjour" }, prisma);
    const p = await prisma.riseProject.findUniqueOrThrow({ where: { id }, include: { conversation: { include: { members: true } } } });
    expect(p.conversation?.members.map((m) => m.userId).sort()).toEqual(["kossi", "yao"]);
  });
});

describe("confirmation de l’e-mail par code", () => {
  it("bloque le code après cinq erreurs", async () => {
    await prisma.user.update({ where: { id: "kossi" }, data: { emailVerifiedAt: null } });
    await sendVerificationEmail("kossi", prisma);
    for (let i = 0; i < 5; i++) await refused(verifyEmailCode("kossi", "000000", prisma).catch(async (e) => {
      // The real code could be 000000: one chance in a million, skip the check then.
      if ((await prisma.user.findUniqueOrThrow({ where: { id: "kossi" } })).emailVerifiedAt) return;
      throw e;
    }), "bad_code");
    await refused(verifyEmailCode("kossi", "123456", prisma), "locked");
  });
});
