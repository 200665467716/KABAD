/*
 * Voice rooms: live audio events, a stage and an audience (like Clubhouse or Twitter Spaces).
 * - any member with a confirmed e-mail schedules a room or opens one right away;
 * - the host goes live; members who asked for a reminder are notified;
 * - listeners raise their hand; the host brings them on stage, sends them back, or removes them;
 * - only the host and the speakers can publish audio, enforced by the LiveKit token and server;
 * - a member blocked by the host (or who blocked the host) cannot join; the team can close any room.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { closeLivekitRoom, connectedIdentities, joinToken, livekitConfig, removeFromLivekit, setCanSpeak } from "./livekit";
import { pushNotifications } from "./notifications";
import { notify } from "./realtime-events";
import type { RoomDetail, RoomPerson, RoomSummary } from "@/lib/domain-types";

export const ROOM_MAX_LISTENERS = 300;
export const ROOM_MAX_SPEAKERS = 12;

const include = {
  host: { select: { id: true, name: true } },
  participants: { where: { leftAt: null, removedAt: null }, include: { user: { select: { id: true, name: true } } }, orderBy: { joinedAt: "asc" } },
  _count: { select: { interests: true } },
} as const;
type Row = Prisma.VoiceRoomGetPayload<{ include: typeof include }>;

function summary(r: Row, remindMe: boolean): RoomSummary {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    startsAt: r.startsAt.toISOString(),
    host: r.host,
    listeners: r.participants.length,
    speakers: r.participants.filter((p) => p.role !== "LISTENER").map((p) => p.user.name),
    interested: r._count.interests,
    remindMe,
  };
}

/** Everyone in the room, and the room's realtime audience: present members plus the host. */
async function audienceIds(tx: Prisma.TransactionClient | Db, roomId: string) {
  const r = await tx.voiceRoom.findUniqueOrThrow({ where: { id: roomId }, select: { hostId: true, participants: { where: { leftAt: null }, select: { userId: true } } } });
  return [...new Set([r.hostId, ...r.participants.map((p) => p.userId)])];
}

async function changed(tx: Prisma.TransactionClient | Db, roomId: string, extra: string[] = []) {
  await notify(tx as Prisma.TransactionClient, { t: "room", roomId, recipients: [...new Set([...(await audienceIds(tx, roomId)), ...extra])] });
}

export async function listRooms(viewerId: string, prisma: Db = db) {
  const rows = await prisma.voiceRoom.findMany({
    where: {
      hiddenAt: null,
      OR: [{ status: "LIVE" }, { status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 6 * 3600_000) } }, { status: "ENDED", endedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } }],
    },
    include,
    orderBy: { startsAt: "asc" },
    take: 60,
  });
  const mine = await prisma.roomInterest.findMany({ where: { userId: viewerId, roomId: { in: rows.map((r) => r.id) } }, select: { roomId: true } });
  const remind = new Set(mine.map((m) => m.roomId));
  const all = rows.map((r) => summary(r, remind.has(r.id)));
  return { live: all.filter((r) => r.status === "LIVE"), upcoming: all.filter((r) => r.status === "SCHEDULED"), ended: all.filter((r) => r.status === "ENDED").reverse() };
}

const lastSync = new Map<string, number>();

/**
 * Someone who closes the tab never says goodbye: every 20 seconds at most, members marked present
 * but no longer connected to the audio (and who joined more than a minute ago) are marked as gone.
 */
async function syncPresence(prisma: Db, roomId: string) {
  const lk = livekitConfig();
  const now = Date.now();
  if (!lk || now - (lastSync.get(roomId) ?? 0) < 20_000) return;
  lastSync.set(roomId, now);
  try {
    const connected = await connectedIdentities(lk, roomId);
    const gone = await prisma.roomParticipant.findMany({ where: { roomId, leftAt: null, joinedAt: { lt: new Date(now - 60_000) }, userId: { notIn: [...connected] } }, select: { userId: true } });
    if (gone.length) {
      await prisma.roomParticipant.updateMany({ where: { roomId, userId: { in: gone.map((g) => g.userId) } }, data: { leftAt: new Date(), handRaisedAt: null } });
      await prisma.$transaction((tx) => changed(tx, roomId));
    }
  } catch {
    // The audio server is unreachable: keep the list as it is.
  }
}

