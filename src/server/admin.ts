/*
 * The KABAD team's tools: dashboard figures, moderation of reports, members (verify seniors, suspend),
 * challenges (create, close, publish) and transfers. Every action is checked against isAdmin and logged.
 */
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "./challenges";
import { db, type Db } from "./db";
import { DomainError, notFound } from "./errors";
import { HIDDEN_MESSAGE } from "./messaging";
import { pushNotifications } from "./notifications";
import { endRoom } from "./rooms";
import { notify } from "./realtime-events";

export async function logAction(tx: Prisma.TransactionClient | Db, adminId: string, action: string, targetId?: string | null, details?: string) {
  await tx.adminAction.create({ data: { adminId, action, targetId: targetId ?? null, details: details?.slice(0, 500) } });
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

export async function dashboard(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const [members, newMembers, seniors, pendingSeniors, unverified, suspended, messages7d, openReports, activePairs, confirmed, openChallenges, juryChallenges, liveRooms, pendingPayouts] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.user.count({ where: { isAdmin: false, createdAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { role: "SENIOR", seniorVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { role: "SENIOR", seniorVerifiedAt: null, suspendedAt: null } }),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.message.count({ where: { kind: "TEXT", createdAt: { gte: daysAgo(7) } } }),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.pair.count({ where: { active: true } }),
    prisma.mentoringSession.aggregate({ where: { confirmedByMentor: true, confirmedByMentee: true }, _sum: { minutes: true } }),
    prisma.challenge.count({ where: { status: "OPEN" } }),
    prisma.challenge.count({ where: { status: "JURY" } }),
    prisma.voiceRoom.count({ where: { status: "LIVE" } }),
    prisma.payout.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  return {
    members,
    newMembers,
    seniors,
    pendingSeniors,
    unverified,
    suspended,
    messages7d,
    openReports,
    activePairs,
    confirmedHours: Math.floor((confirmed._sum.minutes ?? 0) / 60),
    openChallenges,
    juryChallenges,
    liveRooms,
    pendingPayouts: { count: pendingPayouts._count._all, amount: pendingPayouts._sum.amount ?? 0 },
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
  targetType: "USER" | "MESSAGE" | "CONVERSATION" | "INVITATION" | "ROOM";
  targetId: string;
  target: { id: string; name: string; suspended: boolean } | null;
  /** How many reports this member has received in total: repeat offenders stand out. */
  targetReports: number;
  /** What was reported, as the team needs to read it (a removed message shows its original text here). */
  excerpt: Array<{ author: string; body: string; reported?: boolean; hidden?: boolean }>;
  messageId: string | null;
  roomId: string | null;
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
    if (r.targetType === "MESSAGE") {
      const m = await prisma.message.findUnique({ where: { id: r.targetId }, select: { id: true, conversationId: true, createdAt: true } });
      if (m) {
        messageId = m.id;
        // The reported message with the two messages before it, for context.
        const around = await prisma.message.findMany({ where: { conversationId: m.conversationId, createdAt: { lte: m.createdAt }, kind: "TEXT" }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } } } });
        excerpt = around.reverse().map((x) => ({ author: x.author?.name ?? "Compte supprimé", body: x.body, reported: x.id === m.id, hidden: x.hiddenAt !== null }));
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
    });
  }
  return out;
}

export type ReportDecision = "dismiss" | "hide" | "warn" | "suspend";

const DECISION_LABEL: Record<ReportDecision, string> = {
  dismiss: "Classé sans suite",
  hide: "Contenu retiré",
  warn: "Membre averti",
  suspend: "Membre suspendu",
};

/** Handles a report. Other open reports on the same thing are closed with it. */
export async function resolveReport(adminId: string, reportId: string, decision: ReportDecision, note: string | undefined, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const r = await prisma.report.findUnique({ where: { id: reportId } });
  if (!r) throw notFound("Signalement introuvable.");
  if (r.status !== "OPEN") throw new DomainError("already_resolved", "Ce signalement est déjà traité.", 409);
  if ((decision === "warn" || decision === "suspend") && !r.targetUserId) throw new DomainError("no_member", "Ce signalement ne vise pas un membre précis.");
  if (decision === "hide" && r.targetType !== "MESSAGE" && r.targetType !== "ROOM") throw new DomainError("not_hideable", "Seuls un message ou un salon peuvent être retirés.");
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
    if (decision === "warn") {
      await pushNotifications(tx, [{ userId: r.targetUserId!, actor: "Équipe KABAD", text: `vous adresse un avertissement : ${note?.trim() || r.reason}. En cas de récidive, votre compte peut être suspendu.`, href: "/compte", icon: "info", tone: "accent" }]);
    }
    await tx.report.updateMany({
      where: { status: "OPEN", OR: [{ id: r.id }, { targetType: r.targetType, targetId: r.targetId }] },
      data: { status: "REVIEWED", resolvedAt: new Date(), resolvedById: adminId, resolution },
    });
    await logAction(tx, adminId, `report:${decision}`, r.id, resolution);
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
  if (adminId === userId) throw new DomainError("self", "Vous ne pouvez pas vous suspendre vous-même.");
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
    await tx.user.update({ where: { id: userId }, data: { suspendedAt: null, suspensionReason: null } });
    await logAction(tx, adminId, "member:reinstate", userId);
  });
  return { ok: true };
}

