/*
 * Mentoring rules, enforced on the server:
 * - a junior asks a verified senior for mentoring on one project; the senior accepts while they have an open place;
 * - accepting forms a pair, makes both members contacts and opens their conversation;
 * - either member notes a session; it counts only once both have confirmed it;
 * - a session can be corrected until both have confirmed it, and a correction asks the other member again.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { mentorStats } from "./members";
import { pushNotifications } from "./notifications";
import { notify } from "./realtime-events";
import { formatDuration } from "@/lib/format";
import { cashChallengeEligibility } from "@/lib/mentoring";
import type { Eligibility, MentorRequestView, PairView, SessionView } from "@/lib/domain-types";

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
const directKey = (a: string, b: string) => [a, b].sort().join(":");

const sessionInclude = { notedBy: { select: { id: true, name: true } } } as const;
type SessionRow = Prisma.MentoringSessionGetPayload<{ include: typeof sessionInclude }>;

const toSession = (s: SessionRow): SessionView => ({
  id: s.id,
  pairId: s.pairId,
  startsAt: s.startsAt.toISOString(),
  minutes: s.minutes,
  topic: s.topic,
  done: s.done,
  next: s.next,
  notedBy: s.notedBy,
  confirmedByMentor: s.confirmedByMentor,
  confirmedByMentee: s.confirmedByMentee,
});

const pairInclude = {
  mentor: { select: { id: true, name: true } },
  mentee: { select: { id: true, name: true } },
  sessions: { include: sessionInclude, orderBy: { startsAt: "desc" } },
} as const;
type PairRow = Prisma.PairGetPayload<{ include: typeof pairInclude }>;

function toPair(p: PairRow, userId: string): PairView {
  const sessions = p.sessions.map(toSession);
  return {
    id: p.id,
    project: p.project,
    repo: p.repo,
    since: p.createdAt.toISOString(),
    nextSessionAt: p.nextSessionAt?.toISOString() ?? null,
    mentor: p.mentor,
    mentee: p.mentee,
    iAm: p.mentorId === userId ? "MENTOR" : "MENTEE",
    sessions,
    confirmedMinutes: sessions.filter((s) => s.confirmedByMentor && s.confirmedByMentee).reduce((n, s) => n + s.minutes, 0),
    // One stable room per pair on the public Jitsi Meet server: no account, screen sharing included.
    visioUrl: `https://meet.jit.si/kabad-${p.id}`,
  };
}

/* Requests */

export async function requestMentoring(menteeId: string, input: { mentorId: string; project: string; situation: string; repo?: string; topics: string[] }, prisma: Db = db) {
  if (input.mentorId === menteeId) throw new DomainError("self", "Vous ne pouvez pas être votre propre mentor.");
  const mentor = await prisma.user.findUnique({ where: { id: input.mentorId }, select: { id: true, name: true, role: true, seniorVerifiedAt: true, mentorCapacity: true } });
  if (!mentor || mentor.role !== "SENIOR" || !mentor.seniorVerifiedAt) throw notFound("Mentor introuvable.");
  const first = firstName(mentor.name);
  const [pair, pending, blocked] = await Promise.all([
    prisma.pair.findUnique({ where: { mentorId_menteeId: { mentorId: mentor.id, menteeId } } }),
    prisma.mentorRequest.count({ where: { mentorId: mentor.id, menteeId, status: "PENDING" } }),
    prisma.block.count({ where: { OR: [{ blockerId: menteeId, blockedId: mentor.id }, { blockerId: mentor.id, blockedId: menteeId }] } }),
  ]);
  if (blocked) throw forbidden("Vous ne pouvez pas contacter ce membre.");
  if (pair?.active) throw new DomainError("already_pair", `Vous êtes déjà en binôme avec ${first}.`, 409);
  if (pending) throw new DomainError("already_sent", `Vous avez déjà envoyé une demande à ${first}. Attendez sa réponse.`, 409);
  const stats = (await mentorStats([mentor.id], prisma)).get(mentor.id)!;
  if (mentor.mentorCapacity - stats.activePairs <= 0) throw new DomainError("full", `${first} n’a plus de place libre pour le moment.`, 409);

  const mentee = await prisma.user.findUniqueOrThrow({ where: { id: menteeId }, select: { name: true } });
  return prisma.$transaction(async (tx) => {
    const r = await tx.mentorRequest.create({ data: { menteeId, mentorId: mentor.id, project: input.project, situation: input.situation, repo: input.repo || null, topics: input.topics } });
    await pushNotifications(tx, [{ userId: mentor.id, actor: mentee.name, text: `vous demande un mentorat sur « ${input.project} ».`, href: "/mentorat#demandes", icon: "user", tone: "brand" }]);
    return { id: r.id };
  });
}

const requestInclude = { mentee: { select: { id: true, name: true, city: true } }, mentor: { select: { id: true, name: true } } } as const;