export async function getRoom(viewerId: string, roomId: string, prisma: Db = db): Promise<RoomDetail> {
  await syncPresence(prisma, roomId);
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, include });
  if (!r || r.hiddenAt) throw notFound("Salon introuvable.");
  const [me, remind] = await Promise.all([
    prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId, userId: viewerId } } }),
    prisma.roomInterest.count({ where: { roomId, userId: viewerId } }),
  ]);
  const person = (p: Row["participants"][number]): RoomPerson => ({ id: p.user.id, name: p.user.name, role: p.role, handRaised: p.handRaisedAt !== null });
  const people = r.participants.map(person);
  return {
    ...summary(r, remind > 0),
    me: { role: r.hostId === viewerId ? "HOST" : (me?.role ?? null), inRoom: Boolean(me && !me.leftAt && !me.removedAt), removed: Boolean(me?.removedAt), handRaised: Boolean(me?.handRaisedAt && !me.leftAt) },
    stage: people.filter((p) => p.role !== "LISTENER"),
    // Raised hands first, so the host sees them.
    audience: people.filter((p) => p.role === "LISTENER").sort((a, b) => Number(b.handRaised) - Number(a.handRaised)),
  };
}

export async function createRoom(hostId: string, input: { title: string; description: string; startsAt?: string; now: boolean }, prisma: Db = db) {
  const live = await prisma.voiceRoom.count({ where: { hostId, status: { in: ["LIVE", "SCHEDULED"] } } });
  if (live >= 5) throw new DomainError("too_many", "Vous avez déjà 5 salons prévus ou en cours.", 409);
  const startsAt = input.now || !input.startsAt ? new Date() : new Date(input.startsAt);
  if (!input.now && (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000)) throw new DomainError("date", "Choisissez une date à venir.", 400, "startsAt");
  if (startsAt.getTime() > Date.now() + 60 * 86_400_000) throw new DomainError("date", "Un salon se programme 60 jours à l’avance au plus.", 400, "startsAt");
  const room = await prisma.voiceRoom.create({
    data: { title: input.title, description: input.description, hostId, startsAt, status: input.now ? "LIVE" : "SCHEDULED", startedAt: input.now ? new Date() : null, participants: { create: { userId: hostId, role: "HOST", leftAt: new Date() } } },
  });
  return { id: room.id };
}

async function hostRoom(prisma: Db | Prisma.TransactionClient, hostId: string, roomId: string) {
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, select: { id: true, hostId: true, status: true, title: true, hiddenAt: true } });
  if (!r || r.hiddenAt) throw notFound("Salon introuvable.");
  if (r.hostId !== hostId) throw forbidden("Seul l’hôte du salon peut faire cela.");
  return r;
}

export async function startRoom(hostId: string, roomId: string, prisma: Db = db) {
  const r = await hostRoom(prisma, hostId, roomId);
  if (r.status !== "SCHEDULED") throw new DomainError("not_scheduled", r.status === "LIVE" ? "Le salon est déjà en direct." : "Ce salon est terminé.", 409);
  const host = await prisma.user.findUniqueOrThrow({ where: { id: hostId }, select: { name: true } });
  return prisma.$transaction(async (tx) => {
    await tx.voiceRoom.update({ where: { id: roomId }, data: { status: "LIVE", startedAt: new Date() } });
    const interested = await tx.roomInterest.findMany({ where: { roomId }, select: { userId: true } });
    await pushNotifications(
      tx,
      interested.map((i) => ({ userId: i.userId, actor: host.name, text: `est en direct : « ${r.title} ». Rejoignez le salon.`, href: `/salons/${roomId}`, icon: "radio" as const, tone: "accent" as const })),
    );
    await changed(tx, roomId, interested.map((i) => i.userId));
    return { ok: true };
  });
}

export async function endRoom(userId: string, roomId: string, opts: { asAdmin?: boolean } = {}, prisma: Db = db) {
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, select: { hostId: true, status: true } });
  if (!r) throw notFound("Salon introuvable.");
  if (r.hostId !== userId && !opts.asAdmin) throw forbidden("Seul l’hôte du salon peut le terminer.");
  if (r.status === "ENDED") return { ok: true };
  const recipients = await audienceIds(prisma, roomId);
  await prisma.$transaction(async (tx) => {
    await tx.voiceRoom.update({ where: { id: roomId }, data: { status: "ENDED", endedAt: new Date() } });
    await tx.roomParticipant.updateMany({ where: { roomId, leftAt: null }, data: { leftAt: new Date(), handRaisedAt: null } });
    await notify(tx, { t: "room", roomId, recipients });
  });
  const lk = livekitConfig();
  if (lk) await closeLivekitRoom(lk, roomId).catch(() => {});
  return { ok: true };
}

export async function toggleReminder(userId: string, roomId: string, prisma: Db = db) {
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, select: { status: true, hiddenAt: true } });
  if (!r || r.hiddenAt || r.status !== "SCHEDULED") throw notFound("Salon introuvable.");
  const existing = await prisma.roomInterest.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (existing) await prisma.roomInterest.delete({ where: { roomId_userId: { roomId, userId } } });
  else await prisma.roomInterest.create({ data: { roomId, userId } });
  return { remindMe: !existing };
}

