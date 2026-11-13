/*
 * Mentoring by time slots, enforced on the server:
 * - only members holding the mentor badge open slots; KABAD cuts their weekly ranges into 30-minute slots;
 * - a member books a free slot with a topic and a precise problem; one slot holds one active booking
 *   (a partial unique index in PostgreSQL settles two clicks at the same instant);
 * - one person holds one session at a time, as a dev or as a mentor: checked when booking and again when accepting;
 * - the mentor accepts or declines; accepting gives both of them the video link;
 * - a request not answered before its slot starts lapses (worker, src/server/jobs.ts); it can no longer be accepted.
 */
import type { Prisma } from "@/generated/prisma/client";
import { db, type Db } from "./db";
import { DomainError, forbidden, notFound } from "./errors";
import { pushNotifications } from "./notifications";
import { freeSlots, isOfferedSlot, rangesProblem, type WeeklyRange } from "@/lib/slots";
import { MAX_PENDING_BOOKINGS, SESSION_MINUTES } from "@/lib/mentoring";
import type { AvailabilityView, BookingView, MentorCard, MentorDetail } from "@/lib/domain-types";

/** How far ahead slots are offered. */
export const BOOKING_WINDOW_DAYS = 30;
type Tx = Db | Prisma.TransactionClient;

const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

async function badgeOf(prisma: Tx, userIds: string[]) {
  const rows = await prisma.mentorBadgeRequest.findMany({
    where: { userId: { in: userIds }, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: { userId: true, domains: true, technologies: true, topics: true, jobTitle: true, company: true, experience: true, githubUrl: true, linkedinUrl: true, portfolioUrl: true },
  });
  const out = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!out.has(r.userId)) out.set(r.userId, r);
  return out;
}

const ACTIVE = ["PENDING", "ACCEPTED"] as const;
const SPAN = SESSION_MINUTES * 60_000;

/** Active sessions (asked or accepted) of these people, as a dev or as a mentor, that overlap a session starting at `startsAt`. */
function overlapping(userIds: string[], startsAt: Date) {
  return {
    OR: [{ menteeId: { in: userIds } }, { mentorId: { in: userIds } }],
    status: { in: [...ACTIVE] },
    startsAt: { gt: new Date(startsAt.getTime() - SPAN), lt: new Date(startsAt.getTime() + SPAN) },
  } satisfies Prisma.MentoringBookingWhereInput;
}

/** True when a slot overlaps one of these session starts. */
const clashes = (slot: Date, starts: Date[]) => starts.some((s) => Math.abs(s.getTime() - slot.getTime()) < SPAN);

/** `viewerId`: the member looking at the calendar; slots where they already have a session are shown as taken. */
async function slotsOf(prisma: Tx, mentorIds: string[], from: Date, to: Date, viewerId?: string) {
  const now = new Date();
  const people = viewerId ? [...mentorIds, viewerId] : mentorIds;
  const window = { gt: new Date(from.getTime() - SPAN), lt: new Date(to.getTime() + SPAN) };
  const [mentors, taken] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: mentorIds } },
      select: { id: true, timeZone: true, availability: { select: { weekday: true, startMin: true, endMin: true } }, blockedDates: { select: { day: true } } },
    }),
    // A mentor is busy during their sessions as a mentor, and also during those they booked as a dev.
    prisma.mentoringBooking.findMany({ where: { OR: [{ mentorId: { in: people } }, { menteeId: { in: people } }], status: { in: [...ACTIVE] }, startsAt: window }, select: { mentorId: true, menteeId: true, startsAt: true } }),
  ]);
  const busyOf = (id: string) => taken.filter((t) => t.mentorId === id || t.menteeId === id).map((t) => t.startsAt);
  const viewerBusy = viewerId ? busyOf(viewerId) : [];
  // For each mentor: the slots still free, and those already booked (shown crossed out on the calendar).
  const out = new Map<string, { free: Date[]; taken: Date[] }>();
  for (const m of mentors) {
    const busy = [...busyOf(m.id), ...viewerBusy];
    const open = freeSlots({ ranges: m.availability, timeZone: m.timeZone, from, to, now, blocked: m.blockedDates.map((b) => b.day.toISOString().slice(0, 10)) });
    out.set(m.id, { free: open.filter((d) => !clashes(d, busy)), taken: open.filter((d) => clashes(d, busy)) });
  }
  return out;
}

