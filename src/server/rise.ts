/*
 * Africa Rise-Up, enforced on the server:
 * - any member with a confirmed e-mail launches a project on a real problem of the continent;
 *   the project comes with its members' chat;
 * - members join and leave freely; the initiator cannot leave a project that still has members;
 * - the discussion feed holds posts and their replies; only members write;
 * - the initiator leads the project and names co-leads among its members (P5); together they are its leads;
 * - only the leads schedule events (checkpoint, workshop…) held on a Google Meet link, which is required;
 *   the other members are notified, and an event is "live" while it runs;
 * - a room is an event that starts now, on a Google Meet link. A lead opens it at once; any other member
 *   proposes it, and it stays hidden from the project until a lead approves it (it then starts). One room
 *   at a time per project; its author or a lead closes it;
 * - the same people cancel an event that has not started yet: it leaves the project, its reminder
 *   is not sent, and the members who were told about it are told it is cancelled;
 * - anyone reports a post; a lead who reports one hides it at once, with a reason for the KABAD team,
 *   who alone can show it again.
 */
import { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { block, joinCommunityGroup, leaveCommunityGroup, openCommunityGroup } from "./messaging";
import { pushNotifications } from "./notifications";
import type { RiseDomain, RiseEventView, RisePostView, RiseProjectDetail, RiseProjectSummary, RiseRole } from "@/lib/domain-types";

type Tx = Db | Prisma.TransactionClient;

/** How long a room opened on the spot stays "live" unless it is closed before. */
export const ROOM_MINUTES = 60;

type Timed = { startsAt: Date; minutes: number; endedAt: Date | null };
const isOver = (e: Timed, now = Date.now()) => e.endedAt !== null || e.startsAt.getTime() + e.minutes * 60_000 <= now;
const isLive = (e: Timed, now = Date.now()) => e.startsAt.getTime() <= now && !isOver(e, now);

const toEvent = (e: Timed & { id: string; title: string; agenda: string; meetingUrl: string; projectId: string; project: { name: string } }): RiseEventView => ({
  id: e.id,
  title: e.title,
  agenda: e.agenda,
  startsAt: e.startsAt.toISOString(),
  minutes: e.minutes,
  meetingUrl: e.meetingUrl,
  live: isLive(e),
  projectId: e.projectId,
  projectName: e.project.name,
});

const eventSelect = { id: true, title: true, agenda: true, startsAt: true, minutes: true, endedAt: true, meetingUrl: true, projectId: true, project: { select: { name: true } } } as const;

/** The event running now, otherwise the next one, for each project. */
async function currentEvents(prisma: Tx, projectIds: string[]) {
  const since = new Date(Date.now() - 6 * 3600_000);
  const rows = await prisma.riseEvent.findMany({ where: { projectId: { in: projectIds }, startsAt: { gte: since }, approvedAt: { not: null } }, select: eventSelect, orderBy: { startsAt: "asc" } });
  const out = new Map<string, RiseEventView>();
  const now = Date.now();
  for (const e of rows) {
    if (isOver(e, now)) continue;
    const current = out.get(e.projectId);
    if (!current || (!current.live && isLive(e, now))) out.set(e.projectId, toEvent(e));
  }
  return out;
}

const summaryInclude = {
  members: { select: { user: { select: { id: true, name: true, country: true } } }, orderBy: { joinedAt: "asc" } },
} as const;
type SummaryRow = Prisma.RiseProjectGetPayload<{ include: typeof summaryInclude }>;

function toSummary(p: SummaryRow, events: Map<string, RiseEventView>, viewerId: string | null): RiseProjectSummary {
  const countries = new Set(p.members.map((m) => m.user.country).filter(Boolean));
  const isMember = viewerId !== null && p.members.some((m) => m.user.id === viewerId);
  const event = events.get(p.id) ?? null;
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    summary: p.summary,
    skills: p.skills,
    members: p.members.length,
    countries: countries.size,
    avatars: p.members.slice(0, 3).map((m) => ({ id: m.user.id, name: m.user.name })),
    // The video link is for the project's members only.
    event: event && { ...event, meetingUrl: isMember ? event.meetingUrl : "" },
    isMember,
  };
}

