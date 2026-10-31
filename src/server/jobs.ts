/*
 * Scheduled tasks, run by the worker (worker/index.ts), never during a web request.
 * Each task is idempotent: it changes only rows not handled yet (a "…At" column is set in the same
 * statement), so running it twice, or on two workers at once, sends nothing twice.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { pushNotifications, type NotificationInput } from "./notifications";
import { formatSlot } from "@/lib/time";
import { formatFCFA } from "@/lib/format";
import { CONTEST_HOURS } from "./hackathons";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** A mentor who has not answered a request after this delay gets a reminder. */
export const NUDGE_AFTER_HOURS = 48;
/** Pending invitations are removed after this delay: the person can be invited again. */
export const INVITATION_EXPIRES_DAYS = 30;

type Tx = Prisma.TransactionClient;

/** Requests nobody answered before their slot lapse. */
export async function lapseUnansweredBookings(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.mentoringBooking.findMany({ where: { status: "PENDING", startsAt: { lte: now } }, include: { mentor: { select: { name: true } }, mentee: { select: { timeZone: true } } } });
    if (rows.length === 0) return 0;
    await tx.mentoringBooking.updateMany({
      where: { id: { in: rows.map((r) => r.id) }, status: "PENDING" },
      data: { status: "DECLINED", declineReason: "Demande expirée : le mentor n’a pas répondu avant la séance.", answeredAt: now },
    });
    await pushNotifications(tx, rows.map((r) => ({ userId: r.menteeId, actor: r.mentor.name, text: ` n’a pas répondu à temps pour la séance du ${formatSlot(r.startsAt, r.mentee.timeZone)}. Réserve un autre créneau.`, href: `/mentorat/seances/${r.id}`, icon: "clock", tone: "neutral" })));
    return rows.length;
  });
}

/** Reminds a mentor of a request still waiting after 48 hours (or less when the slot is near). */
export async function nudgeMentors(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.mentoringBooking.findMany({
      where: { status: "PENDING", nudgedAt: null, startsAt: { gt: now }, OR: [{ createdAt: { lte: new Date(now.getTime() - NUDGE_AFTER_HOURS * HOUR) } }, { startsAt: { lte: new Date(now.getTime() + DAY) } }] },
      include: { mentee: { select: { name: true } }, mentor: { select: { timeZone: true } } },
    });
    if (rows.length === 0) return 0;
    await tx.mentoringBooking.updateMany({ where: { id: { in: rows.map((r) => r.id) }, nudgedAt: null }, data: { nudgedAt: now } });
    await pushNotifications(tx, rows.map((r) => ({ userId: r.mentorId, actor: r.mentee.name, text: ` attend ta réponse pour la séance du ${formatSlot(r.startsAt, r.mentor.timeZone)}.`, href: "/mentorat/demandes", icon: "clock", tone: "brand" })));
    return rows.length;
  });
}

/** Both members get a reminder about an hour before an accepted session. */
export async function remindSessions(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.mentoringBooking.findMany({
      where: { status: "ACCEPTED", remindedAt: null, startsAt: { gt: now, lte: new Date(now.getTime() + HOUR) } },
      include: { mentor: { select: { name: true } }, mentee: { select: { name: true } } },
    });
    if (rows.length === 0) return 0;
    await tx.mentoringBooking.updateMany({ where: { id: { in: rows.map((r) => r.id) }, remindedAt: null }, data: { remindedAt: now } });
    const notes: NotificationInput[] = rows.flatMap((r) => {
      const minutes = Math.max(1, Math.round((r.startsAt.getTime() - now.getTime()) / 60_000));
      const href = `/mentorat/seances/${r.id}`;
      return [
        { userId: r.menteeId, actor: r.mentor.name, text: ` : ta séance « ${r.topic} » commence dans ${minutes} min.`, href, icon: "clock" as const, tone: "brand" as const },
        { userId: r.mentorId, actor: r.mentee.name, text: ` : votre séance « ${r.topic} » commence dans ${minutes} min.`, href, icon: "clock" as const, tone: "brand" as const },
      ];
    });
    await pushNotifications(tx, notes);
    return rows.length;
  });
}

