/*
 * The KABAD team's tools: dashboard figures, moderation of reports, members (suspend, withdraw a badge),
 * hackathon juries and transfers. Every action is checked against isAdmin and logged.
 * Mentor badges: src/server/badges.ts. Hackathon review and results: src/server/hackathons.ts.
 */
import type { Prisma } from "@/generated/prisma/client";
import { avatarUrl } from "@/lib/avatar";
import { dailyCounts, weekOverWeek } from "@/lib/daily-counts";
import { requireAdmin } from "./hackathons";
import { db, type Db } from "./db";
import { DomainError, notFound } from "./errors";
import { HIDDEN_MESSAGE, leaveCommunityGroup } from "./messaging";
import { pushNotifications } from "./notifications";
import { endRoom } from "./rooms";
import { notify } from "./realtime-events";
import { DECISION_LABEL, type ReportDecision } from "@/lib/report-decision";

export type { ReportDecision };

export async function logAction(tx: Prisma.TransactionClient | Db, adminId: string, action: string, targetId?: string | null, details?: string) {
  await tx.adminAction.create({ data: { adminId, action, targetId: targetId ?? null, details: details?.slice(0, 500) } });
}

/** How many days the activity charts of the dashboard cover: this week and the one before. */
const CHART_DAYS = 14;

export async function dashboard(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const now = new Date();
  // Midnight GMT, 13 days ago: the first day of the charts.
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (CHART_DAYS - 1) * 86_400_000);
  const [members, mentors, pendingBadges, unverified, suspended, openReports, upcomingSessions, held, openHackathons, juryHackathons, toPublish, riseProjects, signupRows, messageRows, latest] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.user.count({ where: { seniorVerifiedAt: { not: null } } }),
    prisma.mentorBadgeRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.mentoringBooking.count({ where: { status: "ACCEPTED", startsAt: { gte: now } } }),
    prisma.mentoringBooking.aggregate({ where: { status: "ACCEPTED", startsAt: { lt: now } }, _sum: { minutes: true } }),
    prisma.hackathon.count({ where: { status: "OPEN", publishedAt: { not: null } } }),
    prisma.hackathon.count({ where: { status: "JURY" } }),
    prisma.hackathon.count({ where: { publishedAt: null } }),
    prisma.riseProject.count(),
    // Day by day: only the days with activity come back, dailyCounts fills the others with 0.
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, count(*) AS count FROM "User"
      WHERE "isAdmin" = false AND "createdAt" >= ${since} GROUP BY 1`,
    // Messages written by members: text, files and voice notes, not the lines KABAD adds itself.
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, count(*) AS count FROM "Message"
      WHERE kind <> 'SYSTEM' AND "createdAt" >= ${since} GROUP BY 1`,
    prisma.user.findMany({
      where: { isAdmin: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, city: true, level: true, createdAt: true, emailVerifiedAt: true, seniorVerifiedAt: true, photoAt: true },
    }),
  ]);
  const signups = dailyCounts(signupRows, CHART_DAYS, now);
  const messages = dailyCounts(messageRows, CHART_DAYS, now);
  return {
    members,
    mentors,
    pendingBadges,
    unverified,
    suspended,
    openReports,
    upcomingSessions,
    heldHours: Math.floor((held._sum.minutes ?? 0) / 60),
    openHackathons,
    juryHackathons,
    toPublish,
    riseProjects,
    signups,
    messages,
    signupsWeek: weekOverWeek(signups),
    messagesWeek: weekOverWeek(messages),
    latest: latest.map((u) => ({
      id: u.id,
      name: u.name,
      city: u.city,
      level: u.level,
      createdAt: u.createdAt.toISOString(),
      confirmed: u.emailVerifiedAt !== null,
      verified: u.seniorVerifiedAt !== null,
      photo: avatarUrl(u),
    })),
  };
}

/* Reports */

