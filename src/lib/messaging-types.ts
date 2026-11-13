/* Shapes exchanged between the messaging API and the screens. */

export type ChatMessage = {
  id: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  system: boolean;
  createdAt: string;
  clientId: string | null;
  /** Removed by the moderation team: the body is a notice, not the original text. */
  hidden?: boolean;
  /** A file or a voice note; the body is then an optional caption. */
  attachment?: ChatAttachment | null;
  /** The message this one answers, quoted above it (an excerpt). */
  replyTo?: ChatQuote | null;
  /** Pinned by the group's owner. */
  pinned?: boolean;
};

export type ChatQuote = { id: string; authorId: string | null; authorName: string | null; body: string; kind: "TEXT" | "FILE" | "VOICE"; hidden: boolean };

export type ChatAttachment = { id: string; kind: "FILE" | "VOICE"; name: string; mime: string; size: number; seconds: number | null };

export type ConversationSummary = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  /** Group theme: Fintech, Rise-Up, Test… */
  theme: string | null;
  /** Address of the group's photo, or null: the screens then show its initials. */
  photo: string | null;
  otherId: string | null;
  memberCount: number;
  isOwner: boolean;
  unread: number;
  lastMessageAt: string;
  last: { body: string; authorId: string | null; authorName: string | null; system: boolean; attachment: "FILE" | "VOICE" | null } | null;
};

export type ConversationDetail = {
  /** Direct conversations only: a block in place stops new messages. */
  blocked: "by_me" | "by_them" | null;
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  theme: string | null;
  /** What the group is about, written by its owner. */
  description: string | null;
  photo: string | null;
  other: { id: string; name: string; role: "JUNIOR" | "SENIOR"; city: string; photo: string | null } | null;
  isOwner: boolean;
  /** A community group follows an app to test, a Rise-Up project or a hackathon team (id: the hackathon): one joins or leaves it from there. */
  linked: { kind: "test" | "rise" | "team" | "instructors"; id: string } | null;
  /** The testers' group of an app (T4): its tasks, the install link, and what this member ticked (null for the author). */
  test: { id: string; url: string; steps: string[]; platforms: Array<"WEB" | "ANDROID" | "IOS">; ownerId: string; doneSteps: number[] | null } | null;
  members: Array<{ id: string; name: string; owner: boolean; photo: string | null; mentor: boolean }>;
  lastReadAt: string;
  hasMore: boolean;
  messages: ChatMessage[];
  /** The pinned messages of a group, the last pinned first. */
  pinned: ChatMessage[];
};

export type InvitationFrom = {
  id: string;
  name: string;
  city: string;
  country: string;
  stack: string[];
  years: number;
  role: "JUNIOR" | "SENIOR";
  level: "ASPIRANT" | "DEBUTANT" | "INTERMEDIAIRE" | "SENIOR";
  headline: string;
  /** The sender's presentation, read before answering (P8). */
  bio: string;
  photo: string | null;
};

export type ReceivedInvitation = { id: string; message: string; createdAt: string; from: InvitationFrom };

export type InvitationDetail = ReceivedInvitation & { status: "PENDING" | "ACCEPTED" | "DECLINED"; conversationId: string | null };

export type Contact = { id: string; name: string; city: string; role: "JUNIOR" | "SENIOR"; stack: string[]; photo: string | null };

export type SentInvitation = { id: string; toId: string; message: string; createdAt: string; to: { name: string; city: string } };
