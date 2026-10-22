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

export async function notify(tx: Prisma.TransactionClient, event: RealtimeEvent) {
  if (event.recipients.length === 0) return;
  await tx.$executeRaw`SELECT pg_notify(${REALTIME_CHANNEL}, ${JSON.stringify(event)})`;
}