export type ReportContext = {
  id: string;
  createdAt: string;
  reason: string;
  details: string | null;
  status: "OPEN" | "REVIEWED";
  resolution: string | null;
  reporter: { id: string; name: string };
  targetType: "USER" | "MESSAGE" | "CONVERSATION" | "INVITATION" | "ROOM" | "RISE_POST";
  targetId: string;
  target: { id: string; name: string; suspended: boolean } | null;
  /** How many reports this member has received in total: repeat offenders stand out. */
  targetReports: number;
  /** What was reported, as the team needs to read it (a removed message shows its original text here). */
  excerpt: Array<{ author: string; body: string; reported?: boolean; hidden?: boolean }>;
  messageId: string | null;
  roomId: string | null;
  /** The Rise-Up project of a reported post, to open it. */
  riseProjectId: string | null;
  /** The reported message or post is hidden now: the team may show it again. */
  targetHidden: boolean;
};

export async function listReports(adminId: string, status: "OPEN" | "REVIEWED", prisma: Db = db): Promise<ReportContext[]> {
  await requireAdmin(adminId, prisma);
  const rows = await prisma.report.findMany({ where: { status }, orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" }, take: 50, include: { reporter: { select: { id: true, name: true } } } });
  const out: ReportContext[] = [];
  for (const r of rows) {
    const target = r.targetUserId ? await prisma.user.findUnique({ where: { id: r.targetUserId }, select: { id: true, name: true, suspendedAt: true } }) : null;
    const targetReports = r.targetUserId ? await prisma.report.count({ where: { targetUserId: r.targetUserId } }) : 0;
    let excerpt: ReportContext["excerpt"] = [];
    let messageId: string | null = null;
    let roomId: string | null = null;
    let riseProjectId: string | null = null;
    let targetHidden = false;
    if (r.targetType === "MESSAGE") {
      const m = await prisma.message.findUnique({ where: { id: r.targetId }, select: { id: true, conversationId: true, createdAt: true } });
      if (m) {
        messageId = m.id;
        // The reported message with the two messages before it, for context.
        const around = await prisma.message.findMany({ where: { conversationId: m.conversationId, createdAt: { lte: m.createdAt }, kind: "TEXT" }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } } } });
        excerpt = around.reverse().map((x) => ({ author: x.author?.name ?? "Compte supprimé", body: x.body, reported: x.id === m.id, hidden: x.hiddenAt !== null }));
        targetHidden = excerpt.some((x) => x.reported && x.hidden);
      }
    } else if (r.targetType === "CONVERSATION") {
      const last = await prisma.message.findMany({ where: { conversationId: r.targetId, kind: "TEXT", createdAt: { lte: r.createdAt } }, orderBy: { createdAt: "desc" }, take: 6, include: { author: { select: { name: true } } } });
      excerpt = last.reverse().map((x) => ({ author: x.author?.name ?? "Compte supprimé", body: x.body, hidden: x.hiddenAt !== null }));
    } else if (r.targetType === "INVITATION") {
      const inv = await prisma.invitation.findUnique({ where: { id: r.targetId }, include: { from: { select: { name: true } } } });
      if (inv) excerpt = [{ author: inv.from.name, body: inv.message, reported: true }];
    } else if (r.targetType === "USER") {
      const u = await prisma.user.findUnique({ where: { id: r.targetId }, select: { name: true, headline: true, bio: true, profileLink: true } });
      if (u) excerpt = [{ author: u.name, body: [u.headline, u.bio, u.profileLink].filter(Boolean).join(" · ") || "(profil vide)" }];
    } else if (r.targetType === "RISE_POST") {
      // A post of a Rise-Up project, hidden at once when a lead of the project reported it.
      const post = await prisma.risePost.findUnique({ where: { id: r.targetId }, include: { author: { select: { name: true } } } });
      if (post) {
        riseProjectId = post.projectId;
        targetHidden = post.hiddenAt !== null;
        excerpt = [{ author: post.author?.name ?? "Compte supprimé", body: post.body, reported: true, hidden: targetHidden }];
      }
    } else if (r.targetType === "ROOM") {
      const room = await prisma.voiceRoom.findUnique({ where: { id: r.targetId }, include: { host: { select: { name: true } } } });
      if (room) {
        roomId = room.id;
        excerpt = [{ author: room.host.name, body: `${room.title} : ${room.description}`, reported: true, hidden: room.hiddenAt !== null }];
      }
    }
    out.push({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      reporter: r.reporter,
      targetType: r.targetType,
      targetId: r.targetId,
      target: target && { id: target.id, name: target.name, suspended: target.suspendedAt !== null },
      targetReports,
      excerpt,
      messageId,
      roomId,
      riseProjectId,
      targetHidden,
    });
  }
  return out;
}


