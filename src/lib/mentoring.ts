/**
 * Mentoring by time slots: free sessions of 30 minutes, booked on a mentor's open slots.
 * Hackathons and mentoring are independent (point projet, 7 November 2026).
 */
export const SESSION_MINUTES = 30;
/** A member waits for answers on 3 requests at most, so mentors are not flooded. */
export const MAX_PENDING_BOOKINGS = 3;

export type SessionBucket = "upcoming" | "past" | "closed";

/**
 * Where a session goes in the history: still to come (waiting or confirmed), held (confirmed and over),
 * or closed without taking place (declined, cancelled, or left unanswered until its time).
 */
export function sessionBucket(b: { status: string; startsAt: Date | string; minutes: number }, now: Date): SessionBucket {
  const over = new Date(b.startsAt).getTime() + b.minutes * 60_000 <= now.getTime();
  if (b.status === "ACCEPTED") return over ? "past" : "upcoming";
  if (b.status === "PENDING" && !over) return "upcoming";
  return "closed";
}

/*
 * Visio du mentorat : Google Meet en V1 (point projet). Le mentor colle son lien une fois, dans ses
 * disponibilités ; il sert à toutes ses séances. KABAD ne crée pas de salle.
 */
export const MEET_LINK_MESSAGE = "Colle un lien Google Meet, par exemple meet.google.com/abc-defg-hij.";

/** "meet.google.com/abc-defg-hij" → "https://meet.google.com/abc-defg-hij"; anything else is returned trimmed. */
export function normalizeMeetLink(raw: string): string {
  const link = raw.trim();
  return /^meet\.google\.com\//i.test(link) ? `https://${link}` : link;
}

export function isMeetLink(link: string): boolean {
  try {
    const u = new URL(link);
    return u.protocol === "https:" && u.hostname === "meet.google.com" && u.pathname.length > 1;
  } catch {
    return false;
  }
}
