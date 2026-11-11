import type { Prisma } from "@/generated/prisma/client";

/*
 * Events for the realtime service. They are sent with pg_notify inside the write transaction,
 * so PostgreSQL delivers them only if the transaction commits. Payloads stay small (ids only);
 * the realtime service reads the message itself before pushing it to the members.
 */
export const REALTIME_CHANNEL = "kabad_realtime";

export type RealtimeEvent =
  | { t: "message"; conversationId: string; messageId: string; recipients: string[] }
  | { t: "conversation"; conversationId: string; recipients: string[] }
  | { t: "invitation"; invitationId: string; recipients: string[] }
  | { t: "invitation_answered"; invitationId: string; accepted: boolean; conversationId?: string; recipients: string[] }
  | { t: "read"; conversationId: string; recipients: string[] }
  | { t: "notification"; recipients: string[] }
  | { t: "room"; roomId: string; recipients: string[] }
  /** Closes the member's open sockets: sign-out everywhere, suspension. */
  | { t: "revoke"; recipients: string[] };

/**
 * PostgreSQL refuses a NOTIFY payload of 8 000 bytes or more. A member id takes about 30 bytes once
 * quoted, so a big group is told in several events of at most 150 recipients each (about 4 500 bytes).
 */
export const NOTIFY_BATCH = 150;

export async function notify(tx: Prisma.TransactionClient, event: RealtimeEvent) {
  for (let i = 0; i < event.recipients.length; i += NOTIFY_BATCH) {
    const part = { ...event, recipients: event.recipients.slice(i, i + NOTIFY_BATCH) };
    await tx.$executeRaw`SELECT pg_notify(${REALTIME_CHANNEL}, ${JSON.stringify(part)})`;
  }
}
