/**
 * Mentoring by time slots: free sessions of 30 minutes, booked on a mentor's open slots.
 * Hackathons and mentoring are independent (point projet, 7 November 2026).
 */
import { randomBytes } from "node:crypto";

export const SESSION_MINUTES = 30;
/** A member waits for answers on 3 requests at most, so mentors are not flooded. */
export const MAX_PENDING_BOOKINGS = 3;

/** A private Jitsi room for one session, when the mentor has not given their own video link. */
export function jitsiRoom(prefix = "kabad"): string {
  return `https://meet.jit.si/${prefix}-${randomBytes(9).toString("base64url")}`;
}