/** Joins a live room and returns the LiveKit token. Listeners join muted; the host and speakers can talk. */
export async function joinRoom(user: { id: string; name: string }, roomId: string, prisma: Db = db) {
  const lk = livekitConfig();
  if (!lk) throw new DomainError("audio_unavailable", "Les salons vocaux ne sont pas encore activés sur ce serveur.", 503);
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, select: { hostId: true, status: true, hiddenAt: true } });
  if (!r || r.hiddenAt) throw notFound("Salon introuvable.");
  if (r.status !== "LIVE") throw new DomainError("not_live", r.status === "SCHEDULED" ? "Le salon n’a pas encore commencé." : "Ce salon est terminé.", 409);
  const blocked = await prisma.block.count({ where: { OR: [{ blockerId: r.hostId, blockedId: user.id }, { blockerId: user.id, blockedId: r.hostId }] } });
  if (blocked) throw forbidden("Vous ne pouvez pas rejoindre ce salon.");
  const me = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
  if (me?.removedAt) throw forbidden("L’hôte vous a retiré de ce salon.");
  const present = await prisma.roomParticipant.count({ where: { roomId, leftAt: null, removedAt: null } });
  const coming = !me || me.leftAt !== null;
  if (coming && present >= ROOM_MAX_LISTENERS) throw new DomainError("full", "Le salon est complet.", 409);
  const role = r.hostId === user.id ? "HOST" : (me?.role ?? "LISTENER");
  await prisma.$transaction(async (tx) => {
    await tx.roomParticipant.upsert({
      where: { roomId_userId: { roomId, userId: user.id } },
      create: { roomId, userId: user.id, role },
      update: { leftAt: null, joinedAt: new Date() },
    });
    await changed(tx, roomId);
  });
  return { url: lk.publicUrl, token: await joinToken(lk, roomId, user, role !== "LISTENER"), role };
}

export async function leaveRoom(userId: string, roomId: string, prisma: Db = db) {
  const r = await prisma.voiceRoom.findUnique({ where: { id: roomId }, select: { hostId: true } });
  if (!r) throw notFound("Salon introuvable.");
  // When the host leaves, the room ends.
  if (r.hostId === userId) return endRoom(userId, roomId, {}, prisma);
  await prisma.$transaction(async (tx) => {
    await tx.roomParticipant.updateMany({ where: { roomId, userId }, data: { leftAt: new Date(), handRaisedAt: null } });
    await changed(tx, roomId, [userId]);
  });
  return { ok: true };
}

export async function raiseHand(userId: string, roomId: string, up: boolean, prisma: Db = db) {
  const me = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!me || me.leftAt || me.removedAt) throw new DomainError("not_in_room", "Rejoignez d’abord le salon.", 409);
  if (me.role !== "LISTENER") return { ok: true };
  await prisma.$transaction(async (tx) => {
    await tx.roomParticipant.update({ where: { roomId_userId: { roomId, userId } }, data: { handRaisedAt: up ? new Date() : null } });
    await changed(tx, roomId);
  });
  return { ok: true };
}

/** The host brings a member on stage or sends them back to the audience. */
export async function setSpeaker(hostId: string, roomId: string, userId: string, speak: boolean, prisma: Db = db) {
  const r = await hostRoom(prisma, hostId, roomId);
  if (r.status !== "LIVE") throw new DomainError("not_live", "Le salon n’est pas en direct.", 409);
  if (userId === hostId) throw new DomainError("self", "Vous êtes l’hôte : vous restez sur scène.");
  const p = await prisma.roomParticipant.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!p || p.leftAt || p.removedAt) throw notFound("Ce membre n’est plus dans le salon.");
  if (speak && (await prisma.roomParticipant.count({ where: { roomId, role: "SPEAKER", leftAt: null } })) >= ROOM_MAX_SPEAKERS) throw new DomainError("stage_full", `${ROOM_MAX_SPEAKERS} intervenants au plus sur scène.`, 409);
  const lk = livekitConfig();
  // The audio server is updated first: if it fails, nothing changes.
  if (lk) await setCanSpeak(lk, roomId, userId, speak);
  await prisma.$transaction(async (tx) => {
    await tx.roomParticipant.update({ where: { roomId_userId: { roomId, userId } }, data: { role: speak ? "SPEAKER" : "LISTENER", handRaisedAt: null } });
    await changed(tx, roomId);
  });
  return { ok: true };
}

/** The host removes someone: they are cut from the audio and cannot come back into this room. */
export async function removeFromRoom(hostId: string, roomId: string, userId: string, prisma: Db = db) {
  await hostRoom(prisma, hostId, roomId);
  if (userId === hostId) throw new DomainError("self", "Vous ne pouvez pas vous retirer : terminez le salon.");
  const lk = livekitConfig();
  if (lk) await removeFromLivekit(lk, roomId, userId);
  await prisma.$transaction(async (tx) => {
    await tx.roomParticipant.updateMany({ where: { roomId, userId }, data: { removedAt: new Date(), leftAt: new Date(), handRaisedAt: null, role: "LISTENER" } });
    await changed(tx, roomId, [userId]);
  });
  return { ok: true };
}