/** Members of a Rise-Up project get a reminder about an hour before each event. */
export async function remindRiseEvents(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.riseEvent.findMany({
      where: { remindedAt: null, startsAt: { gt: now, lte: new Date(now.getTime() + HOUR) } },
      include: { project: { select: { name: true, members: { select: { userId: true } } } } },
    });
    if (rows.length === 0) return 0;
    await tx.riseEvent.updateMany({ where: { id: { in: rows.map((r) => r.id) }, remindedAt: null }, data: { remindedAt: now } });
    const notes: NotificationInput[] = rows.flatMap((e) => {
      const minutes = Math.max(1, Math.round((e.startsAt.getTime() - now.getTime()) / 60_000));
      return e.project.members.map((m) => ({ userId: m.userId, actor: e.project.name, text: ` : « ${e.title} » commence dans ${minutes} min.`, href: `/rise-up/${e.projectId}/evenements/${e.id}`, icon: "radio" as const, tone: "accent" as const }));
    });
    await pushNotifications(tx, notes);
    return rows.length;
  });
}

/** Hackathons past their end move to the jury; their participants are told. */
export async function closeEndedHackathons(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx: Tx) => {
    const rows = await tx.hackathon.findMany({ where: { status: "OPEN", endsAt: { lte: now } }, select: { id: true, title: true, teams: { select: { members: { select: { userId: true } } } } } });
    if (rows.length === 0) return 0;
    await tx.hackathon.updateMany({ where: { id: { in: rows.map((r) => r.id) }, status: "OPEN" }, data: { status: "JURY" } });
    await pushNotifications(
      tx,
      rows.flatMap((h) => h.teams.flatMap((t) => t.members.map((m) => ({ userId: m.userId, actor: `Hackathon « ${h.title} »`, text: " est terminé : les solutions passent au jury.", href: `/hackathons/${h.id}`, icon: "trophy" as const, tone: "accent" as const })))),
    );
    return rows.length;
  });
}

/** Tells the KABAD team which transfers can be sent, once the 48-hour contest period is over. */
export async function announcePayableTransfers(now = new Date(), prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.payout.findMany({
      where: { status: "PENDING", notifiedAt: null, hackathon: { resultsAt: { lte: new Date(now.getTime() - CONTEST_HOURS * HOUR) } } },
      include: { hackathon: { select: { title: true } }, beneficiary: { select: { name: true } } },
    });
    if (rows.length === 0) return 0;
    await tx.payout.updateMany({ where: { id: { in: rows.map((r) => r.id) }, notifiedAt: null }, data: { notifiedAt: now } });
    const admins = await tx.user.findMany({ where: { isAdmin: true, suspendedAt: null }, select: { id: true } });
    await pushNotifications(
      tx,
      admins.flatMap((a) => rows.map((p) => ({ userId: a.id, actor: `Hackathon « ${p.hackathon.title} »`, text: ` : versement de ${formatFCFA(p.amount)} à ${p.beneficiary?.name ?? "KABAD"} à envoyer.`, href: "/admin/versements", icon: "wallet" as const, tone: "accent" as const }))),
    );
    return rows.length;
  });
}

/** Invitations left unanswered for 30 days are removed: the sender may invite again. */
export async function expireInvitations(now = new Date(), prisma: Db = db) {
  const { count } = await prisma.invitation.deleteMany({ where: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - INVITATION_EXPIRES_DAYS * DAY) } } });
  return count;
}

/** Every task with how often it runs (cron, server time). */
export const JOBS = {
  "mentoring-lapse": { cron: "*/5 * * * *", run: lapseUnansweredBookings },
  "mentoring-nudge": { cron: "*/15 * * * *", run: nudgeMentors },
  "mentoring-remind": { cron: "*/5 * * * *", run: remindSessions },
  "rise-remind": { cron: "*/5 * * * *", run: remindRiseEvents },
  "hackathon-close": { cron: "*/5 * * * *", run: closeEndedHackathons },
  "payout-announce": { cron: "0 * * * *", run: announcePayableTransfers },
  "invitation-expire": { cron: "30 3 * * *", run: expireInvitations },
} as const;
