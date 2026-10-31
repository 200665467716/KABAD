/**
 * Mentoring by time slots: free sessions of 30 minutes, booked on a mentor's open slots.
 * A session counts once it is accepted and over. Some hackathons require a minimum of mentoring time.
 */
import { randomBytes } from "node:crypto";

export const SESSION_MINUTES = 30;
/** A member waits for answers on 3 requests at most, so mentors are not flooded. */
export const MAX_PENDING_BOOKINGS = 3;

export type BookingTime = { status: string; startsAt: Date; minutes: number };

/** Minutes of mentoring actually held: accepted sessions that are over. */
export function heldMinutes(bookings: BookingTime[], now: Date): number {
  return bookings.filter((b) => b.status === "ACCEPTED" && b.startsAt.getTime() + b.minutes * 60_000 <= now.getTime()).reduce((sum, b) => sum + b.minutes, 0);
}

export type Eligibility = { eligible: boolean; held: number; required: number; missing: number; progress: number };

export function mentoringEligibility(held: number, required: number): Eligibility {
  const missing = Math.max(0, required - held);
  return { eligible: missing === 0, held, required, missing, progress: required === 0 ? 1 : Math.min(1, held / required) };
}

/** A private Jitsi room for one session, when the mentor has not given their own video link. */
export function jitsiRoom(prefix = "kabad"): string {
  return `https://meet.jit.si/${prefix}-${randomBytes(9).toString("base64url")}`;
}
