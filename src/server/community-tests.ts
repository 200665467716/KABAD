/*
 * Community tests: a member publishes an app with a short scenario and control questions;
 * other members test it for free and send a report with one screenshot per step.
 * The owner reads each report, then validates or refuses it with a reason.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
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
} as const;
type AppRow = Prisma.TestAppGetPayload<{ include: typeof appInclude }>;

function toSummary(a: AppRow, viewerId: string | null): TestAppSummary {
  const counted = a.reports.filter((r) => r.status !== "REFUSED").length;
  return {
    id: a.id,
    name: a.name,
    platform: a.platform,
    url: a.url,
    minutes: a.minutes,
    slots: a.slots,
    slotsLeft: Math.max(0, a.slots - counted),
    pitch: a.pitch,
    task: a.task,
    owner: a.owner,
    reportsCount: a.reports.length,
    toRead: a.reports.filter((r) => r.status === "SUBMITTED").length,
    myReport: a.reports.find((r) => r.testerId === viewerId)?.status ?? null,
  };
}

export async function listTestApps(viewerId: string, prisma: Db = db) {
  const rows = await prisma.testApp.findMany({ where: { active: true }, include: appInclude, orderBy: { createdAt: "desc" } });
  const all = rows.map((a) => toSummary(a, viewerId));
  return { toTest: all.filter((a) => a.owner.id !== viewerId), mine: all.filter((a) => a.owner.id === viewerId) };
}

export async function getTestApp(viewerId: string, id: string, prisma: Db = db): Promise<TestAppDetail> {
  const a = await prisma.testApp.findUnique({ where: { id }, include: appInclude });
  if (!a || (!a.active && a.ownerId !== viewerId)) throw notFound("Application introuvable.");
  const questions = (a.questions as TestQuestion[]).map(({ q, options }) => (options ? { q, options } : { q }));
  return { ...toSummary(a, viewerId), steps: a.steps, questions };
}

export async function createTestApp(
  ownerId: string,
  input: { name: string; platform: "WEB" | "ANDROID"; url: string; minutes: number; slots: number; pitch: string; task: string; steps: string[]; questions: TestQuestion[] },
  prisma: Db = db,
) {
  for (const q of input.questions) {
    if (q.options && !q.options.some((o) => normalizeAnswer(o) === normalizeAnswer(q.answer))) {
      throw new DomainError("answer", `La bonne réponse de « ${q.q} » doit faire partie des choix.`);
    }
  }
  const a = await prisma.testApp.create({ data: { ownerId, ...input, questions: input.questions } });
  return { id: a.id };
}

export type ScreenshotInput = { mime: string; data: Uint8Array };

export async function submitReport(testerId: string, testAppId: string, input: { device: string; answers: string[]; remarks: string }, screenshots: ScreenshotInput[], prisma: Db = db) {
  const a = await prisma.testApp.findUnique({ where: { id: testAppId }, include: { reports: { select: { testerId: true, status: true } }, owner: { select: { id: true } } } });
  if (!a || !a.active) throw notFound("Application introuvable.");
  if (a.ownerId === testerId) throw forbidden("Vous ne pouvez pas tester votre propre application.");
  const mine = a.reports.find((r) => r.testerId === testerId);
  if (mine && mine.status !== "REFUSED") throw new DomainError("already_sent", "Vous avez déjà envoyé un rapport pour cette application.", 409);
  if (!mine && a.reports.filter((r) => r.status !== "REFUSED").length >= a.slots) throw new DomainError("full", "Toutes les places de test sont prises.", 409);

  const questions = a.questions as TestQuestion[];
  if (input.answers.length !== questions.length) throw new DomainError("answers", "Répondez aux questions de contrôle.");
  if (screenshots.length !== a.steps.length) throw new DomainError("screenshots", `Ajoutez ${a.steps.length} captures, une par étape du scénario.`);
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
    await pushNotifications(tx, [{ userId: a.ownerId, actor: tester.name, text: `a envoyé un rapport de test sur « ${a.name} ».`, href: `/tests/${a.id}/rapports`, icon: "check", tone: "brand" }]);
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
  if (r.status !== "SUBMITTED") throw new DomainError("already_reviewed", "Vous avez déjà traité ce rapport.", 409);
  const owner = await prisma.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });
  return prisma.$transaction(async (tx) => {
    await tx.testReport.update({
      where: { id: reportId },
      data: decision.validate ? { status: "VALIDATED", reviewedAt: new Date() } : { status: "REFUSED", refusalReason: decision.reason, reviewedAt: new Date() },
    });
    await pushNotifications(tx, [
      decision.validate
        ? { userId: r.testerId, actor: owner.name, text: `a validé votre rapport de test sur « ${r.testApp.name} ».`, href: `/tests/${r.testApp.id}`, icon: "check", tone: "success" }
        : { userId: r.testerId, actor: owner.name, text: `a refusé votre rapport sur « ${r.testApp.name} » : ${decision.reason}`, href: `/tests/${r.testApp.id}`, icon: "check", tone: "neutral" },
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
