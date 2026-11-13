/*
 * Messaging rules, enforced on the server:
 * - a first contact is an invitation, with an optional first message of 300 characters at most;
 * - a conversation opens only once the invitation is accepted, and both become contacts;
 * - groups are private: only their creator adds participants, chosen among the creator's contacts;
 * - only members read and write in a conversation; blocking stops direct messages and invitations.
 * Every function takes the acting member's id, never trusts ids coming from the client alone.
 */
import { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { avatarUrl } from "@/lib/avatar";
import { attachmentProblem, groupPhotoProblem, safeFileName, sniffMime, type AttachmentKind } from "@/lib/attachments";
import { DomainError, forbidden, notFound } from "./errors";
import { pushNotifications } from "./notifications";
import { notify } from "./realtime-events";
import { GROUP_MAX_MEMBERS } from "@/lib/schemas";
import type { ChatMessage, ConversationDetail, ConversationSummary, InvitationDetail } from "@/lib/messaging-types";

export type { ChatMessage, ConversationSummary };

const directKey = (a: string, b: string) => [a, b].sort().join(":");
/** After a refusal, the same person can be invited again only after this delay. */
export const REINVITE_AFTER_DAYS = 30;
const firstName = (name: string) => name.split(/\s+/)[0] ?? name;
/** The address of a group's photo; the date makes the browser fetch the new picture after a change. */
const photoUrl = (c: { id: string; photoAt: Date | null }) => (c.photoAt ? `/api/groups/${c.id}/photo?v=${c.photoAt.getTime()}` : null);
const listNames = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`);

async function isBlocked(prisma: Db | Prisma.TransactionClient, a: string, b: string) {
  const n = await prisma.block.count({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
  return n > 0;
}

async function membership(prisma: Db | Prisma.TransactionClient, userId: string, conversationId: string) {
  const m = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: { conversation: { include: { members: { select: { userId: true } } } } },
  });
  if (!m) throw notFound("Conversation introuvable.");
  return m;
}

/* Conversations */



export async function unreadCounts(userId: string, prisma: Db = db): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ conversationId: string; unread: bigint }>>`
    SELECT cm."conversationId", COUNT(m.id) AS unread
    FROM "ConversationMember" cm
    JOIN "Message" m ON m."conversationId" = cm."conversationId"
    WHERE cm."userId" = ${userId}
      AND m."createdAt" > cm."lastReadAt"
      -- Text, files and voice notes count; system lines do not.
      AND m.kind <> 'SYSTEM'
      AND m."authorId" IS DISTINCT FROM ${userId}
      -- Nor the messages of someone this member blocked (they stay masked in a shared group).
      AND NOT EXISTS (SELECT 1 FROM "Block" b WHERE b."blockerId" = ${userId} AND b."blockedId" = m."authorId")
    GROUP BY cm."conversationId"`;
  return new Map(rows.map((r) => [r.conversationId, Number(r.unread)]));
}

export async function unreadTotal(userId: string, prisma: Db = db) {
  let total = 0;
  for (const n of (await unreadCounts(userId, prisma)).values()) total += n;
  return total;
}

export async function listConversations(userId: string, prisma: Db = db): Promise<ConversationSummary[]> {
  const [rows, unread, blocked] = await Promise.all([
    prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { lastMessageAt: "desc" },
      include: {
        members: { include: { user: { select: { id: true, name: true, photoAt: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
      },
    }),
    unreadCounts(userId, prisma),
    blockedBy(prisma, userId),
  ]);
  return rows.map((c) => {
    const other = c.kind === "DIRECT" ? c.members.find((m) => m.userId !== userId)?.user : undefined;
    const last = c.messages[0];
    const fromBlocked = Boolean(last?.authorId && blocked.has(last.authorId) && last.kind !== "SYSTEM");
    return {
      id: c.id,
      kind: c.kind,
      title: c.kind === "GROUP" ? (c.name ?? "Groupe") : (other?.name ?? "Conversation"),
      theme: c.theme,
      // A group shows its own photo; a direct conversation shows the other member's.
      photo: other ? avatarUrl(other) : photoUrl(c),
      otherId: other?.id ?? null,
      memberCount: c.members.length,
      isOwner: c.createdById === userId,
      unread: unread.get(c.id) ?? 0,
      lastMessageAt: c.lastMessageAt.toISOString(),
      last: last
        ? { body: last.hiddenAt ? HIDDEN_MESSAGE : fromBlocked ? BLOCKED_MESSAGE : last.body, authorId: last.authorId, authorName: last.author?.name ?? null, system: last.kind === "SYSTEM", attachment: last.hiddenAt || fromBlocked ? null : last.kind === "FILE" || last.kind === "VOICE" ? last.kind : null }
        : null,
    };
  });
}



export const HIDDEN_MESSAGE = "Message retiré par la modération.";
/** In a shared group, what a member sees in place of the messages of someone they blocked. */
export const BLOCKED_MESSAGE = "Message d’un membre que tu as bloqué.";

/** The members this user blocked: their messages are masked for them, and not pushed to them. */
async function blockedBy(prisma: Db | Prisma.TransactionClient, userId: string): Promise<Set<string>> {
  const rows = await prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
  return new Set(rows.map((r) => r.blockedId));
}

/** The members of a conversation who should receive a message of `authorId`: everyone but those who blocked the author. */
async function audience(prisma: Db | Prisma.TransactionClient, authorId: string, members: string[]) {
  const rows = await prisma.block.findMany({ where: { blockedId: authorId, blockerId: { in: members } }, select: { blockerId: true } });
  if (rows.length === 0) return members;
  const blockers = new Set(rows.map((r) => r.blockerId));
  return members.filter((id) => !blockers.has(id));
}

/** What `viewer` gets of a message written by someone they blocked: no text, no file. */
const masked = (m: ChatMessage, blocked: Set<string>): ChatMessage => (m.authorId && blocked.has(m.authorId) && !m.system ? { ...m, body: BLOCKED_MESSAGE, hidden: true, attachment: null } : m);

const attachmentSelect = { select: { id: true, name: true, mime: true, size: true, seconds: true } } as const;
const withAuthor = { author: { select: { name: true } }, attachment: attachmentSelect } as const;

type ChatRow = {
  id: string;
  authorId: string | null;
  author: { name: string } | null;
  body: string;
  kind: string;
  createdAt: Date;
  clientId: string | null;
  hiddenAt?: Date | null;
  attachment?: { id: string; name: string; mime: string; size: number; seconds: number | null } | null;
};

const toChat = (m: ChatRow): ChatMessage => ({
  id: m.id,
  authorId: m.authorId,
  authorName: m.author?.name ?? null,
  // The content of a removed message is never sent to the members.
  body: m.hiddenAt ? HIDDEN_MESSAGE : m.body,
  hidden: Boolean(m.hiddenAt),
  system: m.kind === "SYSTEM",
  createdAt: m.createdAt.toISOString(),
  clientId: m.clientId,
  // A removed message keeps nothing: neither its text nor its file.
  attachment: m.attachment && !m.hiddenAt ? { ...m.attachment, kind: m.kind === "VOICE" ? "VOICE" : "FILE" } : null,
});

export async function getConversation(userId: string, conversationId: string, opts: { before?: string; limit?: number } = {}, prisma: Db = db): Promise<ConversationDetail> {
  const m = await membership(prisma, userId, conversationId);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
  const c = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      // Les membres ajoutés ensemble ont la même date d'arrivée : l'identifiant départage, pour un ordre stable.
      members: { include: { user: { select: { id: true, name: true, role: true, city: true, photoAt: true } } }, orderBy: [{ joinedAt: "asc" }, { userId: "asc" }] },
      // T4: the testers' group shows the tasks to tick and the install link.
      testApp: { select: { id: true, url: true, steps: true, platforms: true, ownerId: true, participants: { where: { userId }, select: { doneSteps: true } } } },
      project: { select: { id: true } },
      team: { select: { hackathonId: true } },
    },
  });
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: withAuthor,
  });
  const other = c.kind === "DIRECT" ? c.members.find((x) => x.userId !== userId)?.user : undefined;
  const blocks = other ? await prisma.block.findMany({ where: { OR: [{ blockerId: userId, blockedId: other.id }, { blockerId: other.id, blockedId: userId }] }, select: { blockerId: true } }) : [];
  // In a group, a blocked member may still write to the others: their messages are masked for whoever blocked them.
  const mine = c.kind === "GROUP" ? await blockedBy(prisma, userId) : new Set<string>();
  return {
    blocked: blocks.length === 0 ? null : blocks.some((b) => b.blockerId === userId) ? "by_me" : "by_them",
    id: c.id,
    kind: c.kind,
    title: c.kind === "GROUP" ? (c.name ?? "Groupe") : (other?.name ?? "Conversation"),
    theme: c.theme,
    photo: photoUrl(c),
    other: other ? { id: other.id, name: other.name, role: other.role, city: other.city, photo: avatarUrl(other) } : null,
    isOwner: c.createdById === userId,
    linked: c.testApp ? { kind: "test", id: c.testApp.id } : c.project ? { kind: "rise", id: c.project.id } : c.team ? { kind: "team", id: c.team.hackathonId } : null,
    test: c.testApp
      ? { id: c.testApp.id, url: c.testApp.url, steps: c.testApp.steps, platforms: c.testApp.platforms, ownerId: c.testApp.ownerId, doneSteps: c.testApp.participants[0]?.doneSteps ?? null }
      : null,
    members: c.members.map((x) => ({ id: x.user.id, name: x.user.name, owner: x.role === "OWNER", photo: avatarUrl(x.user) })),
    lastReadAt: m.lastReadAt.toISOString(),
    hasMore: rows.length > limit,
    messages: rows.slice(0, limit).reverse().map((row) => masked(toChat(row), mine)),
  };
}

export async function sendMessage(userId: string, conversationId: string, input: { body: string; clientId?: string }, prisma: Db = db): Promise<ChatMessage> {
  const m = await membership(prisma, userId, conversationId);
  if (input.clientId) {
    const existing = await prisma.message.findUnique({ where: { authorId_clientId: { authorId: userId, clientId: input.clientId } }, include: withAuthor });
    if (existing) return toChat(existing);
  }
  if (m.conversation.kind === "DIRECT") {
    const other = m.conversation.members.find((x) => x.userId !== userId)?.userId;
    if (other && (await isBlocked(prisma, userId, other))) throw forbidden("Tu ne peux plus écrire à ce membre.");
  }
  // Whoever blocked the author does not receive the message live (it is masked for them in the group).
  const recipients = await audience(prisma, userId, m.conversation.members.map((x) => x.userId));
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: { conversationId, authorId: userId, body: input.body, clientId: input.clientId },
      include: withAuthor,
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
    await tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: msg.createdAt } });
    await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients });
    return toChat(msg);
  });
}

/** Sends a file or a voice note. The file was checked by its content (src/lib/attachments.ts). */
export async function sendAttachment(
  userId: string,
  conversationId: string,
  input: { kind: AttachmentKind; name: string; data: Uint8Array; seconds?: number; caption?: string; clientId?: string },
  prisma: Db = db,
): Promise<ChatMessage> {
  const m = await membership(prisma, userId, conversationId);
  const mime = sniffMime(input.data);
  const problem = attachmentProblem(input.kind, mime, input.data.byteLength, input.seconds);
  if (problem) throw new DomainError("bad_file", problem, 400, "file");
  if (input.clientId) {
    const existing = await prisma.message.findUnique({ where: { authorId_clientId: { authorId: userId, clientId: input.clientId } }, include: withAuthor });
    if (existing) return toChat(existing);
  }
  if (m.conversation.kind === "DIRECT") {
    const other = m.conversation.members.find((x) => x.userId !== userId)?.userId;
    if (other && (await isBlocked(prisma, userId, other))) throw forbidden("Tu ne peux plus écrire à ce membre.");
  }
  // Whoever blocked the author does not receive the message live (it is masked for them in the group).
  const recipients = await audience(prisma, userId, m.conversation.members.map((x) => x.userId));
  return prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId,
        authorId: userId,
        kind: input.kind,
        body: (input.caption ?? "").slice(0, 1000),
        clientId: input.clientId,
        attachment: { create: { name: safeFileName(input.name, mime!), mime: mime!, size: input.data.byteLength, seconds: input.kind === "VOICE" ? Math.round(input.seconds!) : null, data: Buffer.from(input.data) } },
      },
      include: withAuthor,
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
    await tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: msg.createdAt } });
    await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients });
    return toChat(msg);
  });
}

/** A file is readable by the members of its conversation only, and never once the message is removed. */
export async function getAttachment(userId: string, attachmentId: string, prisma: Db = db) {
  const a = await prisma.attachment.findUnique({ where: { id: attachmentId }, include: { message: { select: { conversationId: true, hiddenAt: true } } } });
  if (!a || a.message.hiddenAt) throw notFound("Fichier introuvable.");
  await membership(prisma, userId, a.message.conversationId);
  return { name: a.name, mime: a.mime, data: a.data };
}

export async function markRead(userId: string, conversationId: string, prisma: Db = db) {
  await membership(prisma, userId, conversationId);
  await prisma.$transaction(async (tx) => {
    await tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: new Date() } });
    await notify(tx, { t: "read", conversationId, recipients: [userId] });
  });
}

/* Contacts and invitations */

export async function areContacts(a: string, b: string, prisma: Db | Prisma.TransactionClient = db) {
  return (await prisma.contact.count({ where: { userId: a, contactId: b } })) > 0;
}

export async function listContacts(userId: string, prisma: Db = db) {
  const rows = await prisma.contact.findMany({
    where: { userId },
    include: { contact: { select: { id: true, name: true, city: true, role: true, stack: true, photoAt: true } } },
    orderBy: { contact: { name: "asc" } },
  });
  return rows.map(({ contact: { photoAt, ...c } }) => ({ ...c, photo: avatarUrl({ id: c.id, photoAt }) }));
}

const fromSelect = { id: true, name: true, city: true, country: true, stack: true, years: true, role: true, photoAt: true } as const;
/** L'expéditeur d'une invitation, avec l'adresse de sa photo à la place de sa date. */
const withPhoto = <T extends { id: string; photoAt: Date | null }>({ photoAt, ...u }: T) => ({ ...u, photo: avatarUrl({ id: u.id, photoAt }) });

export async function listInvitations(userId: string, prisma: Db = db) {
  const [received, sent] = await Promise.all([
    prisma.invitation.findMany({
      where: { toId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { from: { select: fromSelect } },
    }),
    prisma.invitation.findMany({ where: { fromId: userId, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { id: true, toId: true, message: true, createdAt: true, to: { select: { name: true, city: true, photoAt: true } } } }),
  ]);
  return {
    received: received.map((i) => ({ id: i.id, message: i.message, createdAt: i.createdAt.toISOString(), from: withPhoto(i.from) })),
    sent: sent.map((i) => ({ id: i.id, toId: i.toId, message: i.message, createdAt: i.createdAt.toISOString(), to: { name: i.to.name, city: i.to.city, photo: avatarUrl({ id: i.toId, photoAt: i.to.photoAt }) } })),
  };
}

export async function getInvitation(userId: string, invitationId: string, prisma: Db = db): Promise<InvitationDetail> {
  const i = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { from: { select: fromSelect } },
  });
  if (!i || i.toId !== userId) throw notFound("Invitation introuvable.");
  let conversationId: string | null = null;
  if (i.status === "ACCEPTED") {
    conversationId = (await prisma.conversation.findUnique({ where: { directKey: directKey(i.fromId, i.toId) }, select: { id: true } }))?.id ?? null;
  }
  return { id: i.id, status: i.status, message: i.message, createdAt: i.createdAt.toISOString(), from: withPhoto(i.from), conversationId };
}

export async function sendInvitation(fromId: string, input: { toId: string; message: string }, prisma: Db = db) {
  const { toId, message } = input;
  if (toId === fromId) throw new DomainError("self", "Tu ne peux pas t’inviter toi-même.");
  const [to, from] = await Promise.all([
    prisma.user.findUnique({ where: { id: toId }, select: { id: true, name: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: fromId }, select: { name: true } }),
  ]);
  if (!to) throw notFound("Membre introuvable.");
  const first = firstName(to.name);
  if (await areContacts(fromId, toId, prisma)) throw new DomainError("already_contacts", `${first} fait déjà partie de tes contacts.`, 409);
  if (await isBlocked(prisma, fromId, toId)) throw forbidden("Tu ne peux pas inviter ce membre.");
  const [mine, theirs] = await Promise.all([
    prisma.invitation.findUnique({ where: { fromId_toId: { fromId, toId } } }),
    prisma.invitation.findUnique({ where: { fromId_toId: { fromId: toId, toId: fromId } } }),
  ]);
  if (theirs?.status === "PENDING") throw new DomainError("invited_you", `${first} t’a déjà invité. Accepte son invitation pour discuter.`, 409);
  if (mine?.status === "PENDING") throw new DomainError("already_sent", `Tu as déjà invité ${first}. Attends sa réponse.`, 409);
  if (mine?.status === "DECLINED" && mine.answeredAt && Date.now() - mine.answeredAt.getTime() < REINVITE_AFTER_DAYS * 86_400_000) {
    throw new DomainError("declined", `${first} n’a pas donné suite à ton invitation. Tu pourras réessayer dans quelques semaines.`, 409);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // An old invitation (declined long ago, or accepted before a block) is reused for the new one.
      const inv = mine
        ? await tx.invitation.update({ where: { id: mine.id }, data: { message, status: "PENDING", createdAt: new Date(), answeredAt: null } })
        : await tx.invitation.create({ data: { fromId, toId, message } });
      await notify(tx, { t: "invitation", invitationId: inv.id, recipients: [toId] });
      await pushNotifications(tx, [{ userId: toId, actor: from.name, key: "invitationReceived", href: `/messages/invitations/${inv.id}`, icon: "user", tone: "brand" }]);
      return { id: inv.id };
    });
  } catch (e) {
    // Two taps on « Inviter » at once: the second one meets the invitation the first just created.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DomainError("already_sent", `Tu as déjà invité ${first}. Attends sa réponse.`, 409);
    throw e;
  }
}

/** The sender withdraws an invitation that has not been answered yet. */
export async function cancelInvitation(userId: string, invitationId: string, prisma: Db = db) {
  const { count } = await prisma.invitation.deleteMany({ where: { id: invitationId, fromId: userId, status: "PENDING" } });
  if (!count) throw notFound("Invitation introuvable ou déjà traitée.");
  return { ok: true };
}

/** Accepting makes both members contacts and opens their conversation, starting with the invitation's message if there is one. */
export async function answerInvitation(userId: string, invitationId: string, accept: boolean, prisma: Db = db) {
  const inv = await prisma.invitation.findUnique({ where: { id: invitationId }, include: { to: { select: { name: true } } } });
  if (!inv || inv.toId !== userId) throw notFound("Invitation introuvable.");
  if (inv.status !== "PENDING") throw new DomainError("already_answered", "Tu as déjà répondu à cette invitation.", 409);
  if (accept && (await isBlocked(prisma, inv.fromId, inv.toId))) throw forbidden("Tu ne peux pas accepter cette invitation : l’un de vous deux a bloqué l’autre.");

  if (!accept) {
    // The sender is not told about a refusal.
    await prisma.invitation.updateMany({ where: { id: inv.id, status: "PENDING" }, data: { status: "DECLINED", answeredAt: new Date() } });
    return { conversationId: null };
  }

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    // Only one of two simultaneous answers goes through.
    const { count } = await tx.invitation.updateMany({ where: { id: inv.id, status: "PENDING" }, data: { status: "ACCEPTED", answeredAt: now } });
    if (!count) throw new DomainError("already_answered", "Tu as déjà répondu à cette invitation.", 409);
    await tx.contact.createMany({ data: [{ userId: inv.fromId, contactId: inv.toId }, { userId: inv.toId, contactId: inv.fromId }], skipDuplicates: true });
    const key = directKey(inv.fromId, inv.toId);
    let conversation = await tx.conversation.findUnique({ where: { directKey: key } });
    if (!conversation) {
      conversation = await tx.conversation.create({
        data: { kind: "DIRECT", directKey: key, lastMessageAt: now, members: { create: [{ userId: inv.fromId, lastReadAt: now }, { userId: inv.toId, lastReadAt: now }] } },
      });
    }
    if (inv.message) await tx.message.create({ data: { conversationId: conversation.id, authorId: inv.fromId, body: inv.message, createdAt: inv.createdAt } });
    await tx.message.create({ data: { conversationId: conversation.id, kind: "SYSTEM", body: `${firstName(inv.to.name)} a accepté l’invitation`, createdAt: now } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: now } });
    await notify(tx, { t: "invitation_answered", invitationId: inv.id, accepted: true, conversationId: conversation.id, recipients: [inv.fromId] });
    await notify(tx, { t: "conversation", conversationId: conversation.id, recipients: [inv.fromId, inv.toId] });
    await pushNotifications(tx, [{ userId: inv.fromId, actor: inv.to.name, key: "invitationAccepted", href: `/messages/${conversation.id}`, icon: "user", tone: "success" }]);
    return { conversationId: conversation.id };
  });
}

/* Private groups */

/** The group of an app to test, of a Rise-Up project or of a hackathon team follows it: its members change only from there. */
async function assertPrivateGroup(prisma: Db | Prisma.TransactionClient, conversationId: string) {
  const c = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { testApp: { select: { id: true } }, project: { select: { id: true } }, team: { select: { id: true } } } });
  if (c?.team) throw new DomainError("community_group", "Ce groupe est la discussion d’une équipe de hackathon : on le rejoint ou on le quitte depuis l’équipe.", 409);
  if (c?.testApp) throw new DomainError("community_group", "Ce groupe suit l’application à tester : on le rejoint ou on le quitte depuis l’annonce.", 409);
  if (c?.project) throw new DomainError("community_group", "Ce groupe suit le projet Rise-Up : on le rejoint ou on le quitte depuis le projet.", 409);
}

async function assertAllContacts(tx: Prisma.TransactionClient | Db, ownerId: string, ids: string[]) {
  const found = await tx.contact.findMany({ where: { userId: ownerId, contactId: { in: ids } }, select: { contactId: true } });
  if (found.length !== ids.length) throw forbidden("Tu ne peux ajouter que tes contacts.");
  const blocked = await tx.block.count({ where: { OR: [{ blockerId: ownerId, blockedId: { in: ids } }, { blockerId: { in: ids }, blockedId: ownerId }] } });
  if (blocked) throw forbidden("Tu ne peux pas ajouter un membre avec qui un blocage est en place.");
}

export async function createGroup(userId: string, input: { name: string; theme?: string; memberIds: string[] }, prisma: Db = db) {
  const ids = [...new Set(input.memberIds)].filter((id) => id !== userId);
  if (ids.length === 0) throw new DomainError("no_members", "Choisis au moins un participant.");
  if (ids.length + 1 > GROUP_MAX_MEMBERS) throw new DomainError("too_many", `Un groupe compte ${GROUP_MAX_MEMBERS} membres au plus.`);
  return prisma.$transaction(async (tx) => {
    await assertAllContacts(tx, userId, ids);
    const [owner, added] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
      tx.user.findMany({ where: { id: { in: ids } }, select: { name: true } }),
    ]);
    const group = await tx.conversation.create({
      data: {
        kind: "GROUP",
        name: input.name,
        theme: input.theme || null,
        createdById: userId,
        members: { create: [{ userId, role: "OWNER" }, ...ids.map((id) => ({ userId: id }))] },
      },
    });
    await tx.message.create({
      data: { conversationId: group.id, kind: "SYSTEM", body: `${firstName(owner.name)} a créé le groupe et ajouté ${listNames(added.map((a) => firstName(a.name)))}` },
    });
    await notify(tx, { t: "conversation", conversationId: group.id, recipients: [userId, ...ids] });
    return { id: group.id };
  });
}

export async function addGroupMembers(userId: string, conversationId: string, memberIds: string[], prisma: Db = db) {
  const m = await membership(prisma, userId, conversationId);
  if (m.conversation.kind !== "GROUP") throw new DomainError("not_group", "On ne peut ajouter des participants qu’à un groupe.");
  if (m.conversation.createdById !== userId) throw forbidden("Seul le créateur du groupe peut ajouter des participants.");
  await assertPrivateGroup(prisma, conversationId);
  const current = new Set(m.conversation.members.map((x) => x.userId));
  const ids = [...new Set(memberIds)].filter((id) => !current.has(id));
  if (ids.length === 0) throw new DomainError("no_new_members", "Ces personnes sont déjà dans le groupe.");
  if (current.size + ids.length > GROUP_MAX_MEMBERS) throw new DomainError("too_many", `Un groupe compte ${GROUP_MAX_MEMBERS} membres au plus.`);

  return prisma.$transaction(async (tx) => {
    await assertAllContacts(tx, userId, ids);
    const [owner, added] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
      tx.user.findMany({ where: { id: { in: ids } }, select: { name: true } }),
    ]);
    await tx.conversationMember.createMany({ data: ids.map((id) => ({ conversationId, userId: id })) });
    const msg = await tx.message.create({
      data: { conversationId, kind: "SYSTEM", body: `${firstName(owner.name)} a ajouté ${listNames(added.map((a) => firstName(a.name)))}` },
    });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
    const everyone = [...current, ...ids];
    await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients: everyone });
    // Tout le monde recharge le groupe : les anciens membres voient la nouvelle liste et le nouveau compte.
    await notify(tx, { t: "conversation", conversationId, recipients: everyone });
    return { added: ids.length };
  });
}

/** The owner removes a participant. The removed member loses access at once. */
export async function removeGroupMember(userId: string, conversationId: string, memberId: string, prisma: Db = db) {
  const m = await membership(prisma, userId, conversationId);
  if (m.conversation.kind !== "GROUP") throw new DomainError("not_group", "On ne retire des participants que d’un groupe.");
  if (m.conversation.createdById !== userId) throw forbidden("Seul le créateur du groupe peut retirer des participants.");
  if (memberId === userId) throw new DomainError("self", "Pour partir, quitte le groupe.");
  await assertPrivateGroup(prisma, conversationId);
  const everyone = m.conversation.members.map((x) => x.userId);
  if (!everyone.includes(memberId)) throw notFound("Ce membre ne fait pas partie du groupe.");

  return prisma.$transaction(async (tx) => {
    const [owner, removed] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
      tx.user.findUniqueOrThrow({ where: { id: memberId }, select: { name: true } }),
    ]);
    await tx.conversationMember.delete({ where: { conversationId_userId: { conversationId, userId: memberId } } });
    const msg = await tx.message.create({ data: { conversationId, kind: "SYSTEM", body: `${firstName(owner.name)} a retiré ${firstName(removed.name)}` } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
    const remaining = everyone.filter((id) => id !== memberId);
    await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients: remaining });
    await notify(tx, { t: "conversation", conversationId, recipients: everyone });
    return { ok: true };
  });
}

/** The owner of a private group, checked before a change to its name, theme or photo. */
async function ownedGroup(prisma: Db, userId: string, conversationId: string) {
  const m = await membership(prisma, userId, conversationId);
  if (m.conversation.kind !== "GROUP") throw new DomainError("not_group", "Seul un groupe a un nom et une photo.");
  if (m.conversation.createdById !== userId) throw forbidden("Seul le responsable du groupe peut le modifier.");
  await assertPrivateGroup(prisma, conversationId);
  return m;
}

/** A line « Kossi a … » in the group, pushed to everyone, and the list of conversations refreshed. */
async function announceChange(tx: Prisma.TransactionClient, conversationId: string, everyone: string[], body: string) {
  const msg = await tx.message.create({ data: { conversationId, kind: "SYSTEM", body } });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
  await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients: everyone });
  await notify(tx, { t: "conversation", conversationId, recipients: everyone });
}

/** The owner renames the group or changes its theme. Nothing is written when nothing changes. */
export async function updateGroup(userId: string, conversationId: string, input: { name: string; theme?: string | null }, prisma: Db = db) {
  const m = await ownedGroup(prisma, userId, conversationId);
  const theme = input.theme === undefined ? m.conversation.theme : input.theme;
  const renamed = input.name !== m.conversation.name;
  if (!renamed && theme === m.conversation.theme) return { ok: true };
  return prisma.$transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    await tx.conversation.update({ where: { id: conversationId }, data: { name: input.name, theme } });
    const everyone = m.conversation.members.map((x) => x.userId);
    // Un renommage et un changement de thème faits ensemble laissent chacun leur ligne.
    if (renamed) await announceChange(tx, conversationId, everyone, `${firstName(me.name)} a renommé le groupe « ${input.name} »`);
    if (theme !== m.conversation.theme) await announceChange(tx, conversationId, everyone, `${firstName(me.name)} a changé le thème du groupe`);
    return { ok: true };
  });
}

/** The owner sets the group's photo (an image checked by its content), or removes it with `null`. */
export async function setGroupPhoto(userId: string, conversationId: string, data: Uint8Array | null, prisma: Db = db) {
  const m = await ownedGroup(prisma, userId, conversationId);
  const mime = data ? sniffMime(data) : null;
  if (data) {
    const problem = groupPhotoProblem(mime, data.byteLength);
    if (problem) throw new DomainError("bad_file", problem, 400, "photo");
  } else if (!m.conversation.photoAt) {
    return { photo: null };
  }
  return prisma.$transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const photoAt = data ? new Date() : null;
    if (data) {
      const bytes = Buffer.from(data);
      await tx.groupPhoto.upsert({ where: { conversationId }, create: { conversationId, mime: mime!, data: bytes }, update: { mime: mime!, data: bytes } });
    } else {
      await tx.groupPhoto.deleteMany({ where: { conversationId } });
    }
    await tx.conversation.update({ where: { id: conversationId }, data: { photoAt } });
    await announceChange(tx, conversationId, m.conversation.members.map((x) => x.userId), `${firstName(me.name)} a ${data ? "changé" : "retiré"} la photo du groupe`);
    return { photo: photoUrl({ id: conversationId, photoAt }) };
  });
}

/** The photo of a group, for its members only. */
export async function getGroupPhoto(userId: string, conversationId: string, prisma: Db = db) {
  await membership(prisma, userId, conversationId);
  const photo = await prisma.groupPhoto.findUnique({ where: { conversationId } });
  if (!photo) throw notFound("Photo introuvable.");
  return photo;
}

/** A member leaves a group. If the creator leaves, the longest-standing member takes over; the last one out deletes the group. */
export async function leaveGroup(userId: string, conversationId: string, prisma: Db = db) {
  const m = await membership(prisma, userId, conversationId);
  if (m.conversation.kind !== "GROUP") throw new DomainError("not_group", "On ne peut quitter qu’un groupe.");
  await assertPrivateGroup(prisma, conversationId);
  const everyone = m.conversation.members.map((x) => x.userId);

  return prisma.$transaction(async (tx) => {
    await tx.conversationMember.delete({ where: { conversationId_userId: { conversationId, userId } } });
    const remaining = everyone.filter((id) => id !== userId);
    if (remaining.length === 0) {
      await tx.conversation.delete({ where: { id: conversationId } });
      return { ok: true };
    }
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    let body = `${firstName(me.name)} a quitté le groupe`;
    if (m.conversation.createdById === userId) {
      const heir = await tx.conversationMember.findFirstOrThrow({ where: { conversationId }, orderBy: [{ joinedAt: "asc" }, { userId: "asc" }], include: { user: { select: { name: true } } } });
      await tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId: heir.userId } }, data: { role: "OWNER" } });
      await tx.conversation.update({ where: { id: conversationId }, data: { createdById: heir.userId } });
      body += `. ${firstName(heir.user.name)} gère maintenant le groupe`;
    }
    const msg = await tx.message.create({ data: { conversationId, kind: "SYSTEM", body } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
    await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients: remaining });
    await notify(tx, { t: "conversation", conversationId, recipients: everyone });
    return { ok: true };
  });
}

/*
 * Community groups: the chat of an Africa Rise-Up project, of an app's testers or of a hackathon team.
 * Members join by joining the project or the test, not through contacts, so the size limit of private groups does not apply.
 */

export async function openCommunityGroup(tx: Prisma.TransactionClient, input: { name: string; theme: string; ownerId: string; intro: string }) {
  const group = await tx.conversation.create({
    data: { kind: "GROUP", name: input.name.slice(0, 60), theme: input.theme, createdById: input.ownerId, members: { create: [{ userId: input.ownerId, role: "OWNER" }] } },
  });
  await tx.message.create({ data: { conversationId: group.id, kind: "SYSTEM", body: input.intro } });
  await notify(tx, { t: "conversation", conversationId: group.id, recipients: [input.ownerId] });
  return group.id;
}

export async function joinCommunityGroup(tx: Prisma.TransactionClient, conversationId: string, userId: string) {
  const exists = await tx.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  if (exists) return;
  const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  await tx.conversationMember.create({ data: { conversationId, userId } });
  const msg = await tx.message.create({ data: { conversationId, kind: "SYSTEM", body: `${firstName(me.name)} a rejoint le groupe` } });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } });
  const everyone = (await tx.conversationMember.findMany({ where: { conversationId }, select: { userId: true } })).map((m) => m.userId);
  await notify(tx, { t: "message", conversationId, messageId: msg.id, recipients: everyone });
  await notify(tx, { t: "conversation", conversationId, recipients: [userId] });
}

/**
 * Le départ laisse sa ligne « X a quitté le groupe », comme dans un groupe privé : quitter puis rejoindre
 * se lit « a rejoint, a quitté, a rejoint » au lieu de deux arrivées de suite sans départ.
 */
export async function leaveCommunityGroup(tx: Prisma.TransactionClient, conversationId: string, userId: string) {
  const { count } = await tx.conversationMember.deleteMany({ where: { conversationId, userId } });
  if (!count) return;
  await notify(tx, { t: "conversation", conversationId, recipients: [userId] });
  // Like an arrival, a departure leaves a line in the group.
  const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const everyone = (await tx.conversationMember.findMany({ where: { conversationId }, select: { userId: true } })).map((m) => m.userId);
  await announceChange(tx, conversationId, everyone, `${firstName(me.name)} a quitté le groupe`);
}

/** The group passes to another of its members: a hackathon team whose captain left. */
export async function handOverCommunityGroup(tx: Prisma.TransactionClient, conversationId: string, ownerId: string) {
  await tx.conversationMember.updateMany({ where: { conversationId, role: "OWNER" }, data: { role: "MEMBER" } });
  await tx.conversationMember.updateMany({ where: { conversationId, userId: ownerId }, data: { role: "OWNER" } });
  await tx.conversation.update({ where: { id: conversationId }, data: { createdById: ownerId } });
  const owner = await tx.user.findUniqueOrThrow({ where: { id: ownerId }, select: { name: true } });
  const everyone = (await tx.conversationMember.findMany({ where: { conversationId }, select: { userId: true } })).map((m) => m.userId);
  await announceChange(tx, conversationId, everyone, `${firstName(owner.name)} est maintenant responsable du groupe`);
}

/** The group disappears with what it followed: a hackathon team left by its last member. */
export async function closeCommunityGroup(tx: Prisma.TransactionClient, conversationId: string) {
  await tx.conversation.deleteMany({ where: { id: conversationId } });
}

/* Reports and blocks */

export async function createReport(
  userId: string,
  input: { targetType: "USER" | "MESSAGE" | "CONVERSATION" | "INVITATION" | "ROOM"; targetId: string; reason: string; details?: string; block: boolean },
  prisma: Db = db,
) {
  let blockId: string | null = null;
  switch (input.targetType) {
    case "USER": {
      if (!(await prisma.user.count({ where: { id: input.targetId } }))) throw notFound("Membre introuvable.");
      blockId = input.targetId;
      break;
    }
    case "MESSAGE": {
      const msg = await prisma.message.findUnique({ where: { id: input.targetId }, select: { conversationId: true, authorId: true } });
      if (!msg) throw notFound("Message introuvable.");
      await membership(prisma, userId, msg.conversationId);
      blockId = msg.authorId;
      break;
    }
    case "CONVERSATION": {
      const m = await membership(prisma, userId, input.targetId);
      blockId = m.conversation.kind === "DIRECT" ? (m.conversation.members.find((x) => x.userId !== userId)?.userId ?? null) : null;
      break;
    }
    case "INVITATION": {
      const inv = await prisma.invitation.findUnique({ where: { id: input.targetId } });
      if (!inv || (inv.toId !== userId && inv.fromId !== userId)) throw notFound("Invitation introuvable.");
      blockId = inv.toId === userId ? inv.fromId : inv.toId;
      if (input.block && inv.toId === userId && inv.status === "PENDING") {
        await prisma.invitation.update({ where: { id: inv.id }, data: { status: "DECLINED", answeredAt: new Date() } });
      }
      break;
    }
    case "ROOM": {
      const room = await prisma.voiceRoom.findUnique({ where: { id: input.targetId }, select: { hostId: true } });
      if (!room) throw notFound("Salon introuvable.");
      blockId = room.hostId;
      break;
    }
  }
  // Two reports on the same thing by the same member count once.
  const already = await prisma.report.count({ where: { reporterId: userId, targetType: input.targetType, targetId: input.targetId, status: "OPEN" } });
  if (!already) {
    await prisma.report.create({ data: { reporterId: userId, targetType: input.targetType, targetId: input.targetId, targetUserId: blockId, reason: input.reason, details: input.details } });
  }
  if (input.block && blockId && blockId !== userId) await block(userId, blockId, prisma);
  return { ok: true };
}

/**
 * Blocking cuts every link: the two are no longer contacts (so neither can add the other to a group),
 * pending invitations and mentoring requests between them are closed, and a mentoring pair ends.
 */
export async function block(userId: string, blockedId: string, prisma: Db = db) {
  const both = [
    { userId, contactId: blockedId },
    { userId: blockedId, contactId: userId },
  ];
  await prisma.$transaction(async (tx) => {
    await tx.block.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId } }, create: { blockerId: userId, blockedId }, update: {} });
    await tx.contact.deleteMany({ where: { OR: both } });
    await tx.invitation.updateMany({
      where: { status: "PENDING", OR: [{ fromId: userId, toId: blockedId }, { fromId: blockedId, toId: userId }] },
      data: { status: "DECLINED", answeredAt: new Date() },
    });
    // Sessions to come between them are cancelled.
    await tx.mentoringBooking.updateMany({
      where: { status: { in: ["PENDING", "ACCEPTED"] }, startsAt: { gt: new Date() }, OR: [{ mentorId: userId, menteeId: blockedId }, { mentorId: blockedId, menteeId: userId }] },
      data: { status: "CANCELLED", answeredAt: new Date() },
    });
    await announceBlockChange(tx, userId, blockedId);
  });
}

/** Leur conversation à deux se recharge chez l'un et l'autre : le champ de saisie se ferme ou se rouvre en direct. */
async function announceBlockChange(tx: Prisma.TransactionClient, a: string, b: string) {
  const direct = await tx.conversation.findUnique({ where: { directKey: directKey(a, b) }, select: { id: true } });
  if (direct) await notify(tx, { t: "conversation", conversationId: direct.id, recipients: [a, b] });
}

export async function listBlocked(userId: string, prisma: Db = db) {
  const rows = await prisma.block.findMany({ where: { blockerId: userId }, include: { blocked: { select: { id: true, name: true, city: true } } }, orderBy: { createdAt: "desc" } });
  return rows.map((b) => ({ ...b.blocked, since: b.createdAt.toISOString() }));
}

/**
 * Débloquer rend l'état d'avant le blocage : si les deux avaient une conversation (donc une invitation acceptée),
 * ils redeviennent contacts, comme le suppose la conversation rouverte. Sans conversation, il faut une nouvelle invitation.
 * Rien ne se rouvre tant que l'autre bloque encore.
 */
export async function unblock(userId: string, blockedId: string, prisma: Db = db) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.block.deleteMany({ where: { blockerId: userId, blockedId } });
    if (!count || (await isBlocked(tx, userId, blockedId))) return;
    const direct = await tx.conversation.findUnique({ where: { directKey: directKey(userId, blockedId) }, select: { id: true } });
    if (!direct) return;
    await tx.contact.createMany({ data: [{ userId, contactId: blockedId }, { userId: blockedId, contactId: userId }], skipDuplicates: true });
    await announceBlockChange(tx, userId, blockedId);
  });
  return { ok: true };
}

/** Turns a 404 refusal into null, for pages that answer with notFound(). */
export async function orNotFound<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) return null;
    throw e;
  }
}