export async function listProjects(viewerId: string | null, opts: { domain?: RiseDomain; mine?: boolean } = {}, prisma: Db = db): Promise<RiseProjectSummary[]> {
  const rows = await prisma.riseProject.findMany({
    where: { ...(opts.domain ? { domain: opts.domain } : {}), ...(opts.mine && viewerId ? { members: { some: { userId: viewerId } } } : {}) },
    include: summaryInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const events = await currentEvents(prisma, rows.map((r) => r.id));
  return rows
    .map((r) => toSummary(r, events, viewerId))
    // Live projects first, then the busiest.
    .sort((a, b) => Number(b.event?.live ?? false) - Number(a.event?.live ?? false) || b.members - a.members);
}

export async function getProject(viewerId: string | null, id: string, prisma: Db = db): Promise<RiseProjectDetail> {
  const p = await prisma.riseProject.findUnique({
    where: { id },
    include: {
      members: { select: { skill: true, role: true, user: { select: { id: true, name: true, country: true, city: true } } }, orderBy: { joinedAt: "asc" } },
      initiator: { select: { id: true, name: true } },
    },
  });
  if (!p) throw notFound("Projet introuvable.");
  const roleOf = (m: { role: "MEMBER" | "CO_LEAD"; user: { id: string } }): RiseRole => (m.user.id === p.initiatorId ? "initiator" : m.role === "CO_LEAD" ? "co_lead" : "member");
  const mine = viewerId ? p.members.find((m) => m.user.id === viewerId) : undefined;
  const viewerRole = mine ? roleOf(mine) : null;
  const [events, posts, upcoming, pending] = await Promise.all([
    currentEvents(prisma, [id]),
    prisma.risePost.findMany({
      where: { projectId: id, parentId: null, hiddenAt: null },
      include: { author: { select: { id: true, name: true } }, _count: { select: { replies: { where: { hiddenAt: null } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.riseEvent.findMany({ where: { projectId: id, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) }, approvedAt: { not: null } }, select: eventSelect, orderBy: { startsAt: "asc" }, take: 20 }),
    // Rooms waiting for a lead: the leads see them all, a member only their own.
    viewerRole
      ? prisma.riseEvent.findMany({
          where: { projectId: id, approvedAt: null, endedAt: null, startsAt: { gte: new Date(Date.now() - ROOM_MINUTES * 60_000) }, ...(isLead(viewerRole) ? {} : { createdById: viewerId }) },
          select: { id: true, title: true, createdAt: true, createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const summary = toSummary({ ...p, members: p.members.map((m) => ({ user: m.user })) }, events, viewerId);
  return {
    ...summary,
    problem: p.problem,
    createdAt: p.createdAt.toISOString(),
    initiator: p.initiator,
    // The chat is for members only.
    conversationId: summary.isMember ? p.conversationId : null,
    posts: posts.map((x) => ({ id: x.id, body: x.body, createdAt: x.createdAt.toISOString(), author: x.author, replies: x._count.replies })),
    events: upcoming.filter((e) => !isOver(e)).map((e) => ({ ...toEvent(e), meetingUrl: summary.isMember ? e.meetingUrl : "" })),
    people: p.members.map((m) => ({ id: m.user.id, name: m.user.name, city: m.user.city, skill: m.skill, initiator: m.user.id === p.initiatorId, role: roleOf(m) })),
    viewerRole,
    pendingRooms: pending.map((e) => ({ id: e.id, title: e.title, author: e.createdBy, createdAt: e.createdAt.toISOString() })),
  };
}

export async function createProject(userId: string, input: { name: string; domain: RiseDomain; summary: string; problem: string; skills: string[]; skill?: string }, prisma: Db = db) {
  return prisma.$transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const conversationId = await openCommunityGroup(tx, { name: input.name, theme: "Rise-Up", ownerId: userId, intro: `${me.name.split(" ")[0]} a lancé le projet « ${input.name} »` });
    const p = await tx.riseProject.create({
      data: { name: input.name, domain: input.domain, summary: input.summary, problem: input.problem, skills: input.skills, initiatorId: userId, conversationId, members: { create: { userId, skill: input.skill ?? "" } } },
    });
    return { id: p.id };
  });
}

async function memberOf(prisma: Tx, projectId: string, userId: string) {
  return prisma.riseMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
}

/** The member's role in the project, or null when they are not a member. */
async function roleIn(prisma: Tx, projectId: string, userId: string): Promise<RiseRole | null> {
  const m = await prisma.riseMember.findUnique({ where: { projectId_userId: { projectId, userId } }, select: { role: true, project: { select: { initiatorId: true } } } });
  if (!m) return null;
  return m.project.initiatorId === userId ? "initiator" : m.role === "CO_LEAD" ? "co_lead" : "member";
}

/** The initiator and the co-leads lead the project. */
const isLead = (role: RiseRole | null) => role === "initiator" || role === "co_lead";

/** The leads of a project, to notify: the initiator and the co-leads. */
async function leadIds(prisma: Tx, projectId: string) {
  const p = await prisma.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { initiatorId: true, members: { where: { role: "CO_LEAD" }, select: { userId: true } } } });
  return [...new Set([p.initiatorId, ...p.members.map((m) => m.userId)])];
}

/**
 * The initiator names a member co-lead, or takes the role back (P5). A co-lead schedules events, approves
 * the rooms proposed by the members and hides a post when reporting it.
 */
export async function setCoLead(userId: string, projectId: string, memberId: string, coLead: boolean, prisma: Db = db) {
  const p = await prisma.riseProject.findUnique({ where: { id: projectId }, select: { name: true, initiatorId: true } });
  if (!p) throw notFound("Projet introuvable.");
  if (p.initiatorId !== userId) throw forbidden("Seul l’initiateur du projet nomme les co-responsables.");
  if (memberId === userId) throw new DomainError("initiator", "Tu es déjà le responsable de ce projet.", 409);
  const m = await memberOf(prisma, projectId, memberId);
  if (!m) throw notFound("Ce membre ne fait pas partie du projet.");
  if ((m.role === "CO_LEAD") === coLead) return { ok: true };
  return prisma.$transaction(async (tx) => {
    await tx.riseMember.update({ where: { projectId_userId: { projectId, userId: memberId } }, data: { role: coLead ? "CO_LEAD" : "MEMBER" } });
    if (coLead) {
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      await pushNotifications(tx, [{ userId: memberId, actor: me.name, key: "riseCoLead", params: { title: p.name }, href: `/rise-up/${projectId}`, icon: "users", tone: "accent" }]);
    }
    return { ok: true };
  });
}

export async function joinProject(userId: string, projectId: string, input: { skill?: string } = {}, prisma: Db = db) {
  const p = await prisma.riseProject.findUnique({ where: { id: projectId }, select: { id: true, name: true, initiatorId: true, conversationId: true } });
  if (!p) throw notFound("Projet introuvable.");
  if (await memberOf(prisma, projectId, userId)) return { ok: true };
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.riseMember.create({ data: { projectId, userId, skill: input.skill ?? "" } });
      if (p.conversationId) await joinCommunityGroup(tx, p.conversationId, userId);
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
      // A member who leaves then joins again is announced to the initiator once only.
      const told = await tx.notification.findFirst({ where: { userId: p.initiatorId, key: "riseJoined", actor: me.name, href: `/rise-up/${projectId}` }, select: { id: true } });
      if (!told) await pushNotifications(tx, [{ userId: p.initiatorId, actor: me.name, key: "riseJoined", params: { title: p.name }, href: `/rise-up/${projectId}`, icon: "users", tone: "accent" }]);
      return { ok: true };
    });
  } catch (e) {
    // Two taps on « Rejoindre » at once: the second one finds the member already there.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: true };
    throw e;
  }
}

export async function leaveProject(userId: string, projectId: string, prisma: Db = db) {
  const p = await prisma.riseProject.findUnique({ where: { id: projectId }, select: { initiatorId: true, conversationId: true, _count: { select: { members: true } } } });
  if (!p || !(await memberOf(prisma, projectId, userId))) throw notFound("Projet introuvable.");
  if (p.initiatorId === userId && p._count.members > 1) throw new DomainError("initiator", "Tu as lancé ce projet : il ne peut pas rester sans toi tant qu’il a des membres.", 409);
  return prisma.$transaction(async (tx) => {
    await tx.riseMember.delete({ where: { projectId_userId: { projectId, userId } } });
    if (p.conversationId) await leaveCommunityGroup(tx, p.conversationId, userId);
    return { ok: true };
  });
}

/* Discussion feed */

export async function addPost(userId: string, projectId: string, input: { body: string; parentId?: string }, prisma: Db = db) {
  if (!(await memberOf(prisma, projectId, userId))) throw forbidden("Rejoins le projet pour participer à la discussion.");
  if (input.parentId) {
    const parent = await prisma.risePost.findUnique({ where: { id: input.parentId }, select: { projectId: true, parentId: true, authorId: true } });
    // One level of replies, as in the design: a reply answers a post, not another reply.
    if (!parent || parent.projectId !== projectId || parent.parentId) throw notFound("Message introuvable.");
  }
  const post = await prisma.risePost.create({ data: { projectId, authorId: userId, body: input.body, parentId: input.parentId ?? null } });
  return { id: post.id };
}

export async function getThread(viewerId: string | null, projectId: string, postId: string, prisma: Db = db) {
  const post = await prisma.risePost.findUnique({
    where: { id: postId },
    include: { author: { select: { id: true, name: true } }, replies: { where: { hiddenAt: null }, include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!post || post.projectId !== projectId || post.hiddenAt) throw notFound("Message introuvable.");
  const view = (x: { id: string; body: string; createdAt: Date; author: { id: string; name: string } | null }, replies = 0): RisePostView => ({ id: x.id, body: x.body, createdAt: x.createdAt.toISOString(), author: x.author, replies });
  const role = viewerId ? await roleIn(prisma, projectId, viewerId) : null;
  // `lead`: a lead of the project hides a post at once when reporting it.
  return { post: view(post, post.replies.length), replies: post.replies.map((r) => view(r)), canReply: role !== null, lead: isLead(role) };
}

/**
 * Reports a post or a reply (P5). The KABAD team reads every report. A lead of the project who reports a post
 * hides it at once from the project: the reason is required, and only the team can show it again.
 */
export async function reportPost(userId: string, postId: string, input: { reason: string; details?: string; block: boolean }, prisma: Db = db) {
  const post = await prisma.risePost.findUnique({ where: { id: postId }, select: { id: true, projectId: true, authorId: true, hiddenAt: true } });
  if (!post || post.hiddenAt) throw notFound("Message introuvable.");
  const lead = isLead(await roleIn(prisma, post.projectId, userId));
  const details = input.details?.trim() || undefined;
  if (lead && (!details || details.length < 10)) throw new DomainError("reason_required", "Explique en une phrase pourquoi tu masques ce message : l’équipe KABAD le lira.", 400, "details");
  await prisma.$transaction(async (tx) => {
    if (lead) await tx.risePost.update({ where: { id: postId }, data: { hiddenAt: new Date(), hiddenById: userId, hiddenReason: details } });
    // Two reports on the same post by the same member count once.
    const already = await tx.report.count({ where: { reporterId: userId, targetType: "RISE_POST", targetId: postId, status: "OPEN" } });
    if (!already) await tx.report.create({ data: { reporterId: userId, targetType: "RISE_POST", targetId: postId, targetUserId: post.authorId, reason: input.reason, details } });
  });
  if (input.block && post.authorId && post.authorId !== userId) await block(userId, post.authorId, prisma);
  return { ok: true, hidden: lead };
}

/* Events */

export async function createEvent(userId: string, projectId: string, input: { title: string; agenda: string; startsAt: string; minutes: number; meetingUrl: string; notify: boolean }, prisma: Db = db) {
  if (!isLead(await roleIn(prisma, projectId, userId))) throw forbidden("Seuls le responsable et les co-responsables du projet programment un événement.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new DomainError("past", "Choisis une date à venir.", 400, "startsAt");
  return prisma.$transaction(async (tx) => {
    const p = await tx.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { name: true, members: { select: { userId: true, user: { select: { timeZone: true } } } } } });
    const e = await tx.riseEvent.create({
      // « Prévenir les membres » décoché : ni notification maintenant, ni rappel une heure avant.
      // Less than an hour before it starts, the notice sent now already plays the reminder: it is marked as sent.
      data: { projectId, createdById: userId, title: input.title, agenda: input.agenda, startsAt, minutes: input.minutes, meetingUrl: input.meetingUrl, remind: input.notify, remindedAt: input.notify && startsAt.getTime() - Date.now() <= 3600_000 ? new Date() : null, approvedAt: new Date() },
    });
    if (input.notify) {
      await pushNotifications(
        tx,
        p.members.filter((m) => m.userId !== userId).map((m) => ({ userId: m.userId, actor: p.name, key: "riseEvent", params: { title: input.title, at: startsAt.toISOString(), tz: m.user.timeZone }, href: `/rise-up/${projectId}/evenements/${e.id}`, icon: "radio", tone: "accent" })),
      );
    }
    return { id: e.id };
  });
}

/** Rooms that keep the project busy: live, and approved. */
async function liveRoom(tx: Tx, projectId: string, now: Date) {
  const recent = await tx.riseEvent.findMany({ where: { projectId, endedAt: null, approvedAt: { not: null }, startsAt: { lte: now, gte: new Date(now.getTime() - 6 * 3600_000) } }, select: { startsAt: true, minutes: true, endedAt: true } });
  return recent.some((e) => isLive(e, now.getTime()));
}

/** Tells the project's members that a room is live, except the one who opened or approved it. */
async function announceRoom(tx: Prisma.TransactionClient, projectId: string, eventId: string, title: string, exceptId: string) {
  const p = await tx.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { name: true, members: { select: { userId: true } } } });
  await pushNotifications(
    tx,
    p.members.filter((m) => m.userId !== exceptId).map((m) => ({ userId: m.userId, actor: p.name, key: "roomLive", params: { title }, href: `/rise-up/${projectId}/evenements/${eventId}`, icon: "radio", tone: "accent" })),
  );
}

/**
 * Opens a room in the project's channel: a video call that starts now, on the member's Google Meet link.
 * A lead opens it at once and the members are told. Another member proposes it: the leads are told, and the
 * room stays hidden from the project until one of them approves it (P5). One room at a time per project.
 */
export async function openRoom(userId: string, projectId: string, input: { title?: string; meetingUrl: string }, prisma: Db = db) {
  const role = await roleIn(prisma, projectId, userId);
  if (!role) throw forbidden("Seuls les membres du projet ouvrent un salon.");
  const lead = isLead(role);
  return prisma.$transaction(async (tx) => {
    // The project row is locked: two members opening a room at the same moment get one room.
    await tx.$queryRaw`SELECT 1 FROM "RiseProject" WHERE "id" = ${projectId} FOR UPDATE`;
    const now = new Date();
    if (await liveRoom(tx, projectId, now)) throw new DomainError("room_open", "Un salon est déjà ouvert dans ce canal. Rejoins-le.", 409);
    if (!lead && (await tx.riseEvent.count({ where: { projectId, createdById: userId, approvedAt: null, endedAt: null, startsAt: { gte: new Date(now.getTime() - ROOM_MINUTES * 60_000) } } }))) {
      throw new DomainError("room_pending", "Ton salon attend déjà la validation d’un responsable du projet.", 409);
    }
    const title = input.title || "Salon de discussion";
    const e = await tx.riseEvent.create({ data: { projectId, createdById: userId, title, agenda: "", startsAt: now, minutes: ROOM_MINUTES, meetingUrl: input.meetingUrl, remind: false, approvedAt: lead ? now : null } });
    if (lead) {
      await announceRoom(tx, projectId, e.id, title, userId);
    } else {
      const [p, me] = await Promise.all([tx.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } }), tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } })]);
      await pushNotifications(
        tx,
        (await leadIds(tx, projectId)).map((id) => ({ userId: id, actor: me.name, key: "roomProposed", params: { title, project: p.name }, href: `/rise-up/${projectId}/evenements/${e.id}`, icon: "radio", tone: "accent" })),
      );
    }
    return { id: e.id, pending: !lead };
  });
}