/** Handles a report. Other open reports on the same thing are closed with it. */
export async function resolveReport(adminId: string, reportId: string, decision: ReportDecision, note: string | undefined, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const r = await prisma.report.findUnique({ where: { id: reportId } });
  if (!r) throw notFound("Signalement introuvable.");
  if (r.status !== "OPEN") throw new DomainError("already_resolved", "Ce signalement est déjà traité.", 409);
  if ((decision === "warn" || decision === "suspend") && !r.targetUserId) throw new DomainError("no_member", "Ce signalement ne vise pas un membre précis.");
  if (decision === "hide" && r.targetType !== "MESSAGE" && r.targetType !== "ROOM" && r.targetType !== "RISE_POST") throw new DomainError("not_hideable", "Seuls un message ou un salon peuvent être retirés.");
  if (decision === "restore" && r.targetType !== "MESSAGE" && r.targetType !== "RISE_POST") throw new DomainError("not_restorable", "Seul un message peut être rétabli.");
  const resolution = [DECISION_LABEL[decision], note?.trim()].filter(Boolean).join(" : ");

  if (decision === "suspend") await suspendMember(adminId, r.targetUserId!, note?.trim() || r.reason, prisma);
  // A closed room is also cut on the audio server.
  if (decision === "hide" && r.targetType === "ROOM") await endRoom(adminId, r.targetId, { asAdmin: true }, prisma);

  return prisma.$transaction(async (tx) => {
    if (decision === "hide" && r.targetType === "MESSAGE") {
      const m = await tx.message.update({ where: { id: r.targetId }, data: { hiddenAt: new Date() }, select: { conversationId: true, conversation: { select: { members: { select: { userId: true } } } } } });
      await notify(tx, { t: "conversation", conversationId: m.conversationId, recipients: m.conversation.members.map((x) => x.userId) });
    }
    if (decision === "hide" && r.targetType === "ROOM") {
      await tx.voiceRoom.update({ where: { id: r.targetId }, data: { hiddenAt: new Date() } });
    }
    // A post hidden by the team; one already hidden by a lead stays so, now confirmed by the team.
    if (decision === "hide" && r.targetType === "RISE_POST") {
      await tx.risePost.updateMany({ where: { id: r.targetId, hiddenAt: null }, data: { hiddenAt: new Date() } });
    }
    // Only the KABAD team shows again a message hidden by a lead (P5).
    if (decision === "restore" && r.targetType === "RISE_POST") {
      await tx.risePost.update({ where: { id: r.targetId }, data: { hiddenAt: null, hiddenById: null, hiddenReason: null } });
    }
    if (decision === "restore" && r.targetType === "MESSAGE") {
      const m = await tx.message.update({ where: { id: r.targetId }, data: { hiddenAt: null, hiddenById: null }, select: { conversationId: true, conversation: { select: { members: { select: { userId: true } } } } } });
      await notify(tx, { t: "conversation", conversationId: m.conversationId, recipients: m.conversation.members.map((x) => x.userId) });
    }
    if (decision === "warn") {
      await pushNotifications(tx, [{ userId: r.targetUserId!, actor: "KABAD", key: "warning", params: { reason: note?.trim() || r.reason }, href: "/compte", icon: "info", tone: "accent" }]);
    }
    await tx.report.updateMany({
      where: { status: "OPEN", OR: [{ id: r.id }, { targetType: r.targetType, targetId: r.targetId }] },
      data: { status: "REVIEWED", resolvedAt: new Date(), resolvedById: adminId, resolution },
    });
    // Le journal dit déjà la décision par son code : il ne garde que la note, sans libellé français en tête.
    await logAction(tx, adminId, `report:${decision}`, r.id, note?.trim() || undefined);
    return { ok: true };
  });
}

/* Members */