export async function rejectSenior(adminId: string, userId: string, reason: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { seniorVerifiedAt: null, mentorCapacity: 0, role: "JUNIOR" } });
    await pushNotifications(tx, [{ userId, actor: "Équipe KABAD", text: `n’a pas pu vérifier votre statut Senior : ${reason}. Complétez votre profil GitHub ou LinkedIn puis redemandez.`, href: "/inscription/profil", icon: "info", tone: "neutral" }]);
    await logAction(tx, adminId, "senior:reject", userId, reason);
  });
  return { ok: true };
}

/* Challenges */

export type NewChallenge = {
  title: string;
  kind: "CAGNOTTE" | "SPONSORISE" | "LOT";
  level: string;
  stack: string;
  description: string;
  closesAt: string;
  requiresMentoring: boolean;
  prizeLabel?: string;
  sponsorName?: string;
  sponsorAmount?: number;
  jurorIds: string[];
};

const slug = (title: string) =>
  title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "defi";

/** Three verified seniors form the jury. */
export async function createChallenge(adminId: string, input: NewChallenge, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const jurors = [...new Set(input.jurorIds)];
  if (jurors.length !== 3) throw new DomainError("jury", "Choisissez exactement trois jurés.", 400, "jurorIds");
  const ok = await prisma.user.count({ where: { id: { in: jurors }, role: "SENIOR", seniorVerifiedAt: { not: null }, suspendedAt: null } });
  if (ok !== 3) throw new DomainError("jury", "Les jurés doivent être des seniors vérifiés.", 400, "jurorIds");
  const closesAt = new Date(input.closesAt);
  if (closesAt.getTime() < Date.now() + 86_400_000) throw new DomainError("date", "La clôture doit être dans 24 heures au moins.", 400, "closesAt");
  if (input.kind === "LOT" && !input.prizeLabel) throw new DomainError("prize", "Décrivez le lot.", 400, "prizeLabel");
  if (input.kind === "SPONSORISE" && (!input.sponsorName || !input.sponsorAmount)) throw new DomainError("sponsor", "Indiquez le sponsor et sa dotation.", 400, "sponsorName");
  let id = slug(input.title);
  if (await prisma.challenge.count({ where: { id } })) id = `${id}-${Date.now().toString(36)}`;
  return prisma.$transaction(async (tx) => {
    await tx.challenge.create({
      data: {
        id,
        title: input.title,
        kind: input.kind,
        level: input.level,
        stack: input.stack,
        description: input.description,
        closesAt,
        requiresMentoring: input.requiresMentoring,
        prizeLabel: input.kind === "LOT" ? input.prizeLabel : null,
        sponsorName: input.kind === "SPONSORISE" ? input.sponsorName : null,
        sponsorAmount: input.kind === "SPONSORISE" ? (input.sponsorAmount ?? 0) : 0,
        jurors: { create: jurors.map((userId) => ({ userId })) },
      },
    });
    await pushNotifications(
      tx,
      jurors.map((userId) => ({ userId, actor: "Équipe KABAD", text: `vous a nommé au jury du défi « ${input.title} ».`, href: `/defis/${id}`, icon: "trophy" as const, tone: "accent" as const })),
    );
    await logAction(tx, adminId, "challenge:create", id, input.title);
    return { id };
  });
}

export async function adminChallenges(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const rows = await prisma.challenge.findMany({
    orderBy: [{ status: "asc" }, { closesAt: "asc" }],
    include: { jurors: { select: { user: { select: { id: true, name: true } } } }, _count: { select: { submissions: true } } },
  });
  return rows.map((c) => ({ id: c.id, title: c.title, kind: c.kind, status: c.status, closesAt: c.closesAt.toISOString(), submissions: c._count.submissions, jury: c.jurors.map((j) => j.user.name) }));
}

export async function verifiedSeniors(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  return prisma.user.findMany({ where: { role: "SENIOR", seniorVerifiedAt: { not: null }, suspendedAt: null }, select: { id: true, name: true, city: true }, orderBy: { name: "asc" } });
}

export async function auditLog(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const rows = await prisma.adminAction.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: { select: { name: true } } } });
  return rows.map((r) => ({ id: r.id, admin: r.admin.name, action: r.action, targetId: r.targetId, details: r.details, createdAt: r.createdAt.toISOString() }));
}

export { HIDDEN_MESSAGE };