export async function listRequests(userId: string, prisma: Db = db): Promise<{ received: MentorRequestView[]; sent: MentorRequestView[] }> {
  const rows = await prisma.mentorRequest.findMany({
    where: { status: "PENDING", OR: [{ mentorId: userId }, { menteeId: userId }] },
    include: requestInclude,
    orderBy: { createdAt: "desc" },
  });
  const view = (r: (typeof rows)[number]): MentorRequestView => ({ id: r.id, project: r.project, situation: r.situation, repo: r.repo, topics: r.topics, createdAt: r.createdAt.toISOString(), mentee: r.mentee, mentor: r.mentor });
  return { received: rows.filter((r) => r.mentorId === userId).map(view), sent: rows.filter((r) => r.menteeId === userId).map(view) };
}

export async function answerRequest(mentorId: string, requestId: string, accept: boolean, prisma: Db = db) {
  const r = await prisma.mentorRequest.findUnique({ where: { id: requestId }, include: requestInclude });
  if (!r || r.mentorId !== mentorId) throw notFound("Demande introuvable.");
  if (r.status !== "PENDING") throw new DomainError("already_answered", "Vous avez déjà répondu à cette demande.", 409);

  if (!accept) {
    return prisma.$transaction(async (tx) => {
      await tx.mentorRequest.update({ where: { id: r.id }, data: { status: "DECLINED", answeredAt: new Date() } });
      await pushNotifications(tx, [{ userId: r.menteeId, actor: r.mentor.name, text: "ne peut pas vous accompagner pour le moment. Choisissez un autre mentor.", href: "/mentorat/mentors", icon: "user", tone: "neutral" }]);
      return { pairId: null };
    });
  }

  const [mentor, stats] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: mentorId }, select: { mentorCapacity: true } }),
    mentorStats([mentorId], prisma).then((m) => m.get(mentorId)!),
  ]);
  if (mentor.mentorCapacity - stats.activePairs <= 0) throw new DomainError("full", "Vous n’avez plus de place libre. Augmentez votre nombre de binômes ou terminez-en un.", 409);

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.mentorRequest.update({ where: { id: r.id }, data: { status: "ACCEPTED", answeredAt: now } });
    const pair = await tx.pair.upsert({
      where: { mentorId_menteeId: { mentorId, menteeId: r.menteeId } },
      create: { mentorId, menteeId: r.menteeId, project: r.project, repo: r.repo },
      update: { active: true, project: r.project, repo: r.repo },
    });
    // The pair talks in an ordinary direct conversation.
    await tx.contact.createMany({ data: [{ userId: mentorId, contactId: r.menteeId }, { userId: r.menteeId, contactId: mentorId }], skipDuplicates: true });
    const key = directKey(mentorId, r.menteeId);
    const conversation =
      (await tx.conversation.findUnique({ where: { directKey: key } })) ??
      (await tx.conversation.create({ data: { kind: "DIRECT", directKey: key, members: { create: [{ userId: mentorId, lastReadAt: now }, { userId: r.menteeId, lastReadAt: now }] } } }));
    await tx.message.create({ data: { conversationId: conversation.id, kind: "SYSTEM", body: `${firstName(r.mentor.name)} a accepté la demande de mentorat sur « ${r.project} »`, createdAt: now } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } });
    await notify(tx, { t: "conversation", conversationId: conversation.id, recipients: [mentorId, r.menteeId] });
    await pushNotifications(tx, [{ userId: r.menteeId, actor: r.mentor.name, text: "a accepté votre demande de mentorat. Votre binôme commence.", href: "/mentorat", icon: "user", tone: "success" }]);
    return { pairId: pair.id };
  });
}

/* Pairs and sessions */

export async function myPairs(userId: string, prisma: Db = db): Promise<PairView[]> {
  const rows = await prisma.pair.findMany({ where: { active: true, OR: [{ mentorId: userId }, { menteeId: userId }] }, include: pairInclude, orderBy: { createdAt: "asc" } });
  return rows.map((p) => toPair(p, userId));
}

async function pairOf(prisma: Db | Prisma.TransactionClient, userId: string, pairId: string) {
  const p = await prisma.pair.findUnique({ where: { id: pairId }, include: pairInclude });
  if (!p || (p.mentorId !== userId && p.menteeId !== userId)) throw notFound("Binôme introuvable.");
  return p;
}

export async function getPair(userId: string, pairId: string, prisma: Db = db) {
  return toPair(await pairOf(prisma, userId, pairId), userId);
}

/** Confirmed mentoring time of a junior, across all their mentors. */
export async function eligibility(userId: string, prisma: Db = db): Promise<Eligibility> {
  const sessions = await prisma.mentoringSession.findMany({ where: { pair: { menteeId: userId } }, select: { minutes: true, confirmedByMentor: true, confirmedByMentee: true, pair: { select: { mentor: { select: { name: true } } } } } });
  const e = cashChallengeEligibility(sessions);
  const mentors = [...new Set(sessions.filter((s) => s.confirmedByMentor && s.confirmedByMentee).map((s) => s.pair.mentor.name))];
  return { ...e, mentors };
}

