/*
 * Hackathons (the former code challenges), enforced on the server:
 * - an organizer proposes a hackathon; the KABAD team publishes it after review;
 * - members enter alone or as a team until registrations close; a member is in one team per hackathon;
 *   joining a team goes through a request the captain accepts;
 * - each team sends one solution, editable until the end of the hackathon, which then goes to the jury
 *   (the worker records the change, src/server/jobs.ts);
 * - hackathons that require mentoring accept only members who held that much mentoring time (level 3 of D6);
 * - three badged mentors score each solution anonymously on 4 criteria; the mark is the average of their totals;
 * - publishing the results splits the pot: 60/30/10 with a mentor (level 3), 90/10 without (level 2);
 *   transfers are sent by Mobile Money after a 48 h contest period, then marked as sent with their reference;
 * - organizers offer paid instructor missions to badged mentors; KABAD records them, the organizer pays.
 */
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { eligibility, mainMentor, mentoredBy } from "./mentoring";
import { pushNotifications, type NotificationInput } from "./notifications";
import { averageMark, totalScore } from "@/lib/jury";
import { splitPrize } from "@/lib/prize";
import { formatDuration } from "@/lib/format";
import type { ContributionView, HackathonDetail, HackathonResults, HackathonSummary, JuryItem, MissionView, PayoutView, RankingRow, TeamView } from "@/lib/domain-types";

export const CONTEST_HOURS = 48;
type Tx = Db | Prisma.TransactionClient;

/** With the jury: recorded as such, or past its end and not recorded yet by the worker. */
const inJury = (h: { status: string; endsAt: Date }) => h.status === "JURY" || (h.status === "OPEN" && h.endsAt.getTime() <= Date.now());

export async function requireAdmin(userId: string, prisma: Tx = db) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!u?.isAdmin) throw forbidden("Action réservée à l’équipe KABAD.");
}

const hasCash = (h: { prizeKind: string | null }) => h.prizeKind === "CAGNOTTE" || h.prizeKind === "SPONSORISE";

type Totals = { pot: number; contributors: number; companies: number; teams: number; participants: number; instructors: number };

