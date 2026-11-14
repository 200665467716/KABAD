/*
 * Mentor badge, enforced on the server:
 * - a member sends their expertise (3 areas at most), their links (at least one) and a public presentation;
 * - one request at a time: a new one is possible only after a refusal;
 * - the KABAD team checks at least one link, then grants the badge or refuses it with a reason sent to the candidate;
 * - granting makes the member a mentor: SENIOR, verified, presentation copied to the profile.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { pushNotifications } from "./notifications";
import type { BadgeRequestView, BadgeStatus } from "@/lib/domain-types";

export const BADGE_DOMAINS = ["Backend", "Frontend", "Mobile", "Cloud et DevOps", "Data et IA", "Paiements et fintech", "Sécurité", "Produit et UX"] as const;
export const BADGE_EXPERIENCE = ["3-5", "5-10", "10+"] as const;

export type BadgeInput = {
  domains: string[];
  technologies: string[];
  experience: (typeof BADGE_EXPERIENCE)[number];
  jobTitle: string;
  company?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  bio: string;
  topics: string;
};

const include = { user: { select: { id: true, name: true, city: true, country: true } } } as const;
type Row = Prisma.MentorBadgeRequestGetPayload<{ include: typeof include }>;

function toView(r: Row): BadgeRequestView {
  return {
    id: r.id,
    status: r.status,
    domains: r.domains,
    technologies: r.technologies,
    experience: r.experience,
    jobTitle: r.jobTitle,
    company: r.company,
    githubUrl: r.githubUrl,
    linkedinUrl: r.linkedinUrl,
    portfolioUrl: r.portfolioUrl,
    bio: r.bio,
    topics: r.topics,
    refusalReason: r.refusalReason,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    candidate: r.user,
  };
}

/** The member's latest request, to show where they stand. */
export async function myBadgeRequest(userId: string, prisma: Db = db): Promise<BadgeRequestView | null> {
  const r = await prisma.mentorBadgeRequest.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, include });
  return r && toView(r);
}

/**
 * The badge was granted, then taken back by the KABAD team (src/server/admin.ts, revokeBadge): the reason
 * lives in the team's log. Null when the badge was never granted, is still held, or a new request followed.
 */
export async function badgeRevocation(userId: string, prisma: Db = db): Promise<{ reason: string | null } | null> {
  const [user, last] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { seniorVerifiedAt: true } }),
    prisma.mentorBadgeRequest.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { status: true, reviewedAt: true } }),
  ]);
  if (user.seniorVerifiedAt || last?.status !== "APPROVED") return null;
  const log = await prisma.adminAction.findFirst({ where: { action: "badge:revoke", targetId: userId, ...(last.reviewedAt ? { createdAt: { gte: last.reviewedAt } } : {}) }, orderBy: { createdAt: "desc" }, select: { details: true } });
  return { reason: log?.details ?? null };
}

function check(input: BadgeInput) {
  if (input.domains.length === 0 || input.domains.length > 3) throw new DomainError("domains", "Choisis de 1 à 3 domaines d’expertise.", 400, "domains");
  if (input.domains.some((d) => !(BADGE_DOMAINS as readonly string[]).includes(d))) throw new DomainError("domains", "Domaine inconnu.", 400, "domains");
  if (!input.githubUrl && !input.linkedinUrl && !input.portfolioUrl) throw new DomainError("links", "Ajoute au moins un lien : GitHub, LinkedIn ou portfolio.", 400, "githubUrl");
}

const data = (input: BadgeInput) => ({
  domains: input.domains,
  technologies: input.technologies,
  experience: input.experience,
  jobTitle: input.jobTitle,
  company: input.company || null,
  githubUrl: input.githubUrl || null,
  linkedinUrl: input.linkedinUrl || null,
  portfolioUrl: input.portfolioUrl || null,
  bio: input.bio,
  topics: input.topics,
});