export async function adminMembers(adminId: string, q: string | undefined, filter: "all" | "pending_seniors" | "suspended", prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const text = q?.trim();
  const rows = await prisma.user.findMany({
    where: {
      ...(filter === "pending_seniors" ? { role: "SENIOR", seniorVerifiedAt: null, suspendedAt: null } : {}),
      ...(filter === "suspended" ? { suspendedAt: { not: null } } : {}),
      ...(text ? { OR: [{ name: { contains: text, mode: "insensitive" } }, { email: { contains: text, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, email: true, role: true, city: true, country: true, years: true, profileLink: true, isAdmin: true, emailVerifiedAt: true, seniorVerifiedAt: true, suspendedAt: true, suspensionReason: true, createdAt: true, _count: { select: { reports: true } } },
  });
  const received = await prisma.report.groupBy({ by: ["targetUserId"], where: { targetUserId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    place: [r.city, r.country].filter(Boolean).join(", "),
    years: r.years,
    profileLink: r.profileLink,
    isAdmin: r.isAdmin,
    emailVerified: r.emailVerifiedAt !== null,
    seniorVerified: r.seniorVerifiedAt !== null,
    suspended: r.suspendedAt !== null,
    suspensionReason: r.suspensionReason,
    createdAt: r.createdAt.toISOString(),
    reportsReceived: received.find((x) => x.targetUserId === r.id)?._count._all ?? 0,
  }));
}

/** A suspended member cannot sign in: sessions are closed, open sockets cut, live rooms they host ended. */
export async function suspendMember(adminId: string, userId: string, reason: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  if (adminId === userId) throw new DomainError("self", "Tu ne peux pas te suspendre toi-même.");
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!u) throw notFound("Membre introuvable.");
  if (u.isAdmin) throw new DomainError("admin", "Un administrateur ne peut pas être suspendu depuis cet écran.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { suspendedAt: new Date(), suspensionReason: reason.slice(0, 300) } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.voiceRoom.updateMany({ where: { hostId: userId, status: { in: ["SCHEDULED", "LIVE"] } }, data: { status: "ENDED", endedAt: new Date() } });
    await notify(tx, { t: "revoke", recipients: [userId] });
    await logAction(tx, adminId, "member:suspend", userId, reason);
  });
  return { ok: true };
}

export async function reinstateMember(adminId: string, userId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  await prisma.$transaction(async (tx) => {
    // updateMany: an unknown member gives a clear « introuvable », not an error 500.
    const { count } = await tx.user.updateMany({ where: { id: userId }, data: { suspendedAt: null, suspensionReason: null } });
    if (!count) throw notFound("Membre introuvable.");
    await logAction(tx, adminId, "member:reinstate", userId);
  });
  return { ok: true };
}

/** Withdraws the mentor badge (misconduct, false information). Sessions to come are cancelled. */
export async function revokeBadge(adminId: string, userId: string, reason: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const mentor = await tx.user.update({ where: { id: userId }, data: { seniorVerifiedAt: null, role: "JUNIOR" }, select: { name: true } });
    // The sessions to come are cancelled, and each dev is told: they would otherwise wait for a mentor who no longer is one.
    const sessions = await tx.mentoringBooking.findMany({ where: { mentorId: userId, status: { in: ["PENDING", "ACCEPTED"] }, startsAt: { gt: now } }, select: { id: true, menteeId: true, startsAt: true, mentee: { select: { timeZone: true } } } });
    await tx.mentoringBooking.updateMany({ where: { id: { in: sessions.map((b) => b.id) } }, data: { status: "CANCELLED", answeredAt: now } });
    // An instructor is a badged mentor: the missions of hackathons not finished yet stop with the badge,
    // and the mentor leaves the instructors' groups of those hackathons.
    const missions = await tx.instructorMission.findMany({ where: { mentorId: userId, status: { in: ["PROPOSED", "ACCEPTED"] }, hackathon: { endsAt: { gt: now } } }, select: { id: true, hackathon: { select: { instructorsConversationId: true } } } });
    await tx.instructorMission.updateMany({ where: { id: { in: missions.map((x) => x.id) } }, data: { status: "DECLINED", answeredAt: now } });
    for (const x of missions) if (x.hackathon.instructorsConversationId) await leaveCommunityGroup(tx, x.hackathon.instructorsConversationId, userId);
    await pushNotifications(tx, [
      { userId, actor: "KABAD", key: "badgeRevoked", params: { reason }, href: "/mentorat/badge", icon: "info", tone: "neutral" },
      ...sessions.map((b) => ({ userId: b.menteeId, actor: mentor.name, key: "bookingCancelled" as const, params: { at: b.startsAt.toISOString(), tz: b.mentee.timeZone }, href: `/mentorat/seances/${b.id}`, icon: "clock" as const, tone: "neutral" as const })),
    ]);
    await logAction(tx, adminId, "badge:revoke", userId, reason);
  });
  return { ok: true };
}

/* Hackathon juries */

/** Three badged mentors form the jury. Organizers and members of a team cannot judge it. */
export async function setJury(adminId: string, hackathonId: string, jurorIds: string[], prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const jurors = [...new Set(jurorIds)];
  if (jurors.length !== 3) throw new DomainError("jury", "Choisis exactement trois jurés.", 400, "jurorIds");
  const h = await prisma.hackathon.findUnique({ where: { id: hackathonId }, select: { title: true, createdById: true, status: true } });
  if (!h) throw notFound("Hackathon introuvable.");
  if (h.status === "DONE") throw new DomainError("done", "Les résultats sont publiés : le jury est figé.", 409);
  if (h.createdById && jurors.includes(h.createdById)) throw new DomainError("jury", "L’organisateur ne peut pas être juré.", 400, "jurorIds");
  const ok = await prisma.user.count({ where: { id: { in: jurors }, seniorVerifiedAt: { not: null }, suspendedAt: null } });
  if (ok !== 3) throw new DomainError("jury", "Les jurés doivent être des mentors KABAD.", 400, "jurorIds");
  if (await prisma.teamMember.count({ where: { hackathonId, userId: { in: jurors } } })) throw new DomainError("jury", "Un juré participe à ce hackathon.", 400, "jurorIds");
  return prisma.$transaction(async (tx) => {
    const before = (await tx.hackathonJuror.findMany({ where: { hackathonId }, select: { userId: true } })).map((j) => j.userId);
    await tx.hackathonJuror.deleteMany({ where: { hackathonId } });
    await tx.hackathonJuror.createMany({ data: jurors.map((userId) => ({ hackathonId, userId })) });
    const added = jurors.filter((id) => !before.includes(id));
    await pushNotifications(tx, added.map((userId) => ({ userId, actor: "KABAD", key: "juryAppointed" as const, params: { title: h.title }, href: `/hackathons/${hackathonId}`, icon: "trophy" as const, tone: "brand" as const })));
    await logAction(tx, adminId, "hackathon:jury", hackathonId, jurors.join(","));
    return { ok: true };
  });
}

export async function badgedMentors(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  return prisma.user.findMany({ where: { seniorVerifiedAt: { not: null }, suspendedAt: null }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" } });
}

export async function auditLog(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const rows = await prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: { select: { name: true } } } });
  // Chaque ligne nomme ce qu'elle vise (membre ou hackathon), et un jury ses jurés, au lieu de leurs identifiants.
  const juryIds = rows.filter((r) => r.action === "hackathon:jury" && r.details).flatMap((r) => r.details!.split(","));
  const targetIds = rows.map((r) => r.targetId).filter((id): id is string => Boolean(id));
  // Une décision sur un signalement vise le signalement : on nomme le membre qu'il concerne.
  const reports = await prisma.report.findMany({ where: { id: { in: targetIds } }, select: { id: true, targetUserId: true } });
  const ids = [...new Set([...targetIds, ...juryIds, ...reports.flatMap((r) => (r.targetUserId ? [r.targetUserId] : []))])];
  const [users, hackathons] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.hackathon.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }),
  ]);
  const names = new Map([...users.map((u) => [u.id, u.name] as const), ...hackathons.map((h) => [h.id, h.title] as const)]);
  for (const r of reports) if (r.targetUserId && names.has(r.targetUserId)) names.set(r.id, names.get(r.targetUserId)!);
  return rows.map((r) => ({
    id: r.id,
    admin: r.admin.name,
    action: r.action,
    targetId: r.targetId,
    target: r.targetId ? (names.get(r.targetId) ?? null) : null,
    details: r.action === "hackathon:jury" && r.details ? r.details.split(",").map((id) => names.get(id) ?? id).join(", ") : r.details,
    createdAt: r.createdAt.toISOString(),
  }));
}

export { HIDDEN_MESSAGE };
