/*
 * Community tests: a member publishes an app with a short scenario and control questions.
 * Publishing opens the testers' group in the author's messaging, with the install link; the author runs it.
 * Other members join this group by joining the test (and leave it by leaving the test), tick the steps as they go,
 * then send a report with one screenshot per step. The owner reads each report, then validates or
 * refuses it with a reason. Places are limited to the number of testers wanted.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { joinCommunityGroup, leaveCommunityGroup, openCommunityGroup } from "./messaging";
import { pushNotifications } from "./notifications";
import type { TestAppDetail, TestAppSummary, TestQuestion, TestReportView } from "@/lib/domain-types";

export const SCREENSHOT_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
};

/** Answers are compared without accents, case or extra spaces: "le Gombo " matches "Le gombo". */
export const normalizeAnswer = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const appInclude = {
  owner: { select: { id: true, name: true, city: true } },
  reports: { select: { testerId: true, status: true } },
  participants: { select: { userId: true, doneSteps: true, user: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
} as const;
type AppRow = Prisma.TestAppGetPayload<{ include: typeof appInclude }>;

function toSummary(a: AppRow, viewerId: string | null): TestAppSummary {
  const me = a.participants.find((p) => p.userId === viewerId);
  return {
    id: a.id,
    name: a.name,
    platforms: a.platforms,
    url: a.url,
    minutes: a.minutes,
    slots: a.slots,
    slotsLeft: Math.max(0, a.slots - a.participants.length),
    pitch: a.pitch,
    task: a.task,
    owner: a.owner,
    reportsCount: a.reports.length,
    toRead: a.reports.filter((r) => r.status === "SUBMITTED").length,
    myReport: a.reports.find((r) => r.testerId === viewerId)?.status ?? null,
    testers: a.participants.length,
    joined: me !== undefined,
    stepsCount: a.steps.length,
    myDoneSteps: me?.doneSteps ?? [],
  };
}

export async function listTestApps(viewerId: string, prisma: Db = db) {
  const rows = await prisma.testApp.findMany({ where: { active: true }, include: appInclude, orderBy: { createdAt: "desc" } });
  const all = rows.map((a) => toSummary(a, viewerId));
  return {
    toTest: all.filter((a) => a.owner.id !== viewerId && !a.joined),
    testing: all.filter((a) => a.joined),
    mine: all.filter((a) => a.owner.id === viewerId),
  };
}

export async function getTestApp(viewerId: string, id: string, prisma: Db = db): Promise<TestAppDetail> {
  const a = await prisma.testApp.findUnique({ where: { id }, include: appInclude });
  if (!a || (!a.active && a.ownerId !== viewerId)) throw notFound("Application introuvable.");
  const questions = (a.questions as TestQuestion[]).map(({ q, options }) => (options ? { q, options } : { q }));
  const summary = toSummary(a, viewerId);
  return {
    ...summary,
    steps: a.steps,
    questions,
    // The group (and its install link) is for testers and the owner.
    conversationId: summary.joined || a.ownerId === viewerId ? a.conversationId : null,
    testerAvatars: a.participants.slice(0, 3).map((p) => p.user),
  };
}

export async function createTestApp(
  ownerId: string,
  input: { name: string; platforms: Array<"WEB" | "ANDROID" | "IOS">; url: string; minutes: number; slots: number; pitch: string; task: string; steps: string[]; questions: TestQuestion[] },
  prisma: Db = db,
) {
  for (const q of input.questions) {
    if (q.options && !q.options.some((o) => normalizeAnswer(o) === normalizeAnswer(q.answer))) {
      throw new DomainError("answer", `La bonne réponse de « ${q.q} » doit faire partie des choix.`);
    }
  }
  return prisma.$transaction(async (tx) => {
    const conversationId = await openTestersGroup(tx, { ownerId, name: input.name, url: input.url });
    const a = await tx.testApp.create({ data: { ownerId, ...input, questions: input.questions, conversationId } });
    return { id: a.id, conversationId };
  });
}

/** The author opens the testers' group: it appears in their messaging, with the install link. */
async function openTestersGroup(tx: Prisma.TransactionClient, app: { ownerId: string; name: string; url: string }) {
  const owner = await tx.user.findUniqueOrThrow({ where: { id: app.ownerId }, select: { name: true } });
  return openCommunityGroup(tx, {
    name: `Testeurs ${app.name}`,
    theme: "Test",
    ownerId: app.ownerId,
    intro: `${owner.name.split(" ")[0]} a ouvert le groupe de test. Installer l’app : ${app.url}`,
  });
}

/**
 * Returns the app's testers' group. An app left without one (published before the groups existed)
 * gets it now, opened by its author, with the testers already registered. The caller holds the app's lock.
 */
async function testersGroup(tx: Prisma.TransactionClient, a: { id: string; ownerId: string; name: string; url: string; conversationId: string | null }) {
  if (a.conversationId) return a.conversationId;
  const conversationId = await openTestersGroup(tx, a);
  await tx.testApp.update({ where: { id: a.id }, data: { conversationId } });
  const testers = await tx.testParticipant.findMany({ where: { testAppId: a.id }, select: { userId: true }, orderBy: { joinedAt: "asc" } });
  for (const t of testers) await joinCommunityGroup(tx, conversationId, t.userId);
  return conversationId;
}

/** Takes one of the places and opens the testers' group. */
export async function joinTest(userId: string, testAppId: string, prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    // The app's row is locked first: two simultaneous joins can neither take the last place twice nor open two groups.
    await tx.$queryRaw`SELECT id FROM "TestApp" WHERE id = ${testAppId} FOR UPDATE`;
    const a = await tx.testApp.findUnique({ where: { id: testAppId }, include: { _count: { select: { participants: true } }, participants: { where: { userId }, select: { userId: true } } } });
    if (!a || !a.active) throw notFound("Application introuvable.");
    if (a.ownerId === userId) throw forbidden("Tu ne peux pas tester ta propre application.");
    const already = a.participants.length > 0;
    if (!already && a._count.participants >= a.slots) throw new DomainError("full", "Toutes les places de test sont prises.", 409);
    if (!already) await tx.testParticipant.create({ data: { testAppId, userId } });
    // A tester already registered but missing from the group (older data) is added back.
    const conversationId = await testersGroup(tx, a);
    await joinCommunityGroup(tx, conversationId, userId);
    if (!already) {
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      await pushNotifications(tx, [{ userId: a.ownerId, actor: me.name, key: "testJoined", params: { title: a.name }, href: `/tests/${a.id}`, icon: "users", tone: "brand" }]);
    }
    return { conversationId };
  });
}