async function totals(ids: string[], prisma: Tx): Promise<Map<string, Totals>> {
  const [hackathons, paid, companies, teams, seats, missions] = await Promise.all([
    prisma.hackathon.findMany({ where: { id: { in: ids } }, select: { id: true, sponsorAmount: true, sponsorName: true } }),
    prisma.contribution.groupBy({ by: ["hackathonId"], where: { hackathonId: { in: ids }, status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.contribution.groupBy({ by: ["hackathonId"], where: { hackathonId: { in: ids }, status: "PAID", company: true }, _count: { _all: true } }),
    prisma.team.groupBy({ by: ["hackathonId"], where: { hackathonId: { in: ids } }, _count: { _all: true } }),
    prisma.teamMember.groupBy({ by: ["hackathonId"], where: { hackathonId: { in: ids } }, _count: { _all: true } }),
    prisma.instructorMission.groupBy({ by: ["hackathonId"], where: { hackathonId: { in: ids }, status: "ACCEPTED" }, _count: { _all: true } }),
  ]);
  const out = new Map<string, Totals>();
  for (const h of hackathons) out.set(h.id, { pot: h.sponsorAmount, contributors: h.sponsorAmount > 0 ? 1 : 0, companies: h.sponsorName ? 1 : 0, teams: 0, participants: 0, instructors: 0 });
  for (const p of paid) {
    const t = out.get(p.hackathonId)!;
    t.pot += p._sum.amount ?? 0;
    t.contributors += p._count._all;
  }
  for (const c of companies) out.get(c.hackathonId)!.companies += c._count._all;
  for (const t of teams) out.get(t.hackathonId)!.teams = t._count._all;
  for (const s of seats) out.get(s.hackathonId)!.participants = s._count._all;
  for (const m of missions) out.get(m.hackathonId)!.instructors = m._count._all;
  return out;
}

const summarySelect = {
  id: true,
  title: true,
  organizerName: true,
  format: true,
  city: true,
  startsAt: true,
  endsAt: true,
  closesAt: true,
  teamMin: true,
  teamMax: true,
  status: true,
  level: true,
  stack: true,
  prizeKind: true,
  prizes: true,
  sponsorName: true,
  mentoringMinutes: true,
  instructorCount: true,
  publishedAt: true,
  resultsAt: true,
} as const;
type SummaryRow = Prisma.HackathonGetPayload<{ select: typeof summarySelect }>;

async function summaries(rows: SummaryRow[], prisma: Tx): Promise<HackathonSummary[]> {
  const t = await totals(rows.map((r) => r.id), prisma);
  const winners = new Map<string, { team: string; captain: string }>();
  for (const r of rows.filter((x) => x.status === "DONE")) {
    const top = (await ranking(r.id, prisma))[0];
    if (top) winners.set(r.id, { team: top.team, captain: top.captain });
  }
  return rows.map(({ publishedAt, ...r }) => {
    const { instructors, ...rest } = t.get(r.id)!;
    return {
      ...r,
      published: publishedAt !== null,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      closesAt: r.closesAt.toISOString(),
      resultsAt: r.resultsAt?.toISOString() ?? null,
      // Past its end, a hackathon is with the jury even before the worker records it.
      status: r.status === "OPEN" && r.endsAt.getTime() <= Date.now() ? ("JURY" as const) : r.status,
      ...rest,
      instructors,
      winner: winners.get(r.id) ?? null,
    };
  });
}

/** Published hackathons, plus the viewer's own proposals still under review. */
export async function listHackathons(viewerId: string | null, prisma: Db = db): Promise<HackathonSummary[]> {
  const rows = await prisma.hackathon.findMany({
    where: { OR: [{ publishedAt: { not: null } }, ...(viewerId ? [{ createdById: viewerId }] : [])] },
    select: summarySelect,
    orderBy: { startsAt: "asc" },
  });
  return summaries(rows, prisma);
}

const teamInclude = {
  members: { include: { user: { select: { id: true, name: true, city: true } } }, orderBy: { joinedAt: "asc" } },
  requests: { where: { status: "PENDING" }, include: { user: { select: { id: true, name: true, city: true } } }, orderBy: { createdAt: "asc" } },
  submission: true,
} as const;
type TeamRow = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

function toTeam(t: TeamRow, viewerId: string): TeamView {
  return {
    id: t.id,
    name: t.name,
    solo: t.solo,
    lookingFor: t.lookingFor,
    captainId: t.captainId,
    members: t.members.map((m) => ({ ...m.user, skill: m.skill })),
    // Only the captain sees who asks to join.
    requests: viewerId === t.captainId ? t.requests.map((r) => ({ id: r.id, user: r.user, createdAt: r.createdAt.toISOString() })) : [],
    submission: t.submission && {
      projectName: t.submission.projectName,
      repoUrl: t.submission.repoUrl,
      demoUrl: t.submission.demoUrl,
      explanation: t.submission.explanation,
      payoutOperator: t.submission.payoutOperator,
      payoutPhone: t.submission.payoutPhone,
      updatedAt: t.submission.updatedAt.toISOString(),
    },
  };
}

async function teamOf(prisma: Tx, hackathonId: string, userId: string) {
  const seat = await prisma.teamMember.findUnique({ where: { hackathonId_userId: { hackathonId, userId } }, select: { teamId: true } });
  if (!seat) return null;
  return prisma.team.findUniqueOrThrow({ where: { id: seat.teamId }, include: teamInclude });
}

export async function getHackathon(viewerId: string | null, id: string, prisma: Db = db): Promise<HackathonDetail> {
  const h = await prisma.hackathon.findUnique({
    where: { id },
    select: {
      ...summarySelect,
      description: true,
      rulesUrl: true,
      missionText: true,
      instructorFee: true,
      publishedAt: true,
      createdById: true,
      jurors: { select: { user: { select: { id: true, name: true } } } },
      missions: { where: { status: "ACCEPTED" }, select: { mentor: { select: { id: true, name: true } } } },
    },
  });
  const viewer = viewerId ? await prisma.user.findUnique({ where: { id: viewerId }, select: { isAdmin: true } }) : null;
  const canEdit = viewerId !== null && (h?.createdById === viewerId || viewer?.isAdmin === true);
  if (!h || (!h.publishedAt && !canEdit)) throw notFound("Hackathon introuvable.");
  const [summary] = await summaries([h], prisma);
  const myTeam = viewerId ? await teamOf(prisma, id, viewerId) : null;
  const open = await prisma.team.findMany({
    where: { hackathonId: id, solo: false },
    select: { id: true, name: true, lookingFor: true, _count: { select: { members: true } }, requests: viewerId ? { where: { userId: viewerId, status: "PENDING" }, select: { id: true } } : false },
    orderBy: { createdAt: "asc" },
  });
  return {
    ...summary,
    description: h.description,
    rulesUrl: h.rulesUrl,
    missionText: h.missionText,
    instructorFee: h.instructorFee,
    jury: h.jurors.map((j) => j.user),
    instructorsList: h.missions.map((m) => m.mentor),
    amJuror: viewerId !== null && h.jurors.some((j) => j.user.id === viewerId),
    myTeam: myTeam && viewerId ? toTeam(myTeam, viewerId) : null,
    openTeams: open
      .filter((t) => t._count.members < h.teamMax && t.id !== myTeam?.id)
      .map((t) => ({ id: t.id, name: t.name, lookingFor: t.lookingFor, members: t._count.members, requested: Array.isArray(t.requests) && t.requests.length > 0 })),
    published: h.publishedAt !== null,
    canEdit,
  };
}

/* Organizers */

export type HackathonInput = {
  title: string;
  organizerName: string;
  format: "ONLINE" | "ONSITE" | "HYBRID";
  city?: string;
  startsAt: string;
  endsAt: string;
  closesAt: string;
  teamMin: number;
  teamMax: number;
  level: string;
  stack: string;
  description: string;
  rulesUrl?: string;
  prizeKind?: "CAGNOTTE" | "SPONSORISE" | "LOT";
  prizes: string[];
  sponsorName?: string;
  sponsorAmount?: number;
  mentoringMinutes?: number;
  missionText?: string;
  instructorFee?: number;
  instructorCount?: number;
};

function slug(title: string) {
  const base = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "hackathon"}-${randomBytes(3).toString("hex")}`;
}

function checkDates(input: Pick<HackathonInput, "startsAt" | "endsAt" | "closesAt" | "teamMin" | "teamMax" | "format" | "city">) {
  const start = new Date(input.startsAt).getTime();
  const end = new Date(input.endsAt).getTime();
  const close = new Date(input.closesAt).getTime();
  if (!(start < end)) throw new DomainError("dates", "La fin doit venir après le début.", 400, "endsAt");
  if (close > start) throw new DomainError("dates", "Les inscriptions se closent au plus tard au début du hackathon.", 400, "closesAt");
  if (close <= Date.now()) throw new DomainError("dates", "La clôture des inscriptions doit être dans le futur.", 400, "closesAt");
  if (input.teamMin > input.teamMax) throw new DomainError("team", "La taille minimale dépasse la taille maximale.", 400, "teamMin");
  if (input.format !== "ONLINE" && !input.city) throw new DomainError("city", "Indique la ville du hackathon.", 400, "city");
}

/** An organizer proposes a hackathon. It stays hidden until the KABAD team publishes it. */
export async function createHackathon(userId: string, input: HackathonInput, prisma: Db = db) {
  checkDates(input);
  const creator = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  return prisma.$transaction(async (tx) => {
    const h = await tx.hackathon.create({
      data: {
        id: slug(input.title),
        title: input.title,
        organizerName: input.organizerName,
        createdById: userId,
        format: input.format,
        city: input.format === "ONLINE" ? null : input.city!,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        closesAt: new Date(input.closesAt),
        teamMin: input.teamMin,
        teamMax: input.teamMax,
        level: input.level,
        stack: input.stack,
        description: input.description,
        rulesUrl: input.rulesUrl || null,
        prizeKind: input.prizeKind ?? null,
        prizes: input.prizes,
        sponsorName: input.sponsorName || null,
        sponsorAmount: input.sponsorAmount ?? 0,
        mentoringMinutes: input.mentoringMinutes ?? 0,
        missionText: input.missionText || null,
        instructorFee: input.instructorFee ?? null,
        instructorCount: input.instructorCount ?? 0,
      },
    });
    const admins = await tx.user.findMany({ where: { isAdmin: true, suspendedAt: null }, select: { id: true } });
    await pushNotifications(tx, admins.map((a) => ({ userId: a.id, actor: creator.name, key: "hackathonProposed", params: { title: input.title }, href: `/hackathons/${h.id}`, icon: "trophy", tone: "brand" })));
    return { id: h.id };
  });
}

/** The KABAD team publishes a proposed hackathon: it becomes visible to every member. */
export async function publishHackathon(adminId: string, id: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  return prisma.$transaction(async (tx) => {
    const h = await tx.hackathon.findUnique({ where: { id }, select: { title: true, createdById: true, publishedAt: true } });
    if (!h) throw notFound("Hackathon introuvable.");
    if (h.publishedAt) throw new DomainError("published", "Ce hackathon est déjà publié.", 409);
    await tx.hackathon.update({ where: { id }, data: { publishedAt: new Date() } });
    await tx.adminAction.create({ data: { adminId, action: "hackathon:publish", targetId: id } });
    if (h.createdById) await pushNotifications(tx, [{ userId: h.createdById, actor: "KABAD", key: "hackathonPublished", params: { title: h.title }, href: `/hackathons/${id}`, icon: "trophy", tone: "success" }]);
    return { ok: true };
  });
}

/* Registration and teams */

async function openForEntries(prisma: Tx, hackathonId: string, userId: string) {
  const h = await prisma.hackathon.findUnique({ where: { id: hackathonId }, include: { jurors: { select: { userId: true } } } });
  if (!h || !h.publishedAt) throw notFound("Hackathon introuvable.");
  if (h.status !== "OPEN" || h.closesAt.getTime() <= Date.now()) throw new DomainError("closed", "Les inscriptions à ce hackathon sont closes.", 409);
  if (h.jurors.some((j) => j.userId === userId)) throw forbidden("Tu fais partie du jury de ce hackathon : tu ne peux pas y participer.");
  if (h.mentoringMinutes > 0) {
    const e = await eligibility(userId, h.mentoringMinutes, prisma);
    if (!e.eligible) throw forbidden(`Ce hackathon demande ${formatDuration(h.mentoringMinutes)} de mentorat. Il te manque ${formatDuration(e.missing)}.`);
  }
  return h;
}

const alreadyIn = () => new DomainError("already_in", "Tu es déjà inscrit à ce hackathon.", 409);

export async function register(
  userId: string,
  hackathonId: string,
  input: { mode: "solo" | "create" | "join"; teamName?: string; teamId?: string; skill?: string; lookingFor?: string },
  prisma: Db = db,
) {
  const h = await openForEntries(prisma, hackathonId, userId);
  if (await prisma.teamMember.count({ where: { hackathonId, userId } })) throw alreadyIn();
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const skill = input.skill ?? "";

  if (input.mode === "join") {
    const team = await prisma.team.findUnique({ where: { id: input.teamId ?? "" }, include: { _count: { select: { members: true } } } });
    if (!team || team.hackathonId !== hackathonId || team.solo) throw notFound("Équipe introuvable.");
    if (team._count.members >= h.teamMax) throw new DomainError("full", "Cette équipe est complète.", 409);
    return prisma.$transaction(async (tx) => {
      const r = await tx.teamJoinRequest.upsert({ where: { teamId_userId: { teamId: team.id, userId } }, create: { teamId: team.id, userId }, update: { status: "PENDING", answeredAt: null } });
      await pushNotifications(tx, [{ userId: team.captainId, actor: me.name, key: "teamJoinRequested", params: { team: team.name, title: h.title }, href: `/hackathons/${hackathonId}/equipe`, icon: "users", tone: "brand" }]);
      return { requestId: r.id };
    });
  }

  if (input.mode === "solo" && h.teamMin > 1) throw new DomainError("team_only", `Ce hackathon se joue en équipe de ${h.teamMin} à ${h.teamMax}.`, 409);
  if (input.mode === "create" && h.teamMax === 1) throw new DomainError("solo_only", "Ce hackathon se joue seul.", 409);
  const name = input.mode === "solo" ? me.name.slice(0, 40) : (input.teamName ?? "").trim();
  if (!name) throw new DomainError("team_name", "Donne un nom à ton équipe.", 400, "teamName");
  try {
    return await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { hackathonId, name, captainId: userId, solo: input.mode === "solo", lookingFor: input.mode === "create" ? input.lookingFor || null : null } });
      await tx.teamMember.create({ data: { teamId: team.id, userId, hackathonId, skill } });
      // Requests sent to other teams no longer make sense.
      await tx.teamJoinRequest.updateMany({ where: { userId, status: "PENDING", team: { hackathonId } }, data: { status: "DECLINED", answeredAt: new Date() } });
      return { teamId: team.id };
    });
  } catch (e) {
    const code = (e as { code?: string; meta?: { target?: string[] } }).code;
    if (code === "P2002") {
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      if (target.includes("name")) throw new DomainError("team_taken", "Une équipe porte déjà ce nom dans ce hackathon.", 409, "teamName");
      throw alreadyIn();
    }
    throw e;
  }
}

export async function answerJoinRequest(captainId: string, requestId: string, accept: boolean, prisma: Db = db) {
  const r = await prisma.teamJoinRequest.findUnique({ where: { id: requestId }, include: { team: { include: { hackathon: true, _count: { select: { members: true } } } } } });
  if (!r || r.team.captainId !== captainId) throw notFound("Demande introuvable.");
  if (r.status !== "PENDING") throw new DomainError("answered", "Cette demande a déjà reçu une réponse.", 409);
  const h = r.team.hackathon;
  if (accept) {
    if (h.status !== "OPEN" || h.closesAt.getTime() <= Date.now()) throw new DomainError("closed", "Les inscriptions sont closes.", 409);
    if (r.team._count.members >= h.teamMax) throw new DomainError("full", "Ton équipe est complète.", 409);
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const { count } = await tx.teamJoinRequest.updateMany({ where: { id: requestId, status: "PENDING" }, data: { status: accept ? "ACCEPTED" : "DECLINED", answeredAt: new Date() } });
      if (!count) throw new DomainError("answered", "Cette demande a déjà reçu une réponse.", 409);
      if (accept) {
        await tx.teamMember.create({ data: { teamId: r.teamId, userId: r.userId, hackathonId: h.id } });
        await tx.teamJoinRequest.updateMany({ where: { userId: r.userId, status: "PENDING", team: { hackathonId: h.id } }, data: { status: "DECLINED", answeredAt: new Date() } });
      }
      await pushNotifications(tx, [
        { userId: r.userId, actor: r.team.name, key: accept ? "teamJoinAccepted" : "teamJoinDeclined", params: { title: h.title }, href: `/hackathons/${h.id}`, icon: "users", tone: accept ? "success" : "neutral" },
      ]);
      return { ok: true };
    });
  } catch (e) {
    // The member joined another team in the meantime.
    if ((e as { code?: string }).code === "P2002") throw new DomainError("already_in", "Ce membre a déjà rejoint une autre équipe.", 409);
    throw e;
  }
}

/** Leaves a team before registrations close. A leaving captain hands over to the oldest member; a team left empty disappears. */
export async function leaveTeam(userId: string, teamId: string, prisma: Db = db) {
  const t = await prisma.team.findUnique({ where: { id: teamId }, include: { hackathon: true, members: { orderBy: { joinedAt: "asc" } } } });
  if (!t || !t.members.some((m) => m.userId === userId)) throw notFound("Équipe introuvable.");
  if (t.hackathon.status !== "OPEN" || t.hackathon.closesAt.getTime() <= Date.now()) throw new DomainError("closed", "Les inscriptions sont closes : l’équipe est figée.", 409);
  return prisma.$transaction(async (tx) => {
    await tx.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    const rest = t.members.filter((m) => m.userId !== userId);
    if (rest.length === 0) await tx.team.delete({ where: { id: teamId } });
    else if (t.captainId === userId) await tx.team.update({ where: { id: teamId }, data: { captainId: rest[0].userId } });
    return { ok: true };
  });
}

export async function updateTeam(captainId: string, teamId: string, input: { lookingFor?: string | null; skill?: string }, prisma: Db = db) {
  const t = await prisma.team.findUnique({ where: { id: teamId } });
  if (!t || t.captainId !== captainId) throw notFound("Équipe introuvable.");
  await prisma.team.update({ where: { id: teamId }, data: { lookingFor: input.lookingFor === undefined ? undefined : input.lookingFor || null } });
  return { ok: true };
}

export async function myTeam(userId: string, hackathonId: string, prisma: Db = db): Promise<TeamView | null> {
  const t = await teamOf(prisma, hackathonId, userId);
  return t && toTeam(t, userId);
}

/** The teams the member is in, for the home and profile screens. */
export async function myEntries(userId: string, prisma: Db = db) {
  const seats = await prisma.teamMember.findMany({
    where: { userId },
    select: { team: { select: { id: true, name: true, solo: true, submission: { select: { id: true } }, hackathon: { select: { id: true, title: true, endsAt: true, status: true } } } } },
    orderBy: { joinedAt: "desc" },
  });
  return seats.map(({ team }) => ({
    hackathonId: team.hackathon.id,
    title: team.hackathon.title,
    endsAt: team.hackathon.endsAt.toISOString(),
    status: team.hackathon.status,
    teamId: team.id,
    team: team.name,
    solo: team.solo,
    submitted: team.submission !== null,
  }));
}

/* Solutions */

export async function submitSolution(
  userId: string,
  hackathonId: string,
  input: { projectName: string; repoUrl: string; demoUrl?: string; explanation: string; payoutOperator?: string; payoutPhone?: string },
  prisma: Db = db,
) {
  const h = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
  if (!h || !h.publishedAt) throw notFound("Hackathon introuvable.");
  if (h.status !== "OPEN" || h.endsAt.getTime() <= Date.now()) throw new DomainError("closed", "Ce hackathon est terminé : les solutions ne sont plus acceptées.", 409);
  if (h.startsAt.getTime() > Date.now()) throw new DomainError("not_started", "Le hackathon n’a pas encore commencé.", 409);
  const team = await teamOf(prisma, hackathonId, userId);
  if (!team) throw forbidden("Inscris-toi d’abord à ce hackathon.");
  if (team.members.length < h.teamMin) throw new DomainError("team_small", `Il faut au moins ${h.teamMin} membres dans l’équipe pour soumettre.`, 409);
  if (hasCash(h) && (!input.payoutOperator || !input.payoutPhone)) throw new DomainError("payout", "Indique le numéro Mobile Money qui recevra le gain de l’équipe.", 400, "payoutPhone");
  const data = {
    projectName: input.projectName,
    repoUrl: input.repoUrl,
    demoUrl: input.demoUrl || null,
    explanation: input.explanation,
    payoutOperator: hasCash(h) ? input.payoutOperator! : null,
    payoutPhone: hasCash(h) ? input.payoutPhone! : null,
  };
  return prisma.$transaction(async (tx) => {
    const s = await tx.submission.upsert({ where: { teamId: team.id }, create: { hackathonId, teamId: team.id, ...data }, update: data });
    const me = team.members.find((m) => m.userId === userId)!.user.name;
    await pushNotifications(
      tx,
      team.members.filter((m) => m.userId !== userId).map((m) => ({ userId: m.userId, actor: me, key: "solutionSent", params: { team: team.name }, href: `/hackathons/${hackathonId}/equipe`, icon: "trophy", tone: "brand" })),
    );
    return { id: s.id };
  });
}

/* Jury */

/** Jurors who mentored a member of a team do not score its solution: a mentor may receive part of the pot. */
async function recusals(prisma: Tx, submissions: Array<{ id: string; team: { members: Array<{ userId: string }> } }>) {
  const members = submissions.flatMap((s) => s.team.members.map((m) => m.userId));
  const mentors = await mentoredBy(members, prisma);
  const out = new Map<string, Set<string>>();
  for (const s of submissions) {
    const set = new Set<string>();
    for (const m of s.team.members) for (const mentor of mentors.get(m.userId) ?? []) set.add(mentor);
    // A juror cannot score a solution of a team they are in, either.
    for (const m of s.team.members) set.add(m.userId);
    out.set(s.id, set);
  }
  return out;
}

async function assertJuror(prisma: Db, jurorId: string, hackathonId: string) {
  const h = await prisma.hackathon.findUnique({ where: { id: hackathonId }, include: { jurors: { select: { userId: true } } } });
  if (!h) throw notFound("Hackathon introuvable.");
  if (!h.jurors.some((j) => j.userId === jurorId)) throw forbidden("Cette vue est réservée au jury du hackathon.");
  return h;
}

const juryInclude = { team: { select: { members: { select: { userId: true } } } } } as const;

/** The next solution this juror has not scored yet. Solutions are anonymous: no team name, no member. */
export async function nextForJury(jurorId: string, hackathonId: string, prisma: Db = db): Promise<JuryItem> {
  const h = await assertJuror(prisma, jurorId, hackathonId);
  const all = await prisma.submission.findMany({ where: { hackathonId }, orderBy: { createdAt: "asc" }, include: { ...juryInclude, scores: { where: { jurorId }, select: { jurorId: true } } } });
  const recused = await recusals(prisma, all);
  const subs = all.filter((s) => !recused.get(s.id)!.has(jurorId));
  const scored = subs.filter((s) => s.scores.length > 0).length;
  const index = subs.findIndex((s) => s.scores.length === 0);
  const next = inJury(h) && index >= 0 ? subs[index] : null;
  return {
    hackathonTitle: h.title,
    total: subs.length,
    scored,
    submission: next && { id: next.id, index: index + 1, projectName: next.projectName, repoUrl: next.repoUrl, demoUrl: next.demoUrl, explanation: next.explanation },
  };
}

export async function scoreSubmission(jurorId: string, hackathonId: string, input: { submissionId: string; works: number; code: number; tests: number; explain: number; comment?: string }, prisma: Db = db) {
  const h = await assertJuror(prisma, jurorId, hackathonId);
  if (!inJury(h)) throw new DomainError("not_jury", h.status === "OPEN" ? "Le hackathon n’est pas encore terminé." : "Les résultats sont déjà publiés.", 409);
  const sub = await prisma.submission.findUnique({ where: { id: input.submissionId }, include: juryInclude });
  if (!sub || sub.hackathonId !== hackathonId) throw notFound("Solution introuvable.");
  if ((await recusals(prisma, [sub])).get(sub.id)!.has(jurorId)) throw forbidden("Tu accompagnes ou as accompagné un membre de cette équipe : les autres jurés notent cette solution.");
  const score = { works: input.works, code: input.code, tests: input.tests, explain: input.explain };
  const total = totalScore(score);
  await prisma.juryScore.upsert({
    where: { submissionId_jurorId: { submissionId: input.submissionId, jurorId } },
    create: { submissionId: input.submissionId, jurorId, ...score, comment: input.comment || null },
    update: { ...score, comment: input.comment || null },
  });
  return { total };
}

export async function ranking(hackathonId: string, prisma: Tx = db): Promise<RankingRow[]> {
  const subs = await prisma.submission.findMany({
    where: { hackathonId, scores: { some: {} } },
    select: { createdAt: true, team: { select: { id: true, name: true, captain: { select: { id: true, name: true } } } }, scores: { select: { works: true, code: true, tests: true, explain: true } } },
  });
  return subs
    .map((s) => ({ teamId: s.team.id, team: s.team.name, captainId: s.team.captain.id, captain: s.team.captain.name, mark: averageMark(s.scores.map(totalScore)), at: s.createdAt.getTime() }))
    // Equal marks: the earlier solution comes first.
    .sort((a, b) => b.mark - a.mark || a.at - b.at)
    .map(({ at: _at, ...r }) => r);
}

/* Results and transfers */

/** Ends registrations and solutions before the planned date. */
export async function closeHackathon(adminId: string, hackathonId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const now = new Date();
  const { count } = await prisma.hackathon.updateMany({ where: { id: hackathonId, status: "OPEN" }, data: { status: "JURY", endsAt: now } });
  if (!count) throw new DomainError("not_open", "Ce hackathon n’est pas en cours.", 409);
  await prisma.adminAction.create({ data: { adminId, action: "hackathon:close", targetId: hackathonId } });
  return { ok: true };
}

/** Publishes the ranking and prepares the transfers (D6). Every juror must have scored every solution they may score. */
export async function publishResults(adminId: string, hackathonId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const h = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    include: { jurors: { select: { userId: true } }, submissions: { include: { ...juryInclude, scores: { select: { jurorId: true } } } } },
  });
  if (!h) throw notFound("Hackathon introuvable.");
  if (!inJury(h)) throw new DomainError("not_jury", "Seul un hackathon en jury peut publier ses résultats.", 409);
  if (h.submissions.length === 0) throw new DomainError("empty", "Aucune solution n’a été soumise.", 409);
  const recused = await recusals(prisma, h.submissions);
  const missing = h.submissions.filter((s) => h.jurors.some((j) => !recused.get(s.id)!.has(j.userId) && !s.scores.some((x) => x.jurorId === j.userId))).length;
  if (missing) throw new DomainError("unscored", `${missing} solution${missing > 1 ? "s n’ont" : " n’a"} pas encore été notée${missing > 1 ? "s" : ""} par tout le jury.`, 409);

  const rank = await ranking(hackathonId, prisma);
  const winner = h.submissions.find((s) => s.teamId === rank[0].teamId)!;
  const [{ pot }] = [...(await totals([hackathonId], prisma)).values()];
  const everyone = h.submissions.flatMap((s) => s.team.members.map((m) => ({ userId: m.userId, won: s.id === winner.id })));
  const href = `/hackathons/${hackathonId}/resultats`;
  const actor = h.title;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Two clicks, or two admins at once: only one publication creates the transfers.
    const { count } = await tx.hackathon.updateMany({ where: { id: hackathonId, status: { in: ["OPEN", "JURY"] } }, data: { status: "DONE", resultsAt: now } });
    if (!count) throw new DomainError("already_published", "Les résultats sont déjà publiés.", 409);
    const notes: NotificationInput[] = everyone.filter((e) => !e.won).map((e) => ({ userId: e.userId, actor, key: "resultsPublished", href, icon: "trophy", tone: "accent" }));
    const winners = everyone.filter((e) => e.won);
    if (hasCash(h) && pot > 0) {
      const withMentor = h.mentoringMinutes > 0;
      const captain = rank[0].captainId;
      const mentorId = withMentor ? await mainMentor(captain, tx) : null;
      const split = splitPrize(pot, withMentor);
      // Level 3 without any mentor found: the mentor's share goes to the winners.
      const winnerAmount = split.winner + (mentorId ? 0 : split.mentor);
      await tx.payout.createMany({
        data: [
          { hackathonId, role: "WINNER", beneficiaryId: captain, amount: winnerAmount, operator: winner.payoutOperator, phone: winner.payoutPhone },
          ...(mentorId ? [{ hackathonId, role: "MENTOR" as const, beneficiaryId: mentorId, amount: split.mentor }] : []),
          { hackathonId, role: "PLATFORM", amount: split.platform },
        ],
      });
      for (const w of winners) notes.push({ userId: w.userId, actor, key: "teamWonMoney", params: { amount: winnerAmount, hours: CONTEST_HOURS }, href, icon: "trophy", tone: "accent" });
      if (mentorId) notes.push({ userId: mentorId, actor, key: "mentorShare", params: { amount: split.mentor }, href, icon: "trophy", tone: "accent" });
    } else {
      for (const w of winners) notes.push({ userId: w.userId, actor, key: "teamWonPrize", href, icon: "trophy", tone: "accent" });
    }
    await pushNotifications(tx, notes);
    await tx.adminAction.create({ data: { adminId, action: "hackathon:publish_results", targetId: hackathonId } });
    return { winnerTeamId: winner.teamId };
  });
}

/** Records a Mobile Money transfer made by the team, once the contest period is over. */
export async function markPayoutSent(adminId: string, payoutId: string, reference: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const p = await prisma.payout.findUnique({ where: { id: payoutId }, include: { hackathon: { select: { title: true, resultsAt: true, id: true } } } });
  if (!p) throw notFound("Versement introuvable.");
  if (p.status === "SENT") throw new DomainError("already_sent", "Ce versement est déjà marqué comme envoyé.", 409);
  const contestEnds = (p.hackathon.resultsAt?.getTime() ?? Infinity) + CONTEST_HOURS * 3600_000;
  if (Date.now() < contestEnds) throw new DomainError("contest", `Attends la fin des ${CONTEST_HOURS} h de contestation avant de verser.`, 409);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.payout.updateMany({ where: { id: payoutId, status: "PENDING" }, data: { status: "SENT", reference, sentAt: new Date() } });
    if (!count) throw new DomainError("already_sent", "Ce versement est déjà marqué comme envoyé.", 409);
    await tx.adminAction.create({ data: { adminId, action: "payout:sent", targetId: payoutId, details: `${p.amount} F CFA · réf. ${reference}` } });
    if (p.beneficiaryId) {
      await pushNotifications(tx, [{ userId: p.beneficiaryId, actor: "KABAD", key: "payoutSent", params: { amount: p.amount, title: p.hackathon.title }, href: `/hackathons/${p.hackathon.id}/resultats`, icon: "wallet", tone: "accent" }]);
    }
    return { ok: true };
  });
}

export async function getResults(id: string, prisma: Db = db): Promise<HackathonResults> {
  const h = await prisma.hackathon.findUnique({ where: { id }, select: { ...summarySelect, payouts: { include: { beneficiary: { select: { name: true } } }, orderBy: { role: "asc" } } } });
  if (!h || h.status !== "DONE") throw notFound("Résultats introuvables.");
  const [summary] = await summaries([h], prisma);
  const payouts: PayoutView[] = h.payouts.map((p) => ({
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
  return { ...summary, ranking: await ranking(id, prisma), payouts, publishedAt: h.resultsAt?.toISOString() ?? null };
}

/** A team's own marks and the jurors' comments, shown once the results are out. Jurors stay anonymous. */
export async function myFeedback(userId: string, hackathonId: string, prisma: Db = db) {
  const team = await teamOf(prisma, hackathonId, userId);
  if (!team?.submission) return null;
  const sub = await prisma.submission.findUnique({ where: { id: team.submission.id }, include: { scores: true, hackathon: { select: { status: true } } } });
  if (!sub || sub.hackathon.status !== "DONE" || sub.scores.length === 0) return null;
  return { mark: averageMark(sub.scores.map(totalScore)), comments: sub.scores.map((s) => s.comment).filter((c): c is string => Boolean(c)) };
}

export async function recentContributions(hackathonId: string, prisma: Db = db): Promise<ContributionView[]> {
  const rows = await prisma.contribution.findMany({ where: { hackathonId, status: "PAID" }, orderBy: { paidAt: "desc" }, take: 6 });
  return rows.map((r) => ({ name: r.anonymous ? "Anonyme" : r.displayName, amount: r.amount, createdAt: (r.paidAt ?? r.createdAt).toISOString() }));
}

/* Instructor missions */

async function requireOrganizer(prisma: Tx, userId: string, hackathonId: string) {
  const [h, u] = await Promise.all([
    prisma.hackathon.findUnique({ where: { id: hackathonId }, select: { id: true, title: true, organizerName: true, createdById: true, instructorFee: true, status: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } }),
  ]);
  if (!h) throw notFound("Hackathon introuvable.");
  if (h.createdById !== userId && !u?.isAdmin) throw forbidden("Seul l’organisateur recrute les instructeurs.");
  return h;
}

/** Offers the mission to badged mentors. Mentors already asked are skipped. */
export async function proposeMissions(userId: string, hackathonId: string, mentorIds: string[], prisma: Db = db) {
  const h = await requireOrganizer(prisma, userId, hackathonId);
  if (!h.instructorFee) throw new DomainError("fee", "Indique d’abord la rémunération par instructeur.", 400, "instructorFee");
  if (h.status === "DONE") throw new DomainError("done", "Ce hackathon est terminé.", 409);
  const mentors = await prisma.user.findMany({ where: { id: { in: mentorIds }, seniorVerifiedAt: { not: null }, suspendedAt: null }, select: { id: true } });
  if (mentors.length !== new Set(mentorIds).size) throw new DomainError("not_mentor", "Seuls les mentors KABAD peuvent être instructeurs.", 400);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.instructorMission.createMany({ data: mentors.map((m) => ({ hackathonId, mentorId: m.id, fee: h.instructorFee! })), skipDuplicates: true });
    const created = await tx.instructorMission.findMany({ where: { hackathonId, mentorId: { in: mentors.map((m) => m.id) }, status: "PROPOSED" }, select: { id: true, mentorId: true } });
    await pushNotifications(tx, created.map((m) => ({ userId: m.mentorId, actor: h.organizerName, key: "missionProposed", href: `/hackathons/missions/${m.id}`, icon: "wallet", tone: "accent" })));
    return { proposed: count };
  });
}

export async function answerMission(mentorId: string, missionId: string, accept: boolean, prisma: Db = db) {
  const m = await prisma.instructorMission.findUnique({ where: { id: missionId }, include: { hackathon: { select: { id: true, title: true, createdById: true } }, mentor: { select: { name: true } } } });
  if (!m || m.mentorId !== mentorId) throw notFound("Mission introuvable.");
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.instructorMission.updateMany({ where: { id: missionId, status: "PROPOSED" }, data: { status: accept ? "ACCEPTED" : "DECLINED", answeredAt: new Date() } });
    if (!count) throw new DomainError("answered", "Tu as déjà répondu à cette mission.", 409);
    if (m.hackathon.createdById) {
      await pushNotifications(tx, [{ userId: m.hackathon.createdById, actor: m.mentor.name, key: accept ? "missionAccepted" : "missionDeclined", params: { title: m.hackathon.title }, href: `/hackathons/${m.hackathon.id}`, icon: "users", tone: accept ? "success" : "neutral" }]);
    }
    return { ok: true };
  });
}

const missionSelect = { id: true, fee: true, status: true, createdAt: true, hackathon: { select: { id: true, title: true, organizerName: true, format: true, city: true, startsAt: true, endsAt: true, missionText: true } } } as const;
type MissionRow = Prisma.InstructorMissionGetPayload<{ select: typeof missionSelect }>;
const toMission = (m: MissionRow): MissionView => ({
  ...m,
  createdAt: m.createdAt.toISOString(),
  hackathon: { ...m.hackathon, startsAt: m.hackathon.startsAt.toISOString(), endsAt: m.hackathon.endsAt.toISOString() },
});

export async function getMission(mentorId: string, missionId: string, prisma: Db = db): Promise<MissionView> {
  const m = await prisma.instructorMission.findUnique({ where: { id: missionId }, select: { ...missionSelect, mentorId: true } });
  if (!m || m.mentorId !== mentorId) throw notFound("Mission introuvable.");
  return toMission(m);
}

export async function myMissions(mentorId: string, prisma: Db = db): Promise<MissionView[]> {
  const rows = await prisma.instructorMission.findMany({ where: { mentorId }, select: missionSelect, orderBy: { createdAt: "desc" } });
  return rows.map(toMission);
}

/** Missions already offered for a hackathon, so the organizer sees who answered. */
export async function missionsFor(userId: string, hackathonId: string, prisma: Db = db) {
  await requireOrganizer(prisma, userId, hackathonId);
  const rows = await prisma.instructorMission.findMany({ where: { hackathonId }, select: { mentorId: true, status: true } });
  return rows;
}

/* Administration */

/** For the admin page: hackathons with their state, proposals to review and transfers still to send. */
export async function adminOverview(adminId: string, prisma: Db = db) {
  await requireAdmin(adminId, prisma);
  const rows = await prisma.hackathon.findMany({ select: summarySelect, orderBy: { startsAt: "asc" } });
  const hackathons = await summaries(rows, prisma);
  const payouts = await prisma.payout.findMany({ where: { status: "PENDING" }, include: { beneficiary: { select: { name: true } }, hackathon: { select: { title: true, resultsAt: true } } }, orderBy: { createdAt: "asc" } });
  const [pendingBadges, openReports] = await Promise.all([prisma.mentorBadgeRequest.count({ where: { status: "PENDING" } }), prisma.report.count({ where: { status: "OPEN" } })]);
  return {
    hackathons,
    payouts: payouts.map((p) => ({
      id: p.id,
      role: p.role,
      amount: p.amount,
      beneficiary: p.beneficiary?.name ?? "KABAD",
      operator: p.operator,
      phone: p.phone,
      hackathon: p.hackathon.title,
      payableFrom: new Date((p.hackathon.resultsAt?.getTime() ?? 0) + CONTEST_HOURS * 3600_000).toISOString(),
    })),
    pendingBadges,
    openReports,
  };
}
