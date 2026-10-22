/* Member profiles and their public stats. */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { notFound } from "./errors";
import type { DirectoryEntry, MemberCard, Mentor, MentorStats, Profile, Recommendation } from "@/lib/domain-types";

const cardSelect = { id: true, name: true, role: true, city: true, country: true, diaspora: true, years: true, headline: true, bio: true, stack: true, seniorVerifiedAt: true } as const;

export const toCard = ({ seniorVerifiedAt, ...u }: Prisma.UserGetPayload<{ select: typeof cardSelect }>): MemberCard => ({ ...u, verified: u.role === "SENIOR" && seniorVerifiedAt !== null });

/** Pairs accompanied, hours confirmed by both members, challenges judged. */
export async function mentorStats(ids: string[], prisma: Db = db): Promise<Map<string, MentorStats & { activePairs: number }>> {
  if (ids.length === 0) return new Map();
  const [pairs, minutes, judged] = await Promise.all([
    prisma.pair.groupBy({ by: ["mentorId", "active"], where: { mentorId: { in: ids } }, _count: { _all: true } }),
    prisma.$queryRaw<Array<{ mentorId: string; minutes: bigint }>>`
      SELECT p."mentorId", COALESCE(SUM(s.minutes), 0) AS minutes
      FROM "Pair" p JOIN "MentoringSession" s ON s."pairId" = p.id
      WHERE s."confirmedByMentor" AND s."confirmedByMentee" AND p."mentorId" = ANY(${ids})
      GROUP BY p."mentorId"`,
    prisma.challengeJuror.groupBy({ by: ["userId"], where: { userId: { in: ids }, challenge: { status: "DONE" } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, MentorStats & { activePairs: number }>();
  for (const id of ids) out.set(id, { pairs: 0, hours: 0, judged: 0, activePairs: 0 });
  for (const p of pairs) {
    const s = out.get(p.mentorId)!;
    s.pairs += p._count._all;
    if (p.active) s.activePairs += p._count._all;
  }
  for (const m of minutes) out.get(m.mentorId)!.hours = Math.floor(Number(m.minutes) / 60);
  for (const j of judged) out.get(j.userId)!.judged = j._count._all;
  return out;
}

export async function listMentors(prisma: Db = db): Promise<Mentor[]> {
  const seniors = await prisma.user.findMany({ where: { role: "SENIOR", seniorVerifiedAt: { not: null }, suspendedAt: null }, select: { ...cardSelect, mentorCapacity: true, replyTime: true }, orderBy: { name: "asc" } });
  const stats = await mentorStats(seniors.map((s) => s.id), prisma);
  return seniors.map(({ mentorCapacity, replyTime, ...u }) => {
    const s = stats.get(u.id)!;
    return { ...toCard(u), stats: { pairs: s.pairs, hours: s.hours, judged: s.judged }, openSlots: Math.max(0, mentorCapacity - s.activePairs), replyTime };
  });
}

export async function getProfile(viewerId: string | null, id: string, prisma: Db = db): Promise<Profile> {
  const u = await prisma.user.findUnique({ where: { id }, select: { ...cardSelect, mentorCapacity: true, replyTime: true } });
  if (!u) throw notFound("Membre introuvable.");
  const { mentorCapacity, replyTime, ...card } = u;
  let stats: MentorStats | null = null;
  let openSlots: number | null = null;
  if (u.role === "SENIOR") {
    const s = (await mentorStats([u.id], prisma)).get(u.id)!;
    stats = { pairs: s.pairs, hours: s.hours, judged: s.judged };
    openSlots = Math.max(0, mentorCapacity - s.activePairs);
  }
  const [isContact, invited, conversation, blocked, testsValidated] = await Promise.all([
    viewerId ? prisma.contact.count({ where: { userId: viewerId, contactId: id } }).then(Boolean) : false,
    viewerId ? prisma.invitation.count({ where: { fromId: viewerId, toId: id, status: "PENDING" } }).then(Boolean) : false,
    viewerId ? prisma.conversation.findUnique({ where: { directKey: [viewerId, id].sort().join(":") }, select: { id: true } }) : null,
    viewerId ? prisma.block.count({ where: { blockerId: viewerId, blockedId: id } }).then(Boolean) : false,
    prisma.testReport.count({ where: { testerId: id, status: "VALIDATED" } }),
  ]);
  return { ...toCard(card), stats, openSlots, replyTime, isContact, invited, conversationId: conversation?.id ?? null, blockedByMe: blocked, testsValidated };
}


/**
 * Members to meet at the end of sign-up: same stack, same city or country, available mentors.
 * Contacts, pending invitations and blocked members are left out.
 */
export async function recommendations(userId: string, prisma: Db = db): Promise<Recommendation[]> {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const [contacts, invited, blocks] = await Promise.all([
    prisma.contact.findMany({ where: { userId }, select: { contactId: true } }),
    prisma.invitation.findMany({ where: { OR: [{ fromId: userId }, { toId: userId }] }, select: { fromId: true, toId: true } }),
    prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } }),
  ]);
  const exclude = new Set<string>([userId, ...contacts.map((c) => c.contactId), ...invited.flatMap((i) => [i.fromId, i.toId]), ...blocks.flatMap((b) => [b.blockerId, b.blockedId])]);
  const others = await prisma.user.findMany({ where: { id: { notIn: [...exclude] }, isAdmin: false, suspendedAt: null }, select: cardSelect, take: 200, orderBy: { createdAt: "asc" } });
  const scored = others.map((o) => {
    const shared = o.stack.filter((s) => me.stack.includes(s));
    let score = shared.length * 2;
    let why = shared.length ? (o.role === "SENIOR" ? `Mentore en ${shared[0]}` : "Même stack que vous") : "";
    if (me.city && o.city === me.city) {
      score += 3;
      why ||= "Même ville";
    } else if (me.country && o.country === me.country) {
      score += 1;
      why ||= "Même pays";
    }
    if (o.role === "SENIOR" && me.role === "JUNIOR") {
      score += 1;
      why ||= "Mentor disponible";
    }
    return { ...toCard(o), why: why || "Membre actif de la communauté", score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...r }) => r);
}

export async function updateProfile(
  userId: string,
  input: { role: "JUNIOR" | "SENIOR"; country: string; city: string; diaspora: boolean; stack: string[]; profileLink: string; headline?: string; bio?: string; years?: number; mentorCapacity?: number },
  prisma: Db = db,
) {
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { mentorCapacity: true, profileLink: true, role: true } });
  // The senior status was checked against one profile: a new profile, or becoming senior, needs a new check.
  const recheck = input.role === "SENIOR" && (current.role !== "SENIOR" || current.profileLink !== input.profileLink);
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...input,
      // A new senior starts with one open place.
      mentorCapacity: input.role === "SENIOR" ? (input.mentorCapacity ?? Math.max(1, current.mentorCapacity)) : 0,
      ...(recheck || input.role === "JUNIOR" ? { seniorVerifiedAt: null } : {}),
    },
  });
}