/**
 * One person, one session at a time, as a dev or as a mentor. Checked inside the transaction that writes,
 * after locking both people: two requests at the same instant wait for each other instead of both passing.
 */
async function assertFree(tx: Prisma.TransactionClient, people: { menteeId: string; mentorId: string }, startsAt: Date, exceptId?: string) {
  const ids = [people.menteeId, people.mentorId].sort();
  // Always in the same order (by id), so that two transactions never wait for each other in a loop.
  for (const id of ids) await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${id} FOR UPDATE`;
  const rows = await tx.mentoringBooking.findMany({ where: { ...overlapping(ids, startsAt), ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { menteeId: true, mentorId: true } });
  return {
    menteeBusy: rows.some((r) => r.menteeId === people.menteeId || r.mentorId === people.menteeId),
    mentorBusy: rows.some((r) => r.menteeId === people.mentorId || r.mentorId === people.mentorId),
  };
}

async function sessionsHeld(prisma: Tx, mentorIds: string[]) {
  const rows = await prisma.mentoringBooking.groupBy({ by: ["mentorId"], where: { mentorId: { in: mentorIds }, status: "ACCEPTED", startsAt: { lt: new Date() } }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.mentorId, r._count._all]));
}

const mentorWhere = { seniorVerifiedAt: { not: null }, suspendedAt: null } as const;

/** The catalogue of badged mentors, optionally narrowed to one area ("Paiements et fintech"). */
export async function listMentors(opts: { domain?: string; excludeId?: string } = {}, prisma: Db = db): Promise<MentorCard[]> {
  const users = await prisma.user.findMany({ where: { ...mentorWhere, ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}) }, select: { id: true, name: true, city: true, country: true, headline: true }, orderBy: { name: "asc" } });
  const ids = users.map((u) => u.id);
  const from = new Date();
  const to = new Date(from.getTime() + 14 * 86_400_000);
  const [badges, slots, held] = await Promise.all([badgeOf(prisma, ids), slotsOf(prisma, ids, from, to), sessionsHeld(prisma, ids)]);
  return users
    .map((u) => ({
      ...u,
      domains: badges.get(u.id)?.domains ?? [],
      technologies: badges.get(u.id)?.technologies ?? [],
      nextSlot: slots.get(u.id)?.free[0]?.toISOString() ?? null,
      sessionsHeld: held.get(u.id) ?? 0,
    }))
    .filter((m) => !opts.domain || m.domains.includes(opts.domain))
    // Mentors with a slot soon come first.
    // ISO dates compare as plain strings; a mentor without a slot goes last (localeCompare put "~" before digits).
    .sort((a, b) => (a.nextSlot === b.nextSlot ? 0 : a.nextSlot === null ? 1 : b.nextSlot === null ? -1 : a.nextSlot < b.nextSlot ? -1 : 1));
}

/** `viewerId`: the member who looks; their own sessions are taken off the slots offered to them. */
export async function getMentor(mentorId: string, prisma: Db = db, viewerId?: string): Promise<MentorDetail> {
  const u = await prisma.user.findFirst({ where: { id: mentorId, ...mentorWhere }, select: { id: true, name: true, city: true, country: true, headline: true, bio: true, timeZone: true, gender: true } });
  if (!u) throw notFound("Mentor introuvable.");
  const from = new Date();
  const to = new Date(from.getTime() + BOOKING_WINDOW_DAYS * 86_400_000);
  const [badges, slots, held, rating] = await Promise.all([badgeOf(prisma, [u.id]), slotsOf(prisma, [u.id], from, to, viewerId), sessionsHeld(prisma, [u.id]), ratingOf(prisma, u.id)]);
  const all = slots.get(u.id)?.free ?? [];
  const badge = badges.get(u.id);
  return {
    ...u,
    domains: badge?.domains ?? [],
    technologies: badge?.technologies ?? [],
    topics: badge?.topics ?? "",
    // What the KABAD team checked to grant the badge: shown on the mentor's sheet (M2).
    jobTitle: badge?.jobTitle ?? "",
    company: badge?.company ?? null,
    experience: badge?.experience ?? "",
    links: { github: badge?.githubUrl ?? null, linkedin: badge?.linkedinUrl ?? null, portfolio: badge?.portfolioUrl ?? null },
    nextSlot: all[0]?.toISOString() ?? null,
    sessionsHeld: held.get(u.id) ?? 0,
    rating,
    slots: all.map((d) => d.toISOString()),
    takenSlots: (slots.get(u.id)?.taken ?? []).map((d) => d.toISOString()),
  };
}

/* Booking */

export async function bookSlot(menteeId: string, input: { mentorId: string; startsAt: string; topic: string; problem: string; link?: string }, prisma: Db = db) {
  if (input.mentorId === menteeId) throw new DomainError("self", "Tu ne peux pas réserver tes propres créneaux.");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new DomainError("bad_slot", "Créneau invalide.", 400, "startsAt");
  // The calendar shows 30 days: a request sent by hand for a later date is refused too.
  if (startsAt.getTime() > Date.now() + BOOKING_WINDOW_DAYS * 86_400_000) throw new DomainError("too_far", `Tu peux réserver jusqu’à ${BOOKING_WINDOW_DAYS} jours à l’avance.`, 409, "startsAt");
  const [mentor, mentee, blocked, pending] = await Promise.all([
    prisma.user.findFirst({ where: { id: input.mentorId, ...mentorWhere }, select: { id: true, name: true, timeZone: true, availability: { select: { weekday: true, startMin: true, endMin: true } }, blockedDates: { select: { day: true } } } }),
    prisma.user.findUniqueOrThrow({ where: { id: menteeId }, select: { name: true } }),
    prisma.block.count({ where: { OR: [{ blockerId: menteeId, blockedId: input.mentorId }, { blockerId: input.mentorId, blockedId: menteeId }] } }),
    prisma.mentoringBooking.count({ where: { menteeId, status: "PENDING" } }),
  ]);
  if (!mentor) throw notFound("Mentor introuvable.");
  if (blocked) throw forbidden("Tu ne peux pas réserver de séance avec ce mentor.");
  if (pending >= MAX_PENDING_BOOKINGS) throw new DomainError("too_many", `Tu attends déjà ${MAX_PENDING_BOOKINGS} réponses. Attends qu’un mentor réponde avant d’en demander d’autres.`, 429);
  const offered = isOfferedSlot(startsAt, {
    ranges: mentor.availability,
    timeZone: mentor.timeZone,
    now: new Date(),
    blocked: mentor.blockedDates.map((b) => b.day.toISOString().slice(0, 10)),
  });
  if (!offered) throw new DomainError("bad_slot", "Ce créneau n’est pas proposé par le mentor.", 409, "startsAt");

  try {
    return await prisma.$transaction(async (tx) => {
      // One person, one session at a time: asked or held, as a dev or as a mentor, for both of them.
      const busy = await assertFree(tx, { menteeId, mentorId: mentor.id }, startsAt);
      if (busy.menteeBusy) throw new DomainError("clash", "Tu as déjà une séance à cette heure. Choisis un autre créneau.", 409, "startsAt");
      if (busy.mentorBusy) throw new DomainError("slot_taken", "Ce mentor n’est plus libre à cette heure. Choisis un autre créneau.", 409, "startsAt");
      const b = await tx.mentoringBooking.create({
        data: { mentorId: mentor.id, menteeId, startsAt, minutes: SESSION_MINUTES, topic: input.topic, problem: input.problem, link: input.link || null },
      });
      await pushNotifications(tx, [{ userId: mentor.id, actor: mentee.name, key: "bookingRequested", params: { at: startsAt.toISOString(), tz: mentor.timeZone, topic: input.topic }, href: "/mentorat/demandes", icon: "clock", tone: "brand" }]);
      return { id: b.id };
    });
  } catch (e) {
    // The partial unique index: someone booked this slot a moment earlier.
    if ((e as { code?: string }).code === "P2002") throw new DomainError("slot_taken", "Ce créneau vient d’être réservé. Choisis-en un autre.", 409, "startsAt");
    throw e;
  }
}

const personSelect = { id: true, name: true, city: true, headline: true, gender: true } as const;
const bookingInclude = { mentor: { select: personSelect }, mentee: { select: personSelect } } as const;
type BookingRow = Prisma.MentoringBookingGetPayload<{ include: typeof bookingInclude }>;

function toView(b: BookingRow, viewerId: string): BookingView {
  return {
    id: b.id,
    startsAt: b.startsAt.toISOString(),
    minutes: b.minutes,
    topic: b.topic,
    problem: b.problem,
    link: b.link,
    status: b.status,
    // The video link is shared only once the session is accepted.
    meetingUrl: b.status === "ACCEPTED" ? b.meetingUrl : null,
    declineReason: b.declineReason,
    mentor: b.mentor,
    mentee: b.mentee,
    iAm: b.mentorId === viewerId ? "MENTOR" : "MENTEE",
    rating: b.rating,
    ratingComment: b.ratingComment,
    // The dev rates once, when the session they attended is over.
    canRate: b.menteeId === viewerId && b.status === "ACCEPTED" && b.ratedAt === null && sessionOver(b),
  };
}

const sessionOver = (b: { startsAt: Date; minutes: number }) => b.startsAt.getTime() + b.minutes * 60_000 <= Date.now();

/** After the session, the dev rates it from 1 to 5, once, with an optional word. The mentor is told and reads both. */
export async function rateSession(menteeId: string, bookingId: string, input: { rating: number; comment?: string }, prisma: Db = db) {
  const b = await prisma.mentoringBooking.findUnique({ where: { id: bookingId }, include: { mentee: { select: { name: true } } } });
  if (!b || b.menteeId !== menteeId) throw notFound("Séance introuvable.");
  if (b.status !== "ACCEPTED") throw new DomainError("not_held", "Seule une séance confirmée peut être notée.", 409);
  if (!sessionOver(b)) throw new DomainError("not_over", "Tu pourras noter la séance une fois qu’elle sera terminée.", 409);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.mentoringBooking.updateMany({ where: { id: bookingId, ratedAt: null }, data: { rating: input.rating, ratingComment: input.comment || null, ratedAt: new Date() } });
    if (!count) throw new DomainError("rated", "Tu as déjà noté cette séance.", 409);
    await pushNotifications(tx, [{ userId: b.mentorId, actor: b.mentee.name, key: "sessionRated", params: { topic: b.topic, rating: input.rating }, href: `/mentorat/seances/${b.id}`, icon: "check", tone: "brand" }]);
    return { ok: true };
  });
}

/** The average of the marks a mentor received, shown on their sheet (M2); null while nobody has rated them. */
async function ratingOf(prisma: Tx, mentorId: string) {
  const r = await prisma.mentoringBooking.aggregate({ where: { mentorId, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } });
  return r._count.rating && r._avg.rating !== null ? { average: Math.round(r._avg.rating * 10) / 10, count: r._count.rating } : null;
}

export async function getBooking(userId: string, bookingId: string, prisma: Db = db): Promise<BookingView> {
  const b = await prisma.mentoringBooking.findUnique({ where: { id: bookingId }, include: bookingInclude });
  if (!b || (b.mentorId !== userId && b.menteeId !== userId)) throw notFound("Séance introuvable.");
  return toView(b, userId);
}

/** Every session of a member, as a mentee or as a mentor, the most recent first (history screen). */
export async function sessionHistory(userId: string, prisma: Db = db): Promise<BookingView[]> {
  const rows = await prisma.mentoringBooking.findMany({ where: { OR: [{ mentorId: userId }, { menteeId: userId }] }, include: bookingInclude, orderBy: { startsAt: "desc" }, take: 200 });
  return rows.map((b) => toView(b, userId));
}

/** The member's sessions: as a mentee, and as a mentor when they hold the badge. */
export async function myBookings(userId: string, prisma: Db = db) {
  const since = new Date(Date.now() - 60 * 86_400_000);
  const rows = await prisma.mentoringBooking.findMany({
    where: { OR: [{ mentorId: userId }, { menteeId: userId }], startsAt: { gte: since } },
    include: bookingInclude,
    orderBy: { startsAt: "asc" },
  });
  const now = Date.now();
  const views = rows.map((b) => toView(b, userId));
  const upcoming = (v: BookingView) => new Date(v.startsAt).getTime() + v.minutes * 60_000 > now;
  return {
    asMentee: views.filter((v) => v.iAm === "MENTEE"),
    toAnswer: views.filter((v) => v.iAm === "MENTOR" && v.status === "PENDING"),
    upcoming: views.filter((v) => v.status === "ACCEPTED" && upcoming(v)),
    asMentorAccepted: views.filter((v) => v.iAm === "MENTOR" && v.status === "ACCEPTED"),
  };
}

export async function answerBooking(mentorId: string, bookingId: string, input: { accept: boolean; reason?: string }, prisma: Db = db) {
  const b = await prisma.mentoringBooking.findUnique({ where: { id: bookingId }, include: { mentor: { select: { name: true, meetingUrl: true } }, mentee: { select: { timeZone: true } } } });
  if (!b || b.mentorId !== mentorId) throw notFound("Demande introuvable.");
  if (b.startsAt.getTime() <= Date.now()) throw new DomainError("answered", "Cette demande a expiré : la séance a déjà commencé.", 409);
  // Google Meet in V1: the session takes the mentor's own link, KABAD creates no room.
  if (input.accept && !b.mentor.meetingUrl) throw new DomainError("meet_required", "Ajoute ton lien Google Meet dans tes disponibilités avant d’accepter une séance.", 409);
  return prisma.$transaction(async (tx) => {
    if (input.accept) {
      // The mentor may have booked another session at that time as a dev, since the request came in.
      const busy = await assertFree(tx, { menteeId: b.menteeId, mentorId }, b.startsAt, b.id);
      if (busy.mentorBusy) throw new DomainError("clash_mentor", "Tu as déjà une séance à cette heure. Refuse cette demande ou annule l’autre séance.", 409);
      if (busy.menteeBusy) throw new DomainError("clash_mentee", "Ce membre a déjà une séance à cette heure. Refuse sa demande.", 409);
    }
    const meetingUrl = input.accept ? b.mentor.meetingUrl : null;
    const { count } = await tx.mentoringBooking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: input.accept ? { status: "ACCEPTED", meetingUrl, answeredAt: new Date() } : { status: "DECLINED", declineReason: input.reason || null, answeredAt: new Date() },
    });
    if (!count) throw new DomainError("answered", "Cette demande a déjà reçu une réponse ou a expiré.", 409);
    const when = { at: b.startsAt.toISOString(), tz: b.mentee.timeZone };
    await pushNotifications(tx, [
      input.accept
        ? { userId: b.menteeId, actor: b.mentor.name, key: "bookingAccepted", params: { ...when, link: meetingUrl ?? "" }, href: `/mentorat/seances/${b.id}`, icon: "check", tone: "success" }
        : { userId: b.menteeId, actor: b.mentor.name, key: input.reason ? "bookingDeclinedReason" : "bookingDeclined", params: { ...when, ...(input.reason ? { reason: input.reason } : {}) }, href: `/mentorat/seances/${b.id}`, icon: "clock", tone: "neutral" },
    ]);
    return { status: input.accept ? "ACCEPTED" : "DECLINED", meetingUrl };
  });
}

/** Either member cancels a session that has not started. */
export async function cancelBooking(userId: string, bookingId: string, prisma: Db = db) {
  const b = await prisma.mentoringBooking.findUnique({ where: { id: bookingId }, include: { mentor: { select: { name: true, timeZone: true } }, mentee: { select: { name: true, timeZone: true } } } });
  if (!b || (b.mentorId !== userId && b.menteeId !== userId)) throw notFound("Séance introuvable.");
  if (b.startsAt.getTime() <= Date.now()) throw new DomainError("started", "La séance a déjà commencé.", 409);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.mentoringBooking.updateMany({ where: { id: bookingId, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "CANCELLED", answeredAt: new Date() } });
    if (!count) throw new DomainError("closed", "Cette séance n’est plus active.", 409);
    const byMentor = userId === b.mentorId;
    const other = byMentor ? { id: b.menteeId, tz: b.mentee.timeZone } : { id: b.mentorId, tz: b.mentor.timeZone };
    await pushNotifications(tx, [{ userId: other.id, actor: byMentor ? b.mentor.name : b.mentee.name, key: "bookingCancelled", params: { at: b.startsAt.toISOString(), tz: other.tz }, href: `/mentorat/seances/${b.id}`, icon: "clock", tone: "neutral" }]);
    return { ok: true };
  });
}

/* Availability */

async function requireMentor(prisma: Tx, userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { seniorVerifiedAt: true } });
  if (!u?.seniorVerifiedAt) throw forbidden("Ouvre des créneaux une fois ton badge mentor accordé.");
}

export async function getAvailability(mentorId: string, prisma: Db = db): Promise<AvailabilityView> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: mentorId },
    select: { timeZone: true, meetingUrl: true, availability: { orderBy: [{ weekday: "asc" }, { startMin: "asc" }] }, blockedDates: { where: { day: { gte: new Date(new Date().toISOString().slice(0, 10)) } }, orderBy: { day: "asc" } } },
  });
  return {
    timeZone: u.timeZone,
    meetingUrl: u.meetingUrl,
    ranges: u.availability.map((a) => ({ weekday: a.weekday, startMin: a.startMin, endMin: a.endMin })),
    blocked: u.blockedDates.map((b) => ({ day: b.day.toISOString().slice(0, 10), reason: b.reason })),
  };
}

/** Replaces the weekly ranges and the days off. Sessions already booked stay as they are. */
export async function saveAvailability(
  mentorId: string,
  input: { timeZone: string; meetingUrl?: string; ranges: WeeklyRange[]; blocked: Array<{ day: string; reason?: string }> },
  prisma: Db = db,
) {
  await requireMentor(prisma, mentorId);
  const problem = rangesProblem(input.ranges);
  if (problem) throw new DomainError("bad_ranges", problem, 400, "ranges");
  try {
    new Intl.DateTimeFormat("fr", { timeZone: input.timeZone });
  } catch {
    throw new DomainError("bad_zone", "Fuseau horaire inconnu.", 400, "timeZone");
  }
  // No slot opens without a Google Meet link: every accepted session needs one.
  if (input.ranges.length > 0) {
    const link = input.meetingUrl ?? (await prisma.user.findUniqueOrThrow({ where: { id: mentorId }, select: { meetingUrl: true } })).meetingUrl;
    if (!link) throw new DomainError("meet_required", "Ajoute ton lien Google Meet avant d’ouvrir des créneaux.", 400, "meetingUrl");
  }
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { mentorId } }),
    prisma.availability.createMany({ data: input.ranges.map((r) => ({ mentorId, ...r })) }),
    prisma.blockedDate.deleteMany({ where: { mentorId } }),
    prisma.blockedDate.createMany({ data: input.blocked.map((b) => ({ mentorId, day: new Date(`${b.day}T00:00:00Z`), reason: b.reason || null })), skipDuplicates: true }),
    prisma.user.update({ where: { id: mentorId }, data: { timeZone: input.timeZone, ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}) } }),
  ]);
  return { ok: true };
}

/* Hackathon rules */

/** Mentors who held a session with a member: a juror never scores a solution of someone they mentored. */
export async function mentoredBy(userIds: string[], prisma: Tx = db): Promise<Map<string, Set<string>>> {
  const rows = await prisma.mentoringBooking.findMany({ where: { menteeId: { in: userIds }, status: "ACCEPTED" }, select: { menteeId: true, mentorId: true }, distinct: ["menteeId", "mentorId"] });
  const out = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!out.has(r.menteeId)) out.set(r.menteeId, new Set());
    out.get(r.menteeId)!.add(r.mentorId);
  }
  return out;
}

export { firstName };
