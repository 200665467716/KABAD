/*
 * Challenge rules, enforced on the server:
 * - a challenge closes at its deadline and goes to the jury; solutions can be edited until then;
 * - cash-prize challenges that require mentoring accept only members with 6 h of confirmed mentoring;
 * - three verified seniors score each solution anonymously on 4 criteria; the mark is the average of their totals;
 * - publishing the results splits the pot 60/30/10 (winner, winner's mentor, KABAD);
 *   transfers are sent by Mobile Money after a 48 h contest period, then marked as sent with their reference.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { eligibility } from "./mentoring";
import { pushNotifications, type NotificationInput } from "./notifications";
import { averageMark, totalScore } from "@/lib/jury";
import { splitPrize } from "@/lib/prize";
import { REQUIRED_MENTORING_MINUTES } from "@/lib/mentoring";
import { formatDuration, formatFCFA } from "@/lib/format";
import type { ChallengeDetail, ChallengeResults, ChallengeSummary, ContributionView, JuryItem, PayoutView, RankingRow } from "@/lib/domain-types";

export const CONTEST_HOURS = 48;

/** Challenges past their deadline move to the jury. Cheap and idempotent: run before reading. */
export async function syncStatuses(prisma: Db = db) {
  await prisma.challenge.updateMany({ where: { status: "OPEN", closesAt: { lte: new Date() } }, data: { status: "JURY" } });
}

type Totals = { pot: number; contributors: number; companies: number; participants: number };

