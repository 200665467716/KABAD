/* Shapes exchanged between the server and the screens for mentoring, challenges and tests. Dates are ISO strings. */

export type MemberCard = {
  id: string;
  name: string;
  role: "JUNIOR" | "SENIOR";
  city: string;
  country: string;
  diaspora: boolean;
  years: number;
  headline: string;
  bio: string;
  stack: string[];
  /** A senior whose status a KABAD admin has checked. */
  verified: boolean;
};

export type Recommendation = MemberCard & { why: string };

/** A member in the directory, with where the viewer stands with them. */
export type DirectoryEntry = MemberCard & { relation: "contact" | "invited" | "invited_you" | "none"; conversationId: string | null; invitationId: string | null };

export type MentorStats = { pairs: number; hours: number; judged: number };

export type Mentor = MemberCard & { stats: MentorStats; openSlots: number; replyTime: string };

export type Profile = MemberCard & {
  stats: MentorStats | null;
  openSlots: number | null;
  replyTime: string;
  isContact: boolean;
  invited: boolean;
  /** The direct conversation with the viewer, once they are contacts. */
  conversationId: string | null;
  blockedByMe: boolean;
  testsValidated: number;
};

export type SessionView = {
  id: string;
  pairId: string;
  startsAt: string;
  minutes: number;
  topic: string;
  done: string;
  next: string;
  notedBy: { id: string; name: string };
  confirmedByMentor: boolean;
  confirmedByMentee: boolean;
};

export type PairView = {
  id: string;
  project: string;
  repo: string | null;
  since: string;
  nextSessionAt: string | null;
  mentor: { id: string; name: string };
  mentee: { id: string; name: string };
  iAm: "MENTOR" | "MENTEE";
  sessions: SessionView[];
  confirmedMinutes: number;
  visioUrl: string;
};

export type Eligibility = { eligible: boolean; confirmed: number; missing: number; progress: number; mentors: string[] };

export type MentorRequestView = {
  id: string;
  project: string;
  situation: string;
  repo: string | null;
  topics: string[];
  createdAt: string;
  mentee: { id: string; name: string; city: string };
  mentor: { id: string; name: string };
};

export type CapsuleView = {
  id: string;
  title: string;
  theme: "BACKEND" | "MOBILE" | "CAREER";
  tags: string[];
  minutes: number;
  body: string;
  code: string | null;
  reads: number;
  createdAt: string;
  author: { id: string; name: string };
};

export type ChallengeSummary = {
  id: string;
  title: string;
  kind: "CAGNOTTE" | "SPONSORISE" | "LOT";
  status: "OPEN" | "JURY" | "DONE";
  level: string;
  stack: string;
  closesAt: string;
  resultsAt: string | null;
  requiresMentoring: boolean;
  prizeLabel: string | null;
  sponsorName: string | null;
  pot: number;
  participants: number;
  contributors: number;
  companies: number;
  winner: { name: string; city: string } | null;
};

export type ChallengeDetail = ChallengeSummary & {
  description: string;
  jury: Array<{ id: string; name: string }>;
  mySubmission: { repoUrl: string; demoUrl: string | null; explanation: string; payoutOperator: string | null; payoutPhone: string | null } | null;
  amJuror: boolean;
};

export type RankingRow = { userId: string; name: string; city: string; mark: number };

export type PayoutView = { role: "WINNER" | "MENTOR" | "PLATFORM"; amount: number; beneficiary: string | null; operator: string | null; phone: string | null; reference: string | null; status: "PENDING" | "SENT"; sentAt: string | null };

export type ChallengeResults = ChallengeSummary & { ranking: RankingRow[]; payouts: PayoutView[]; publishedAt: string | null };

export type JuryItem = {
  challengeTitle: string;
  total: number;
  scored: number;
  submission: { id: string; index: number; repoUrl: string; demoUrl: string | null; explanation: string } | null;
};

export type ContributionView = { name: string; amount: number; createdAt: string };

export type TestQuestion = { q: string; options?: string[]; answer: string };

export type TestAppSummary = {
  id: string;
  name: string;
  platform: "WEB" | "ANDROID";
  url: string;
  minutes: number;
  slots: number;
  slotsLeft: number;
  pitch: string;
  task: string;
  owner: { id: string; name: string; city: string };
  reportsCount: number;
  toRead: number;
  myReport: "SUBMITTED" | "VALIDATED" | "REFUSED" | null;
};

export type TestAppDetail = TestAppSummary & { steps: string[]; questions: Array<Omit<TestQuestion, "answer">> };

export type TestReportView = {
  id: string;
  tester: { id: string; name: string };
  device: string;
  createdAt: string;
  answers: Array<{ question: string; answer: string; correct: boolean }>;
  remarks: string;
  status: "SUBMITTED" | "VALIDATED" | "REFUSED";
  refusalReason: string | null;
  screenshots: number;
};

export type RoomSummary = {
  id: string;
  title: string;
  description: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  startsAt: string;
  host: { id: string; name: string };
  listeners: number;
  speakers: string[];
  interested: number;
  remindMe: boolean;
};

export type RoomPerson = { id: string; name: string; role: "HOST" | "SPEAKER" | "LISTENER"; handRaised: boolean };

export type RoomDetail = RoomSummary & {
  me: { role: "HOST" | "SPEAKER" | "LISTENER" | null; inRoom: boolean; removed: boolean; handRaised: boolean };
  stage: RoomPerson[];
  audience: RoomPerson[];
};