/**
 * A lead answers a proposed room. Approved, it starts now (for the planned hour) and the members are told;
 * refused, it is closed and its author is told.
 */
export async function answerRoom(userId: string, projectId: string, eventId: string, approve: boolean, prisma: Db = db) {
  if (!isLead(await roleIn(prisma, projectId, userId))) throw forbidden("Seuls le responsable et les co-responsables du projet valident un salon.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "RiseProject" WHERE "id" = ${projectId} FOR UPDATE`;
    const now = new Date();
    const e = await tx.riseEvent.findUnique({ where: { id: eventId }, select: { projectId: true, title: true, createdById: true, approvedAt: true, endedAt: true, startsAt: true, minutes: true } });
    if (!e || e.projectId !== projectId) throw notFound("Salon introuvable.");
    if (e.approvedAt || e.endedAt || isOver(e, now.getTime())) throw new DomainError("answered", "Ce salon n’attend plus de validation.", 409);
    if (approve) {
      if (await liveRoom(tx, projectId, now)) throw new DomainError("room_open", "Un salon est déjà ouvert dans ce canal. Ferme-le avant d’en valider un autre.", 409);
      await tx.riseEvent.update({ where: { id: eventId }, data: { approvedAt: now, startsAt: now } });
      await announceRoom(tx, projectId, eventId, e.title, userId);
    } else {
      await tx.riseEvent.update({ where: { id: eventId }, data: { endedAt: now } });
      if (e.createdById && e.createdById !== userId) {
        const p = await tx.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } });
        await pushNotifications(tx, [{ userId: e.createdById, actor: p.name, key: "roomRefused", params: { title: e.title }, href: `/rise-up/${projectId}`, icon: "radio", tone: "neutral" }]);
      }
    }
    return { ok: true };
  });
}