/** Gives the place back, as long as no report was sent. */
export async function leaveTest(userId: string, testAppId: string, prisma: Db = db) {
  const a = await prisma.testApp.findUnique({ where: { id: testAppId }, select: { conversationId: true, reports: { where: { testerId: userId }, select: { id: true } } } });
  if (!a) throw notFound("Application introuvable.");
  if (a.reports.length) throw new DomainError("reported", "Tu as déjà envoyé un rapport : ta place est comptée.", 409);
  return prisma.$transaction(async (tx) => {
    await tx.testParticipant.deleteMany({ where: { testAppId, userId } });
    if (a.conversationId) await leaveCommunityGroup(tx, a.conversationId, userId);
    return { ok: true };
  });
}

/** Ticks or unticks a step of the scenario. */
export async function setStep(userId: string, testAppId: string, index: number, done: boolean, prisma: Db = db) {
  const p = await prisma.testParticipant.findUnique({ where: { testAppId_userId: { testAppId, userId } }, include: { testApp: { select: { steps: true } } } });
  if (!p) throw forbidden("Rejoins d’abord le groupe de testeurs.");
  if (!Number.isInteger(index) || index < 0 || index >= p.testApp.steps.length) throw new DomainError("step", "Étape inconnue.");
  const set = new Set(p.doneSteps);
  if (done) set.add(index);
  else set.delete(index);
  const doneSteps = [...set].sort((x, y) => x - y);
  await prisma.testParticipant.update({ where: { testAppId_userId: { testAppId, userId } }, data: { doneSteps } });
  return { doneSteps };
}

export type ScreenshotInput = { mime: string; data: Uint8Array };

