/*
 * Scheduled tasks, run by the worker (worker/index.ts), never during a web request.
 * Each task is idempotent: it changes only rows not handled yet (a "…At" column is set in the same
 * statement), so running it twice, or on two workers at once, sends nothing twice.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { mailLocale, notificationMail } from "./emails";
import { mailConfigured, sendMail } from "./mailer";
import { notificationSentence, pushNotifications, type NotificationInput } from "./notifications";
import { isMeetLink } from "@/lib/mentoring";
import type { NotificationKey } from "@/lib/notification-text";

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
    await pushNotifications(tx, rows.map((r) => ({ userId: r.menteeId, actor: r.mentor.name, key: "bookingLapsed", params: { at: r.startsAt.toISOString(), tz: r.mentee.timeZone }, href: `/mentorat/seances/${r.id}`, icon: "clock", tone: "neutral" })));
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
    await pushNotifications(tx, rows.map((r) => ({ userId: r.mentorId, actor: r.mentee.name, key: "bookingNudge", params: { at: r.startsAt.toISOString(), tz: r.mentor.timeZone }, href: "/mentorat/demandes", icon: "clock", tone: "brand" })));
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
        { userId: r.menteeId, actor: r.mentor.name, key: "sessionSoonMentee" as const, params: { topic: r.topic, minutes, link: r.meetingUrl ?? "" }, href, icon: "clock" as const, tone: "brand" as const },
        { userId: r.mentorId, actor: r.mentee.name, key: "sessionSoonMentor" as const, params: { topic: r.topic, minutes, link: r.meetingUrl ?? "" }, href, icon: "clock" as const, tone: "brand" as const },
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
      // No reminder when the author chose not to notify the members, nor for an event closed early.
      where: { remind: true, remindedAt: null, endedAt: null, startsAt: { gt: now, lte: new Date(now.getTime() + HOUR) } },
      include: { project: { select: { name: true, members: { select: { userId: true } } } } },
    });
    if (rows.length === 0) return 0;
    await tx.riseEvent.updateMany({ where: { id: { in: rows.map((r) => r.id) }, remindedAt: null }, data: { remindedAt: now } });
    const notes: NotificationInput[] = rows.flatMap((e) => {
      const minutes = Math.max(1, Math.round((e.startsAt.getTime() - now.getTime()) / 60_000));
      return e.project.members.map((m) => ({ userId: m.userId, actor: e.project.name, key: "riseEventSoon" as const, params: { title: e.title, minutes }, href: `/rise-up/${e.projectId}/evenements/${e.id}`, icon: "radio" as const, tone: "accent" as const }));
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
      rows.flatMap((h) => h.teams.flatMap((t) => t.members.map((m) => ({ userId: m.userId, actor: h.title, key: "hackathonEnded" as const, href: `/hackathons/${h.id}`, icon: "trophy" as const, tone: "accent" as const })))),
    );
    return rows.length;
  });
}

/** Invitations left unanswered for 30 days are removed: the sender may invite again. */
export async function expireInvitations(now = new Date(), prisma: Db = db) {
  const { count } = await prisma.invitation.deleteMany({ where: { status: "PENDING", createdAt: { lte: new Date(now.getTime() - INVITATION_EXPIRES_DAYS * DAY) } } });
  return count;
}

/*
 * Notifications par e-mail : ce qu'un membre ne doit pas manquer quand l'app est fermée.
 * Le worker les envoie, jamais une requête web. Chaque notification est d'abord réservée
 * (emailedAt posé seulement s'il est encore vide) : deux workers n'envoient pas deux fois.
 * Si l'envoi échoue, la réservation est rendue et l'e-mail repart au passage suivant.
 */
export const EMAILED_KEYS: NotificationKey[] = [
  "bookingRequested",
  "bookingAccepted",
  "bookingDeclined",
  "bookingDeclinedReason",
  "bookingCancelled",
  "bookingLapsed",
  "bookingNudge",
  "sessionSoonMentee",
  "sessionSoonMentor",
  "badgeGranted",
  "badgeRefused",
  "badgeRevoked",
  "invitationReceived",
  "invitationAccepted",
  "teamInvited",
  "missionProposed",
  "hackathonPublished",
  "resultsPublished",
  "teamWonPrize",
  "teamWon",
  "warning",
];
/** An e-mail that could not leave for a day is dropped: it would arrive too late to be useful. */
export const MAIL_MAX_AGE_HOURS = 24;
const MAIL_BATCH = 50;

export async function mailNotifications(now = new Date(), prisma: Db = db, send: typeof sendMail = sendMail) {
  if (!mailConfigured()) return 0;
  const waiting = await prisma.notification.findMany({
    where: { emailedAt: null, key: { in: EMAILED_KEYS }, createdAt: { gt: new Date(now.getTime() - MAIL_MAX_AGE_HOURS * HOUR) } },
    orderBy: { createdAt: "asc" },
    take: MAIL_BATCH,
    include: { user: { select: { email: true, name: true, locale: true, emailVerifiedAt: true, emailNotifications: true, suspendedAt: true } } },
  });
  let sent = 0;
  for (const n of waiting) {
    const { count } = await prisma.notification.updateMany({ where: { id: n.id, emailedAt: null }, data: { emailedAt: now } });
    if (!count) continue; // another worker took it
    // Handled without an e-mail: address not confirmed, e-mails switched off, or account suspended.
    if (!n.user.emailVerifiedAt || !n.user.emailNotifications || n.user.suspendedAt) continue;
    const locale = mailLocale(n.user.locale);
    const link = (n.params as Record<string, unknown> | null)?.link;
    const mail = notificationMail(locale, n.user.name, notificationSentence(n, locale), n.href, typeof link === "string" && isMeetLink(link) ? link : undefined);
    try {
      await send(n.user.email, mail.subject, mail.text);
      sent++;
    } catch (e) {
      console.error("[e-mail]", n.id, e instanceof Error ? e.message : e);
      await prisma.notification.updateMany({ where: { id: n.id }, data: { emailedAt: null } });
    }
  }
  return sent;
}

/** Every task with how often it runs (cron, server time). */
export const JOBS = {
  "mentoring-lapse": { cron: "*/5 * * * *", run: lapseUnansweredBookings },
  "mentoring-nudge": { cron: "*/15 * * * *", run: nudgeMentors },
  "mentoring-remind": { cron: "*/5 * * * *", run: remindSessions },
  "rise-remind": { cron: "*/5 * * * *", run: remindRiseEvents },
  "hackathon-close": { cron: "*/5 * * * *", run: closeEndedHackathons },
  "invitation-expire": { cron: "30 3 * * *", run: expireInvitations },
  "notification-mail": { cron: "* * * * *", run: mailNotifications },
} as const;