/** An event ended before it started was cancelled. */
const isCancelled = (e: Timed) => e.endedAt !== null && e.endedAt.getTime() < e.startsAt.getTime();

/**
 * Closes a live room or event before its planned end, or cancels an event that has not started yet.
 * Its author and the project's initiator may do it. Both end the event the same way (endedAt):
 * it leaves the project's screens, and the reminder job skips it.
 */
export async function closeRoom(userId: string, projectId: string, eventId: string, prisma: Db = db) {
  const e = await prisma.riseEvent.findUnique({
    where: { id: eventId },
    select: { projectId: true, createdById: true, title: true, startsAt: true, minutes: true, endedAt: true, remind: true, project: { select: { name: true, initiatorId: true, members: { select: { userId: true, user: { select: { timeZone: true } } } } } } },
  });
  if (!e || e.projectId !== projectId) throw notFound("Événement introuvable.");
  if (e.createdById !== userId && !isLead(await roleIn(prisma, projectId, userId))) throw forbidden("Seul son auteur ou un responsable du projet ferme ou annule cet événement.");
  if (isOver(e)) throw new DomainError("over", "Cet événement est déjà terminé.", 409);
  const now = new Date();
  const upcoming = e.startsAt.getTime() > now.getTime();
  return prisma.$transaction(async (tx) => {
    // endedAt: null in the condition: two taps at once end it only once, and notify only once.
    const { count } = await tx.riseEvent.updateMany({ where: { id: eventId, endedAt: null }, data: { endedAt: now } });
    // The members told when it was scheduled are told it is cancelled.
    if (count === 1 && upcoming && e.remind) {
      await pushNotifications(
        tx,
        e.project.members.filter((m) => m.userId !== userId).map((m) => ({ userId: m.userId, actor: e.project.name, key: "riseEventCancelled", params: { title: e.title, at: e.startsAt.toISOString(), tz: m.user.timeZone }, href: `/rise-up/${projectId}`, icon: "radio", tone: "neutral" })),
      );
    }
    return { ok: true, cancelled: upcoming };
  });
}