export async function getSession(userId: string, sessionId: string, prisma: Db = db) {
  const s = await prisma.mentoringSession.findUnique({ where: { id: sessionId }, include: { pair: { include: pairInclude } } });
  if (!s || (s.pair.mentorId !== userId && s.pair.menteeId !== userId)) throw notFound("Séance introuvable.");
  return { session: toSession(s.pair.sessions.find((x) => x.id === s.id)!), pair: toPair(s.pair, userId) };
}

type SessionInput = { startsAt: string; minutes: number; topic: string; done: string; next: string };

export async function noteSession(userId: string, input: SessionInput & { pairId: string }, prisma: Db = db) {
  const p = await pairOf(prisma, userId, input.pairId);
  if (!p.active) throw new DomainError("inactive", "Ce binôme est terminé.");
  const startsAt = new Date(input.startsAt);
  if (startsAt.getTime() > Date.now() + 10 * 60_000) throw new DomainError("future", "Notez une séance une fois qu’elle a eu lieu.");
  const iAmMentor = p.mentorId === userId;
  const me = iAmMentor ? p.mentor : p.mentee;
  const other = iAmMentor ? p.mentee : p.mentor;
  return prisma.$transaction(async (tx) => {
    const s = await tx.mentoringSession.create({
      data: { pairId: p.id, startsAt, minutes: input.minutes, topic: input.topic, done: input.done, next: input.next, notedById: userId, confirmedByMentor: iAmMentor, confirmedByMentee: !iAmMentor },
    });
    await tx.pair.update({ where: { id: p.id }, data: { nextSessionAt: null } });
    await pushNotifications(tx, [{ userId: other.id, actor: me.name, text: `a noté une séance de ${formatDuration(input.minutes)}. Confirmez-la pour qu’elle compte.`, href: `/mentorat/seances/${s.id}`, icon: "clock", tone: "brand" }]);
    return { id: s.id };
  });
}

export async function confirmSession(userId: string, sessionId: string, prisma: Db = db) {
  const { session, pair } = await getSession(userId, sessionId, prisma);
  const field = pair.iAm === "MENTOR" ? "confirmedByMentor" : "confirmedByMentee";
  if (session[field]) return { ok: true };
  const other = pair.iAm === "MENTOR" ? pair.mentee : pair.mentor;
  const me = pair.iAm === "MENTOR" ? pair.mentor : pair.mentee;
  return prisma.$transaction(async (tx) => {
    await tx.mentoringSession.update({ where: { id: sessionId }, data: { [field]: true } });
    await pushNotifications(tx, [{ userId: other.id, actor: me.name, text: `a confirmé la séance « ${session.topic} ». Elle compte maintenant.`, href: `/mentorat/seances/${sessionId}`, icon: "check", tone: "success" }]);
    return { ok: true };
  });
}

/** A correction is possible until both confirm; the other member is asked to confirm again. */
export async function correctSession(userId: string, sessionId: string, input: SessionInput, prisma: Db = db) {
  const { session, pair } = await getSession(userId, sessionId, prisma);
  if (session.confirmedByMentor && session.confirmedByMentee) throw new DomainError("locked", "Cette séance est confirmée par vous deux : elle ne peut plus être modifiée.", 409);
  const iAmMentor = pair.iAm === "MENTOR";
  const other = iAmMentor ? pair.mentee : pair.mentor;
  const me = iAmMentor ? pair.mentor : pair.mentee;
  return prisma.$transaction(async (tx) => {
    await tx.mentoringSession.update({
      where: { id: sessionId },
      data: { startsAt: new Date(input.startsAt), minutes: input.minutes, topic: input.topic, done: input.done, next: input.next, confirmedByMentor: iAmMentor, confirmedByMentee: !iAmMentor },
    });
    await pushNotifications(tx, [{ userId: other.id, actor: me.name, text: "a corrigé une séance. Vérifiez-la et confirmez-la.", href: `/mentorat/seances/${sessionId}`, icon: "clock", tone: "brand" }]);
    return { ok: true };
  });
}

export async function planNextSession(userId: string, pairId: string, at: string | null, prisma: Db = db) {
  const p = await pairOf(prisma, userId, pairId);
  const when = at ? new Date(at) : null;
  if (when && when.getTime() < Date.now() - 5 * 60_000) throw new DomainError("past", "Choisissez une date à venir.");
  const iAmMentor = p.mentorId === userId;
  const other = iAmMentor ? p.mentee : p.mentor;
  const me = iAmMentor ? p.mentor : p.mentee;
  return prisma.$transaction(async (tx) => {
    await tx.pair.update({ where: { id: p.id }, data: { nextSessionAt: when } });
    if (when) await pushNotifications(tx, [{ userId: other.id, actor: me.name, text: "a planifié votre prochaine séance.", href: "/mentorat", icon: "clock", tone: "brand" }]);
    return { ok: true };
  });
}