/**
 * The member directory: every active member except the viewer, the team accounts, suspended members
 * and anyone with a block in either direction. Filters are combined; the text matches name, city, country,
 * title and technologies.
 */
export async function searchMembers(
  viewerId: string,
  filters: { q?: string; role?: "JUNIOR" | "SENIOR"; country?: string; tech?: string; page?: number },
  prisma: Db = db,
): Promise<{ members: DirectoryEntry[]; hasMore: boolean }> {
  const PAGE = 30;
  const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] }, select: { blockerId: true, blockedId: true } });
  const hidden = [viewerId, ...blocks.flatMap((b) => [b.blockerId, b.blockedId])];
  const q = filters.q?.trim();
  const tech = filters.tech?.trim();
  const where: Prisma.UserWhereInput = {
    id: { notIn: hidden },
    isAdmin: false,
    suspendedAt: null,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.country ? { country: filters.country } : {}),
    ...(tech ? { stack: { has: tech } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
            { headline: { contains: q, mode: "insensitive" } },
            { stack: { has: q } },
          ],
        }
      : {}),
  };
  const page = Math.max(0, filters.page ?? 0);
  const rows = await prisma.user.findMany({ where, select: cardSelect, orderBy: [{ createdAt: "desc" }], skip: page * PAGE, take: PAGE + 1 });
  const ids = rows.slice(0, PAGE).map((r) => r.id);
  const [contacts, invitations, conversations] = await Promise.all([
    prisma.contact.findMany({ where: { userId: viewerId, contactId: { in: ids } }, select: { contactId: true } }),
    prisma.invitation.findMany({ where: { status: "PENDING", OR: [{ fromId: viewerId, toId: { in: ids } }, { toId: viewerId, fromId: { in: ids } }] }, select: { id: true, fromId: true, toId: true } }),
    prisma.conversation.findMany({ where: { directKey: { in: ids.map((id) => [viewerId, id].sort().join(":")) } }, select: { id: true, directKey: true } }),
  ]);
  const contactSet = new Set(contacts.map((c) => c.contactId));
  return {
    hasMore: rows.length > PAGE,
    members: rows.slice(0, PAGE).map((r) => {
      const sent = invitations.find((i) => i.fromId === viewerId && i.toId === r.id);
      const received = invitations.find((i) => i.toId === viewerId && i.fromId === r.id);
      const conversation = conversations.find((c) => c.directKey === [viewerId, r.id].sort().join(":"));
      return {
        ...toCard(r),
        relation: contactSet.has(r.id) ? "contact" : received ? "invited_you" : sent ? "invited" : "none",
        conversationId: contactSet.has(r.id) ? (conversation?.id ?? null) : null,
        invitationId: received?.id ?? null,
      };
    }),
  };
}

/** Technologies used by members, most common first: the directory's filter chips. */
export async function popularStacks(prisma: Db = db, limit = 12) {
  const rows = await prisma.$queryRaw<Array<{ tech: string; n: bigint }>>`
    SELECT unnest(stack) AS tech, COUNT(*) AS n FROM "User" WHERE "suspendedAt" IS NULL GROUP BY tech ORDER BY n DESC, tech LIMIT ${limit}`;
  return rows.map((r) => r.tech);
}