async function notifyAdmins(tx: Prisma.TransactionClient, name: string, requestId: string) {
  const admins = await tx.user.findMany({ where: { isAdmin: true, suspendedAt: null }, select: { id: true } });
  await pushNotifications(tx, admins.map((a) => ({ userId: a.id, actor: name, key: "badgeRequested", href: `/admin/badges/${requestId}`, icon: "check", tone: "brand" })));
}

/** Sends a new request, or updates the one still waiting for a decision. */
export async function requestBadge(userId: string, input: BadgeInput, prisma: Db = db) {
  check(input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, seniorVerifiedAt: true } });
  if (user.seniorVerifiedAt) throw new DomainError("already", "Tu as déjà le badge mentor.", 409);
  return prisma.$transaction(async (tx) => {
    // The member's row is locked: two sends at the same moment give one request, the second updates it.
    await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const pending = await tx.mentorBadgeRequest.findFirst({ where: { userId, status: "PENDING" }, select: { id: true } });
    if (pending) {
      await tx.mentorBadgeRequest.update({ where: { id: pending.id }, data: data(input) });
      return { id: pending.id, updated: true };
    }
    const r = await tx.mentorBadgeRequest.create({ data: { userId, ...data(input) } });
    await notifyAdmins(tx, user.name, r.id);
    return { id: r.id, updated: false };
  });
}

/* KABAD team */

async function requireAdmin(prisma: Db | Prisma.TransactionClient, userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!u?.isAdmin) throw forbidden("Action réservée à l’équipe KABAD.");
}

export async function listBadgeRequests(adminId: string, status: BadgeStatus = "PENDING", prisma: Db = db) {
  await requireAdmin(prisma, adminId);
  const [rows, counts] = await Promise.all([
    prisma.mentorBadgeRequest.findMany({ where: { status }, include, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 100 }),
    prisma.mentorBadgeRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return { items: rows.map(toView), counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<BadgeStatus, number>> };
}

export async function getBadgeRequest(adminId: string, id: string, prisma: Db = db) {
  await requireAdmin(prisma, adminId);
  const r = await prisma.mentorBadgeRequest.findUnique({ where: { id }, include });
  if (!r) throw notFound("Demande introuvable.");
  return toView(r);
}

export async function reviewBadge(adminId: string, id: string, input: { approve: boolean; reason?: string }, prisma: Db = db) {
  await requireAdmin(prisma, adminId);
  if (!input.approve && !input.reason?.trim()) throw new DomainError("reason", "Indique le motif du refus : il est envoyé au candidat.", 400, "reason");
  const r = await prisma.mentorBadgeRequest.findUnique({ where: { id } });
  if (!r) throw notFound("Demande introuvable.");
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const { count } = await tx.mentorBadgeRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: input.approve ? "APPROVED" : "REFUSED", refusalReason: input.approve ? null : input.reason!.trim(), reviewedById: adminId, reviewedAt: now },
    });
    if (!count) throw new DomainError("reviewed", "Cette demande a déjà été traitée.", 409);
    if (input.approve) {
      const years = r.experience === "10+" ? 10 : Number(r.experience.split("-")[0]);
      await tx.user.update({
        where: { id: r.userId },
        data: { role: "SENIOR", seniorVerifiedAt: now, bio: r.bio, headline: r.jobTitle, years, profileLink: r.githubUrl ?? r.linkedinUrl ?? r.portfolioUrl ?? "" },
      });
    }
    await tx.adminAction.create({ data: { adminId, action: input.approve ? "badge:grant" : "badge:refuse", targetId: r.userId, details: input.approve ? null : input.reason!.trim().slice(0, 300) } });
    await pushNotifications(tx, [
      input.approve
        ? { userId: r.userId, actor: "KABAD", key: "badgeGranted", href: "/mentorat/badge", icon: "check", tone: "success" }
        : { userId: r.userId, actor: "KABAD", key: "badgeRefused", params: { reason: input.reason!.trim().slice(0, 200) }, href: "/mentorat/badge", icon: "info", tone: "neutral" },
    ]);
    return { ok: true };
  });
}
