/* Member profiles and their public stats. */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, notFound } from "./errors";
import { profilePhotoProblem, sniffMime } from "@/lib/attachments";
import { avatarUrl } from "@/lib/avatar";
import type { DirectoryEntry, Level, MemberCard, MentorStats, Profile, Recommendation } from "@/lib/domain-types";

const cardSelect = { id: true, name: true, role: true, level: true, city: true, country: true, diaspora: true, years: true, headline: true, bio: true, stack: true, seniorVerifiedAt: true, photoAt: true } as const;

export const toCard = ({ seniorVerifiedAt, photoAt, ...u }: Prisma.UserGetPayload<{ select: typeof cardSelect }>): MemberCard => ({ ...u, verified: seniorVerifiedAt !== null, photo: avatarUrl({ id: u.id, photoAt }) });

/** A member sets their profile photo (an image checked by its content), or removes it with `null`. */
export async function setProfilePhoto(userId: string, data: Uint8Array | null, prisma: Db = db) {
  const mime = data ? sniffMime(data) : null;
  if (data) {
    const problem = profilePhotoProblem(mime, data.byteLength);
    if (problem) throw new DomainError("bad_file", problem, 400, "photo");
  }
  return prisma.$transaction(async (tx) => {
    const photoAt = data ? new Date() : null;
    if (data) {
      const bytes = Buffer.from(data);
      await tx.userPhoto.upsert({ where: { userId }, create: { userId, mime: mime!, data: bytes }, update: { mime: mime!, data: bytes } });
    } else {
      await tx.userPhoto.deleteMany({ where: { userId } });
    }
    await tx.user.update({ where: { id: userId }, data: { photoAt } });
    return { photo: avatarUrl({ id: userId, photoAt }) };
  });
}

/** The photo of a member. Every signed-in member may see it, like the profile it belongs to. */
export async function getProfilePhoto(id: string, prisma: Db = db) {
  const photo = await prisma.userPhoto.findUnique({ where: { userId: id }, select: { mime: true, data: true } });
  if (!photo) throw notFound("Photo introuvable.");
  return photo;
}

/** Sessions held, hours of mentoring held, hackathons judged. */
export async function mentorStats(ids: string[], prisma: Db = db): Promise<Map<string, MentorStats>> {
  if (ids.length === 0) return new Map();
  const [held, judged] = await Promise.all([
    prisma.mentoringBooking.groupBy({ by: ["mentorId"], where: { mentorId: { in: ids }, status: "ACCEPTED", startsAt: { lt: new Date() } }, _count: { _all: true }, _sum: { minutes: true } }),
    prisma.hackathonJuror.groupBy({ by: ["userId"], where: { userId: { in: ids }, hackathon: { status: "DONE" } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, MentorStats>();
  for (const id of ids) out.set(id, { sessions: 0, hours: 0, judged: 0 });
  for (const h of held) {
    const s = out.get(h.mentorId)!;
    s.sessions = h._count._all;
    s.hours = Math.floor((h._sum.minutes ?? 0) / 60);
  }
  for (const j of judged) out.get(j.userId)!.judged = j._count._all;
  return out;
}

export async function getProfile(viewerId: string | null, id: string, prisma: Db = db): Promise<Profile> {
  const u = await prisma.user.findUnique({ where: { id }, select: cardSelect });
  if (!u) throw notFound("Membre introuvable.");
  const stats = u.seniorVerifiedAt ? (await mentorStats([u.id], prisma)).get(u.id)! : null;
  const [isContact, invited, conversation, blocked, testsValidated] = await Promise.all([
    viewerId ? prisma.contact.count({ where: { userId: viewerId, contactId: id } }).then(Boolean) : false,
    viewerId ? prisma.invitation.count({ where: { fromId: viewerId, toId: id, status: "PENDING" } }).then(Boolean) : false,
    viewerId ? prisma.conversation.findUnique({ where: { directKey: [viewerId, id].sort().join(":") }, select: { id: true } }) : null,
    viewerId ? prisma.block.count({ where: { blockerId: viewerId, blockedId: id } }).then(Boolean) : false,
    prisma.testReport.count({ where: { testerId: id, status: "VALIDATED" } }),
  ]);
  return { ...toCard(u), stats, isContact, invited, conversationId: conversation?.id ?? null, blockedByMe: blocked, testsValidated };
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
    // La raison est une clé du dictionnaire (auth.suggestions.why), affichée dans la langue de la page.
    let why: Recommendation["why"] | null = shared.length ? (o.seniorVerifiedAt ? { key: "mentorIn", tech: shared[0] } : { key: "shared", tech: shared.slice(0, 2).join(", ") }) : null;
    if (me.city && o.city === me.city) {
      score += 3;
      why ??= { key: "sameCity" };
    } else if (me.country && o.country === me.country) {
      score += 1;
      why ??= { key: "sameCountry" };
    }
    if (o.seniorVerifiedAt && !me.seniorVerifiedAt) {
      score += 1;
      why ??= { key: "mentorAvailable" };
    }
    return { ...toCard(o), why: why ?? { key: "active" }, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _score, ...r }) => r);
}

/**
 * The member edits their profile, at sign-up (steps 1 and 2) or later. Every field is optional.
 * The mentor role is not edited here: it comes with the badge (src/server/badges.ts).
 */
export async function updateProfile(
  userId: string,
  input: { country?: string; city?: string; diaspora?: boolean; level?: Level; stack?: string[]; goals?: string[]; profileLink?: string; headline?: string; bio?: string; years?: number; timeZone?: string; gender?: "FEMALE" | "MALE" | null },
  prisma: Db = db,
) {
  if (input.timeZone) {
    try {
      new Intl.DateTimeFormat("fr", { timeZone: input.timeZone });
    } catch {
      input.timeZone = undefined;
    }
  }
  await prisma.user.update({ where: { id: userId }, data: input });
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
