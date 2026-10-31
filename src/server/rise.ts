/*
 * Africa Rise-Up, enforced on the server:
 * - any member with a confirmed e-mail launches a project on a real problem of the continent;
 *   the project comes with its members' chat;
 * - members join and leave freely; the initiator cannot leave a project that still has members;
 * - the discussion feed holds posts and their replies; only members write;
 * - members schedule events (checkpoint, workshop…) held on an external video link (decision D7);
 *   the other members are notified, and an event is "live" while it runs.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { joinCommunityGroup, leaveCommunityGroup, openCommunityGroup } from "./messaging";
import { pushNotifications } from "./notifications";
import { jitsiRoom } from "@/lib/mentoring";
import type { RiseDomain, RiseEventView, RisePostView, RiseProjectDetail, RiseProjectSummary } from "@/lib/domain-types";

type Tx = Db | Prisma.TransactionClient;

const isLive = (e: { startsAt: Date; minutes: number }, now = Date.now()) => e.startsAt.getTime() <= now && now < e.startsAt.getTime() + e.minutes * 60_000;

const toEvent = (e: { id: string; title: string; agenda: string; startsAt: Date; minutes: number; meetingUrl: string; projectId: string; project: { name: string } }): RiseEventView => ({
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

const eventSelect = { id: true, title: true, agenda: true, startsAt: true, minutes: true, meetingUrl: true, projectId: true, project: { select: { name: true } } } as const;

/** The event running now, otherwise the next one, for each project. */
async function currentEvents(prisma: Tx, projectIds: string[]) {
  const since = new Date(Date.now() - 6 * 3600_000);
  const rows = await prisma.riseEvent.findMany({ where: { projectId: { in: projectIds }, startsAt: { gte: since } }, select: eventSelect, orderBy: { startsAt: "asc" } });
  const out = new Map<string, RiseEventView>();
  const now = Date.now();
  for (const e of rows) {
    const ended = e.startsAt.getTime() + e.minutes * 60_000 <= now;
    if (ended) continue;
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
  return {
    id: p.id,
    name: p.name,
    domain: p.domain,
    summary: p.summary,
    skills: p.skills,
    members: p.members.length,
    countries: countries.size,
    avatars: p.members.slice(0, 3).map((m) => ({ id: m.user.id, name: m.user.name })),
    event: events.get(p.id) ?? null,
    isMember: viewerId !== null && p.members.some((m) => m.user.id === viewerId),
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
      members: { select: { skill: true, user: { select: { id: true, name: true, country: true, city: true } } }, orderBy: { joinedAt: "asc" } },
      initiator: { select: { id: true, name: true } },
    },
  });
  if (!p) throw notFound("Projet introuvable.");
  const [events, posts, upcoming] = await Promise.all([
    currentEvents(prisma, [id]),
    prisma.risePost.findMany({
      where: { projectId: id, parentId: null, hiddenAt: null },
      include: { author: { select: { id: true, name: true } }, _count: { select: { replies: { where: { hiddenAt: null } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.riseEvent.findMany({ where: { projectId: id, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) } }, select: eventSelect, orderBy: { startsAt: "asc" }, take: 20 }),
  ]);
  const summary = toSummary({ ...p, members: p.members.map((m) => ({ user: m.user })) }, events, viewerId);
  return {
    ...summary,
    problem: p.problem,
    initiator: p.initiator,
    // The chat is for members only.
    conversationId: summary.isMember ? p.conversationId : null,
    posts: posts.map((x) => ({ id: x.id, body: x.body, createdAt: x.createdAt.toISOString(), author: x.author, replies: x._count.replies })),
    events: upcoming.filter((e) => e.startsAt.getTime() + e.minutes * 60_000 > Date.now()).map(toEvent),
    people: p.members.map((m) => ({ id: m.user.id, name: m.user.name, city: m.user.city, skill: m.skill, initiator: m.user.id === p.initiatorId })),
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

export async function joinProject(userId: string, projectId: string, input: { skill?: string } = {}, prisma: Db = db) {
  const p = await prisma.riseProject.findUnique({ where: { id: projectId }, select: { id: true, name: true, initiatorId: true, conversationId: true } });
  if (!p) throw notFound("Projet introuvable.");
  if (await memberOf(prisma, projectId, userId)) return { ok: true };
  return prisma.$transaction(async (tx) => {
    await tx.riseMember.create({ data: { projectId, userId, skill: input.skill ?? "" } });
    if (p.conversationId) await joinCommunityGroup(tx, p.conversationId, userId);
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await pushNotifications(tx, [{ userId: p.initiatorId, actor: me.name, key: "riseJoined", params: { title: p.name }, href: `/rise-up/${projectId}`, icon: "users", tone: "accent" }]);
    return { ok: true };
  });
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
  return { post: view(post, post.replies.length), replies: post.replies.map((r) => view(r)), canReply: viewerId !== null && (await memberOf(prisma, projectId, viewerId)) !== null };
}

/* Events */

export async function createEvent(userId: string, projectId: string, input: { title: string; agenda: string; startsAt: string; minutes: number; meetingUrl?: string; notify: boolean }, prisma: Db = db) {
  if (!(await memberOf(prisma, projectId, userId))) throw forbidden("Seuls les membres du projet programment un événement.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new DomainError("past", "Choisis une date à venir.", 400, "startsAt");
  return prisma.$transaction(async (tx) => {
    const p = await tx.riseProject.findUniqueOrThrow({ where: { id: projectId }, select: { name: true, members: { select: { userId: true, user: { select: { timeZone: true } } } } } });
    const e = await tx.riseEvent.create({
      data: { projectId, createdById: userId, title: input.title, agenda: input.agenda, startsAt, minutes: input.minutes, meetingUrl: input.meetingUrl || jitsiRoom("kabad-riseup") },
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

export async function getEvent(viewerId: string | null, projectId: string, eventId: string, prisma: Db = db) {
  const e = await prisma.riseEvent.findUnique({ where: { id: eventId }, select: { ...eventSelect, createdBy: { select: { id: true, name: true } } } });
  if (!e || e.projectId !== projectId) throw notFound("Événement introuvable.");
  const isMember = viewerId !== null && (await memberOf(prisma, projectId, viewerId)) !== null;
  const view = toEvent(e);
  // The video link is for the project's members.
  return { ...view, meetingUrl: isMember ? view.meetingUrl : "", isMember, createdBy: e.createdBy };
}

/** Upcoming events of the member's projects, for the home screen. */
export async function myUpcomingEvents(userId: string, prisma: Db = db): Promise<RiseEventView[]> {
  const rows = await prisma.riseEvent.findMany({
    where: { project: { members: { some: { userId } } }, startsAt: { gte: new Date(Date.now() - 6 * 3600_000), lte: new Date(Date.now() + 14 * 86_400_000) } },
    select: eventSelect,
    orderBy: { startsAt: "asc" },
    take: 10,
  });
  return rows.filter((e) => e.startsAt.getTime() + e.minutes * 60_000 > Date.now()).map(toEvent);
}