export async function submitReport(testerId: string, testAppId: string, input: { device: string; answers: string[]; remarks: string }, screenshots: ScreenshotInput[], prisma: Db = db) {
  const a = await prisma.testApp.findUnique({ where: { id: testAppId }, include: { reports: { select: { testerId: true, status: true } }, participants: { where: { userId: testerId }, select: { userId: true } } } });
  if (!a || !a.active) throw notFound("Application introuvable.");
  if (a.ownerId === testerId) throw forbidden("Tu ne peux pas tester ta propre application.");
  if (!a.participants.length) throw forbidden("Rejoins d’abord le groupe de testeurs.");
  const mine = a.reports.find((r) => r.testerId === testerId);
  if (mine && mine.status !== "REFUSED") throw new DomainError("already_sent", "Tu as déjà envoyé un rapport pour cette application.", 409);

  const questions = a.questions as TestQuestion[];
  if (input.answers.length !== questions.length) throw new DomainError("answers", "Réponds aux questions de contrôle.");
  if (screenshots.length !== a.steps.length) throw new DomainError("screenshots", `Ajoute ${a.steps.length} captures, une par étape du scénario.`);
  for (const s of screenshots) {
    const check = IMAGE_TYPES[s.mime];
    if (!check || !check(s.data)) throw new DomainError("screenshots", "Les captures doivent être des images PNG, JPEG ou WebP.");
    if (s.data.byteLength > SCREENSHOT_MAX_BYTES) throw new DomainError("screenshots", "Chaque capture fait 2 Mo au plus.");
  }
  const answers = questions.map((q, i) => ({ question: q.q, answer: input.answers[i], correct: normalizeAnswer(input.answers[i]) === normalizeAnswer(q.answer) }));
  const tester = await prisma.user.findUniqueOrThrow({ where: { id: testerId }, select: { name: true } });

  return prisma.$transaction(async (tx) => {
    // A refused report can be redone: the old one is replaced.
    if (mine) await tx.testReport.delete({ where: { testAppId_testerId: { testAppId, testerId } } });
    const r = await tx.testReport.create({
      data: {
        testAppId,
        testerId,
        device: input.device,
        answers,
        remarks: input.remarks,
        screenshots: { create: screenshots.map((s, position) => ({ position, mime: s.mime, data: Buffer.from(s.data) })) },
      },
    });
    await pushNotifications(tx, [{ userId: a.ownerId, actor: tester.name, key: "testReport", params: { title: a.name }, href: `/tests/${a.id}/rapports`, icon: "check", tone: "brand" }]);
    return { id: r.id };
  });
}

export async function listReports(ownerId: string, testAppId: string, prisma: Db = db): Promise<{ app: TestAppSummary; reports: TestReportView[] }> {
  const a = await prisma.testApp.findUnique({ where: { id: testAppId }, include: appInclude });
  if (!a) throw notFound("Application introuvable.");
  if (a.ownerId !== ownerId) throw forbidden("Seul le porteur de l’application lit ses rapports.");
  const rows = await prisma.testReport.findMany({
    where: { testAppId },
    include: { tester: { select: { id: true, name: true } }, _count: { select: { screenshots: true } } },
    // Reports to read first, then the newest.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return {
    app: toSummary(a, ownerId),
    reports: rows.map((r) => ({
      id: r.id,
      tester: r.tester,
      device: r.device,
      createdAt: r.createdAt.toISOString(),
      answers: r.answers as TestReportView["answers"],
      remarks: r.remarks,
      status: r.status,
      refusalReason: r.refusalReason,
      screenshots: r._count.screenshots,
    })),
  };
}

export async function reviewReport(ownerId: string, reportId: string, decision: { validate: true } | { validate: false; reason: string }, prisma: Db = db) {
  const r = await prisma.testReport.findUnique({ where: { id: reportId }, include: { testApp: { select: { ownerId: true, name: true, id: true } }, tester: { select: { id: true } } } });
  if (!r || r.testApp.ownerId !== ownerId) throw notFound("Rapport introuvable.");
  if (r.status !== "SUBMITTED") throw new DomainError("already_reviewed", "Tu as déjà traité ce rapport.", 409);
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });
  return prisma.$transaction(async (tx) => {
    await tx.testReport.update({
      where: { id: reportId },
      data: decision.validate ? { status: "VALIDATED", reviewedAt: new Date() } : { status: "REFUSED", refusalReason: decision.reason, reviewedAt: new Date() },
    });
    await pushNotifications(tx, [
      decision.validate
        ? { userId: r.testerId, actor: owner.name, key: "testReportValidated", params: { title: r.testApp.name }, href: `/tests/${r.testApp.id}`, icon: "check", tone: "success" }
        : { userId: r.testerId, actor: owner.name, key: "testReportRefused", params: { title: r.testApp.name, reason: decision.reason }, href: `/tests/${r.testApp.id}`, icon: "check", tone: "neutral" },
    ]);
    return { ok: true };
  });
}

/** Screenshots are readable by the tester and the app owner only. */
export async function getScreenshot(viewerId: string, reportId: string, position: number, prisma: Db = db) {
  const s = await prisma.screenshot.findUnique({ where: { reportId_position: { reportId, position } }, include: { report: { select: { testerId: true, testApp: { select: { ownerId: true } } } } } });
  if (!s || (s.report.testerId !== viewerId && s.report.testApp.ownerId !== viewerId)) throw notFound("Capture introuvable.");
  return { mime: s.mime, data: s.data };
}

/** Validated tests count on the tester's profile. */
export async function validatedTests(userId: string, prisma: Db = db) {
  return prisma.testReport.count({ where: { testerId: userId, status: "VALIDATED" } });
}
