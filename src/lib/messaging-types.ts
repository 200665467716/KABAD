/* Shapes exchanged between the messaging API and the screens. */

export type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  system: boolean;
  createdAt: string;
  clientId: string | null;
};

export type ConversationSummary = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  otherId: string | null;
  memberCount: number;
  isOwner: boolean;
  unread: number;
  lastMessageAt: string;
  last: { body: string; authorId: string | null; authorName: string | null; system: boolean } | null;
};

export type ConversationDetail = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  other: { id: string; name: string; role: "JUNIOR" | "SENIOR"; city: string } | null;
  isOwner: boolean;
  members: Array<{ id: string; name: string; owner: boolean }>;
  lastReadAt: string;
  hasMore: boolean;
  messages: ChatMessage[];
};

export type InvitationFrom = { id: string; name: string; city: string; country: string; stack: string[]; years: number; role: "JUNIOR" | "SENIOR" };

export type ReceivedInvitation = { id: string; message: string; createdAt: string; from: InvitationFrom };

export type InvitationDetail = ReceivedInvitation & { status: "PENDING" | "ACCEPTED" | "DECLINED"; conversationId: string | null };

export type Contact = { id: string; name: string; city: string; role: "JUNIOR" | "SENIOR"; stack: string[] };

export type SentInvitation = { id: string; toId: string; message: string; createdAt: string; to: { name: string; city: string } };