async function totals(ids: string[], prisma: Db): Promise<Map<string, Totals>> {
  const [challenges, paid, companies, participants] = await Promise.all([
    prisma.challenge.findMany({ where: { id: { in: ids } }, select: { id: true, sponsorAmount: true, sponsorName: true } }),
    prisma.contribution.groupBy({ by: ["challengeId"], where: { challengeId: { in: ids }, status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.contribution.groupBy({ by: ["challengeId"], where: { challengeId: { in: ids }, status: "PAID", company: true }, _count: { _all: true } }),
    prisma.submission.groupBy({ by: ["challengeId"], where: { challengeId: { in: ids } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, Totals>();
  for (const c of challenges) {
    const sponsor = c.sponsorAmount > 0 ? 1 : 0;
    out.set(c.id, { pot: c.sponsorAmount, contributors: sponsor, companies: c.sponsorName ? 1 : 0, participants: 0 });
  }
  for (const p of paid) {
    const t = out.get(p.challengeId)!;
    t.pot += p._sum.amount ?? 0;
    t.contributors += p._count._all;
  }
  for (const c of companies) out.get(c.challengeId)!.companies += c._count._all;
  for (const s of participants) out.get(s.challengeId)!.participants = s._count._all;
  return out;
}

const summarySelect = {
  id: true,
  title: true,
  kind: true,
  status: true,
  level: true,
  stack: true,
  closesAt: true,
  resultsAt: true,
  requiresMentoring: true,
  prizeLabel: true,
  sponsorName: true,
} as const;
type SummaryRow = Prisma.ChallengeGetPayload<{ select: typeof summarySelect }>;

async function summaries(rows: SummaryRow[], prisma: Db): Promise<ChallengeSummary[]> {
  const t = await totals(rows.map((r) => r.id), prisma);
  const done = rows.filter((r) => r.status === "DONE").map((r) => r.id);
  const winners = new Map<string, { name: string; city: string }>();
  for (const id of done) {
    const top = (await ranking(id, prisma))[0];
    if (top) winners.set(id, { name: top.name, city: top.city });
  }
  return rows.map((r) => ({
    ...r,
    closesAt: r.closesAt.toISOString(),
    resultsAt: r.resultsAt?.toISOString() ?? null,
    ...t.get(r.id)!,
    winner: winners.get(r.id) ?? null,
  }));
}

export async function listChallenges(prisma: Db = db): Promise<ChallengeSummary[]> {
  await syncStatuses(prisma);
  const rows = await prisma.challenge.findMany({ select: summarySelect, orderBy: { closesAt: "asc" } });
  return summaries(rows, prisma);
}

export async function getChallenge(userId: string | null, id: string, prisma: Db = db): Promise<ChallengeDetail> {
  await syncStatuses(prisma);
  const c = await prisma.challenge.findUnique({ where: { id }, select: { ...summarySelect, description: true, jurors: { select: { user: { select: { id: true, name: true } } } } } });
  if (!c) throw notFound("Défi introuvable.");
  const [summary] = await summaries([c], prisma);
  const mine = userId ? await prisma.submission.findUnique({ where: { challengeId_userId: { challengeId: id, userId } } }) : null;
  return {
    ...summary,
    description: c.description,
    jury: c.jurors.map((j) => j.user),
    amJuror: userId !== null && c.jurors.some((j) => j.user.id === userId),
    mySubmission: mine && { repoUrl: mine.repoUrl, demoUrl: mine.demoUrl, explanation: mine.explanation, payoutOperator: mine.payoutOperator, payoutPhone: mine.payoutPhone },
  };
}

const hasCash = (c: { kind: string; sponsorAmount: number }) => c.kind !== "LOT";

export async function submitSolution(
  userId: string,
  challengeId: string,
  input: { repoUrl: string; demoUrl?: string; explanation: string; payoutOperator?: string; payoutPhone?: string },
  prisma: Db = db,
) {
  await syncStatuses(prisma);
  const c = await prisma.challenge.findUnique({ where: { id: challengeId }, include: { jurors: { select: { userId: true } } } });
  if (!c) throw notFound("Défi introuvable.");
  if (c.status !== "OPEN") throw new DomainError("closed", "Ce défi est clôturé : les solutions ne sont plus acceptées.", 409);
  if (c.jurors.some((j) => j.userId === userId)) throw forbidden("Vous faites partie du jury de ce défi : vous ne pouvez pas y participer.");
  if (c.requiresMentoring) {
    const e = await eligibility(userId, prisma);
    if (!e.eligible) throw forbidden(`Ce défi demande ${formatDuration(REQUIRED_MENTORING_MINUTES)} de mentorat confirmé. Il vous manque ${formatDuration(e.missing)}.`);
  }
  if (hasCash(c) && (!input.payoutOperator || !input.payoutPhone)) throw new DomainError("payout", "Indiquez le numéro Mobile Money qui recevra votre gain.");
  const data = {
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl || null,
    explanation: input.explanation,
    payoutOperator: hasCash(c) ? input.payoutOperator! : null,
    payoutPhone: hasCash(c) ? input.payoutPhone! : null,
  };
  const s = await prisma.submission.upsert({ where: { challengeId_userId: { challengeId, userId } }, create: { challengeId, userId, ...data }, update: data });
  return { id: s.id };
}

/* Jury */

/** A juror never scores someone they mentor or mentored: the mentor of the winner receives 30 % of the pot. */
async function conflicts(prisma: Db | Prisma.TransactionClient, jurorId: string, userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const pairs = await prisma.pair.findMany({ where: { OR: [{ mentorId: jurorId, menteeId: { in: userIds } }, { menteeId: jurorId, mentorId: { in: userIds } }] }, select: { mentorId: true, menteeId: true } });
  return new Set(pairs.map((p) => (p.mentorId === jurorId ? p.menteeId : p.mentorId)));
}

async function assertJuror(prisma: Db, jurorId: string, challengeId: string) {
  await syncStatuses(prisma);
  const c = await prisma.challenge.findUnique({ where: { id: challengeId }, include: { jurors: { select: { userId: true } } } });
  if (!c) throw notFound("Défi introuvable.");
  if (!c.jurors.some((j) => j.userId === jurorId)) throw forbidden("Cette vue est réservée au jury du défi.");
  return c;
}

/** The next solution this juror has not scored yet. Solutions are anonymous: no name, no country. */
export async function nextForJury(jurorId: string, challengeId: string, prisma: Db = db): Promise<JuryItem> {
  const c = await assertJuror(prisma, jurorId, challengeId);
  const all = await prisma.submission.findMany({ where: { challengeId }, orderBy: { createdAt: "asc" }, select: { id: true, userId: true, repoUrl: true, demoUrl: true, explanation: true, scores: { where: { jurorId }, select: { jurorId: true } } } });
  // Solutions of someone the juror mentors are scored by the other jurors only.
  const recused = await conflicts(prisma, jurorId, all.map((x) => x.userId));
  const subs = all.filter((x) => !recused.has(x.userId));
  const scored = subs.filter((s) => s.scores.length > 0).length;
  const index = subs.findIndex((s) => s.scores.length === 0);
  const next = c.status === "JURY" && index >= 0 ? subs[index] : null;
  return {
    challengeTitle: c.title,
    total: subs.length,
    scored,
    submission: next && { id: next.id, index: index + 1, repoUrl: next.repoUrl, demoUrl: next.demoUrl, explanation: next.explanation },
  };
}

export async function scoreSubmission(jurorId: string, challengeId: string, input: { submissionId: string; works: number; code: number; tests: number; explain: number; comment?: string }, prisma: Db = db) {
  const c = await assertJuror(prisma, jurorId, challengeId);
  if (c.status !== "JURY") throw new DomainError("not_jury", c.status === "OPEN" ? "Le défi n’est pas encore clôturé." : "Les résultats sont déjà publiés.", 409);
  const sub = await prisma.submission.findUnique({ where: { id: input.submissionId }, select: { challengeId: true, userId: true } });
  if (!sub || sub.challengeId !== challengeId) throw notFound("Solution introuvable.");
  if ((await conflicts(prisma, jurorId, [sub.userId])).size) throw forbidden("Vous accompagnez ou avez accompagné l’auteur de cette solution : les autres jurés la notent.");
  const score = { works: input.works, code: input.code, tests: input.tests, explain: input.explain };
  const total = totalScore(score);
  await prisma.juryScore.upsert({
    where: { submissionId_jurorId: { submissionId: input.submissionId, jurorId } },
    create: { submissionId: input.submissionId, jurorId, ...score, comment: input.comment || null },
    update: { ...score, comment: input.comment || null },
  });
  return { total };
}

export async function ranking(challengeId: string, prisma: Db = db): Promise<RankingRow[]> {
  const subs = await prisma.submission.findMany({
    where: { challengeId, scores: { some: {} } },
    select: { userId: true, createdAt: true, user: { select: { name: true, city: true } }, scores: { select: { works: true, code: true, tests: true, explain: true } } },
  });
  return subs
    .map((s) => ({ userId: s.userId, name: s.user.name, city: s.user.city, mark: averageMark(s.scores.map(totalScore)), at: s.createdAt.getTime() }))
    // Equal marks: the earlier solution comes first.
    .sort((a, b) => b.mark - a.mark || a.at - b.at)
    .map(({ at: _at, ...r }) => r);
}

/** The winner's mentor: the senior with whom they confirmed the most mentoring time. */
async function mentorOf(prisma: Db | Prisma.TransactionClient, userId: string) {
  const rows = await prisma.$queryRaw<Array<{ mentorId: string; minutes: bigint }>>`
    SELECT p."mentorId", SUM(s.minutes) AS minutes FROM "Pair" p JOIN "MentoringSession" s ON s."pairId" = p.id
    WHERE p."menteeId" = ${userId} AND s."confirmedByMentor" AND s."confirmedByMentee"
    GROUP BY p."mentorId" ORDER BY minutes DESC LIMIT 1`;
  return rows[0]?.mentorId ?? null;
}

/* Administration */

export async function requireAdmin(userId: string, prisma: Db = db) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!u?.isAdmin) throw forbidden("Action réservée à l’équipe KABAD.");
}

/** Closes a challenge before its deadline. */
export async function closeChallenge(adminId: string, challengeId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const { count } = await prisma.challenge.updateMany({ where: { id: challengeId, status: "OPEN" }, data: { status: "JURY", closesAt: new Date() } });
  if (!count) throw new DomainError("not_open", "Ce défi n’est pas ouvert.", 409);
  await prisma.adminAction.create({ data: { adminId, action: "challenge:close", targetId: challengeId } });
  return { ok: true };
}

/** Publishes the ranking and prepares the 60/30/10 transfers. Every juror must have scored every solution. */
export async function publishResults(adminId: string, challengeId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  await syncStatuses(prisma);
  const c = await prisma.challenge.findUnique({ where: { id: challengeId }, include: { jurors: { select: { userId: true } }, submissions: { select: { id: true, userId: true, payoutOperator: true, payoutPhone: true, _count: { select: { scores: true } } } } } });
  if (!c) throw notFound("Défi introuvable.");
  if (c.status !== "JURY") throw new DomainError("not_jury", "Seul un défi en jury peut publier ses résultats.", 409);
  if (c.submissions.length === 0) throw new DomainError("empty", "Aucune solution n’a été soumise.", 409);
  let missing = 0;
  for (const sub of c.submissions) {
    let required = 0;
    for (const j of c.jurors) if (!(await conflicts(prisma, j.userId, [sub.userId])).size) required += 1;
    if (sub._count.scores < required) missing += 1;
  }
  if (missing) throw new DomainError("unscored", `${missing} solution${missing > 1 ? "s n’ont" : " n’a"} pas encore été notée${missing > 1 ? "s" : ""} par tout le jury.`, 409);

  const rank = await ranking(challengeId, prisma);
  const winner = c.submissions.find((s) => s.userId === rank[0].userId)!;
  const [{ pot }] = [...(await totals([challengeId], prisma)).values()];

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Two clicks, or two admins at once: only one publication creates the transfers.
    const { count } = await tx.challenge.updateMany({ where: { id: challengeId, status: "JURY" }, data: { status: "DONE", publishedAt: now, resultsAt: now } });
    if (!count) throw new DomainError("already_published", "Les résultats sont déjà publiés.", 409);
    const notes: NotificationInput[] = c.submissions
      .filter((s) => s.userId !== winner.userId)
      .map((s) => ({ userId: s.userId, actor: `Défi « ${c.title} »`, text: " : les résultats sont publiés.", href: `/defis/${challengeId}/resultats`, icon: "trophy", tone: "accent" }));
    if (c.kind !== "LOT" && pot > 0) {
      const split = splitPrize(pot);
      const mentorId = await mentorOf(tx, winner.userId);
      // Without a mentor, the mentor's share goes to the winner.
      await tx.payout.createMany({
        data: [
          { challengeId, role: "WINNER", beneficiaryId: winner.userId, amount: split.winner + (mentorId ? 0 : split.mentor), operator: winner.payoutOperator, phone: winner.payoutPhone },
          ...(mentorId ? [{ challengeId, role: "MENTOR" as const, beneficiaryId: mentorId, amount: split.mentor }] : []),
          { challengeId, role: "PLATFORM", amount: split.platform },
        ],
      });
      notes.push({ userId: winner.userId, actor: `Défi « ${c.title} »`, text: ` : vous avez gagné ${formatFCFA(split.winner + (mentorId ? 0 : split.mentor))}. Versement après ${CONTEST_HOURS} h de contestation.`, href: `/defis/${challengeId}/resultats`, icon: "trophy", tone: "accent" });
      if (mentorId) notes.push({ userId: mentorId, actor: `Défi « ${c.title} »`, text: ` : votre binôme a gagné. Votre part : ${formatFCFA(split.mentor)}.`, href: `/defis/${challengeId}/resultats`, icon: "trophy", tone: "accent" });
    } else {
      notes.push({ userId: winner.userId, actor: `Défi « ${c.title} »`, text: " : vous avez gagné ! L’équipe KABAD vous contacte pour le lot.", href: `/defis/${challengeId}/resultats`, icon: "trophy", tone: "accent" });
    }
    await pushNotifications(tx, notes);
    await tx.adminAction.create({ data: { adminId, action: "challenge:publish", targetId: challengeId } });
    return { winnerId: winner.userId };
  });
}

/** Records a Mobile Money transfer made by the team, once the contest period is over. */
export async function markPayoutSent(adminId: string, payoutId: string, reference: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const p = await prisma.payout.findUnique({ where: { id: payoutId }, include: { challenge: { select: { title: true, publishedAt: true, id: true } } } });
  if (!p) throw notFound("Versement introuvable.");
  if (p.status === "SENT") throw new DomainError("already_sent", "Ce versement est déjà marqué comme envoyé.", 409);
  const contestEnds = (p.challenge.publishedAt?.getTime() ?? Infinity) + CONTEST_HOURS * 3600_000;
  if (Date.now() < contestEnds) throw new DomainError("contest", `Attendez la fin des ${CONTEST_HOURS} h de contestation avant de verser.`, 409);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.payout.updateMany({ where: { id: payoutId, status: "PENDING" }, data: { status: "SENT", reference, sentAt: new Date() } });
    if (!count) throw new DomainError("already_sent", "Ce versement est déjà marqué comme envoyé.", 409);
    await tx.adminAction.create({ data: { adminId, action: "payout:sent", targetId: payoutId, details: `${p.amount} F CFA · réf. ${reference}` } });
    if (p.beneficiaryId) {
      await pushNotifications(tx, [{ userId: p.beneficiaryId, actor: "KABAD", text: `a versé ${formatFCFA(p.amount)} sur votre Mobile Money pour le défi « ${p.challenge.title} ».`, href: `/defis/${p.challenge.id}/resultats`, icon: "wallet", tone: "accent" }]);
    }
    return { ok: true };
  });
}

export async function getResults(id: string, prisma: Db = db): Promise<ChallengeResults> {
  await syncStatuses(prisma);
  const c = await prisma.challenge.findUnique({ where: { id }, select: { ...summarySelect, publishedAt: true, payouts: { include: { beneficiary: { select: { name: true } } }, orderBy: { role: "asc" } } } });
  if (!c || c.status !== "DONE") throw notFound("Résultats introuvables.");
  const [summary] = await summaries([c], prisma);
  const payouts: PayoutView[] = c.payouts.map((p) => ({
    role: p.role,
    amount: p.amount,
    beneficiary: p.beneficiary?.name ?? null,
    operator: p.operator,
    // Only the last digits are shown.
    phone: p.phone ? p.phone.replace(/\d(?=(?:\D*\d){4})/g, "•") : null,
    reference: p.reference,
    status: p.status,
    sentAt: p.sentAt?.toISOString() ?? null,
  }));
  return { ...summary, ranking: await ranking(id, prisma), payouts, publishedAt: c.publishedAt?.toISOString() ?? null };
}

export async function recentContributions(challengeId: string, prisma: Db = db): Promise<ContributionView[]> {
  const rows = await prisma.contribution.findMany({ where: { challengeId, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 6 });
  return rows.map((r) => ({ name: r.anonymous ? "Anonyme" : r.displayName, amount: r.amount, createdAt: (r.paidAt ?? r.createdAt).toISOString() }));
}

/** For the admin page: challenges with their state and the transfers still to send. */
export async function adminOverview(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const challenges = await listChallenges(prisma);
  const payouts = await prisma.payout.findMany({ where: { status: "PENDING" }, include: { beneficiary: { select: { name: true } }, challenge: { select: { title: true, publishedAt: true } } }, orderBy: { createdAt: "asc" } });
  const [pendingSeniors, openReports] = await Promise.all([
    prisma.user.findMany({ where: { role: "SENIOR", seniorVerifiedAt: null }, select: { id: true, name: true, profileLink: true, years: true, createdAt: true } }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);
  return {
    challenges,
    payouts: payouts.map((p) => ({
      id: p.id,
      role: p.role,
      amount: p.amount,
      beneficiary: p.beneficiary?.name ?? "KABAD",
      operator: p.operator,
      phone: p.phone,
      challenge: p.challenge.title,
      payableFrom: new Date((p.challenge.publishedAt?.getTime() ?? 0) + CONTEST_HOURS * 3600_000).toISOString(),
    })),
    pendingSeniors: pendingSeniors.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    openReports,
  };
}

export async function verifySenior(adminId: string, userId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u || u.role !== "SENIOR") throw notFound("Senior introuvable.");
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { seniorVerifiedAt: new Date() } });
    await tx.adminAction.create({ data: { adminId, action: "senior:verify", targetId: userId } });
    await pushNotifications(tx, [{ userId, actor: "KABAD", text: "a vérifié votre statut Senior. Vous pouvez accompagner des juniors.", href: `/profil/${userId}`, icon: "check", tone: "success" }]);
    return { ok: true };
  });
}

/** A participant's own marks and the jurors' comments, shown once the results are out. Jurors stay anonymous. */
export async function myFeedback(userId: string, challengeId: string, prisma: Db = db) {
  const sub = await prisma.submission.findUnique({ where: { challengeId_userId: { challengeId, userId } }, include: { scores: true, challenge: { select: { status: true } } } });
  if (!sub || sub.challenge.status !== "DONE" || sub.scores.length === 0) return null;
  return {
    mark: averageMark(sub.scores.map(totalScore)),
    comments: sub.scores.map((s) => s.comment).filter((c): c is string => Boolean(c)),
  };
}