export async function getEvent(viewerId: string | null, projectId: string, eventId: string, prisma: Db = db) {
  const e = await prisma.riseEvent.findUnique({ where: { id: eventId }, select: { ...eventSelect, approvedAt: true, createdBy: { select: { id: true, name: true } }, project: { select: { name: true, initiatorId: true } } } });
  if (!e || e.projectId !== projectId) throw notFound("Événement introuvable.");
  const role = viewerId ? await roleIn(prisma, projectId, viewerId) : null;
  const isMember = role !== null;
  const pending = e.approvedAt === null;
  // A proposed room is seen by its author and the leads only, until a lead approves it.
  if (pending && !isLead(role) && e.createdBy?.id !== viewerId) throw notFound("Événement introuvable.");
  const view = toEvent(e);
  // The video link is for the project's members.
  return {
    ...view,
    meetingUrl: isMember ? view.meetingUrl : "",
    isMember,
    ended: isOver(e),
    cancelled: isCancelled(e),
    // A live event is closed, an upcoming one cancelled; an event over is left as it is.
    canClose: !isOver(e) && viewerId !== null && (e.createdBy?.id === viewerId || isLead(role)),
    // A proposed room: a lead approves or refuses it.
    pending,
    canApprove: pending && !isOver(e) && isLead(role),
    createdBy: e.createdBy,
  };
}

/** Upcoming events of the member's projects, for the home screen. */
export async function myUpcomingEvents(userId: string, prisma: Db = db): Promise<RiseEventView[]> {
  const rows = await prisma.riseEvent.findMany({
    where: { project: { members: { some: { userId } } }, approvedAt: { not: null }, startsAt: { gte: new Date(Date.now() - 6 * 3600_000), lte: new Date(Date.now() + 14 * 86_400_000) } },
    select: eventSelect,
    orderBy: { startsAt: "asc" },
    take: 10,
  });
  return rows.filter((e) => !isOver(e)).map(toEvent);
}
