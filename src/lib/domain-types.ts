/* Shapes exchanged between the server and the screens. Dates are ISO strings. */
import type { WeeklyRange } from "./slots";
import type { Eligibility } from "./mentoring";

export type { Eligibility };

export type Level = "ASPIRANT" | "DEBUTANT" | "INTERMEDIAIRE" | "SENIOR";

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
  level: Level;
  /** Holds the mentor badge granted by the KABAD team. */
  verified: boolean;
};

export type Recommendation = MemberCard & { why: string };

/** A member in the directory, with where the viewer stands with them. */
export type DirectoryEntry = MemberCard & { relation: "contact" | "invited" | "invited_you" | "none"; conversationId: string | null; invitationId: string | null };

export type MentorStats = { sessions: number; hours: number; judged: number };

export type Profile = MemberCard & {
  stats: MentorStats | null;
  isContact: boolean;
  invited: boolean;
  /** The direct conversation with the viewer, once they are contacts. */
  conversationId: string | null;
  blockedByMe: boolean;
  testsValidated: number;
};

/* Mentoring by time slots */

export type MentorCard = {
  id: string;
  name: string;
  city: string;
  country: string;
  headline: string;
  domains: string[];
  technologies: string[];
  /** Next free slot, or null when the mentor has none in the coming weeks. */
  nextSlot: string | null;
  sessionsHeld: number;
};

export type MentorDetail = MentorCard & { bio: string; topics: string; timeZone: string; slots: string[] };

export type BookingStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

export type BookingPerson = { id: string; name: string; city: string; headline: string };

export type BookingView = {
  id: string;
  startsAt: string;
  minutes: number;
  topic: string;
  problem: string;
  link: string | null;
  status: BookingStatus;
  meetingUrl: string | null;
  declineReason: string | null;
  mentor: BookingPerson;
  mentee: BookingPerson;
  iAm: "MENTOR" | "MENTEE";
};

export type AvailabilityView = { timeZone: string; meetingUrl: string; ranges: WeeklyRange[]; blocked: Array<{ day: string; reason: string | null }> };

/* Mentor badge */

export type BadgeStatus = "PENDING" | "APPROVED" | "REFUSED";

export type BadgeRequestView = {
  id: string;
  status: BadgeStatus;
  domains: string[];
  technologies: string[];
  experience: string;
  jobTitle: string;
  company: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  bio: string;
  topics: string;
  refusalReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  candidate: { id: string; name: string; city: string; country: string };
};

/* Hackathons */

export type HackathonFormat = "ONLINE" | "ONSITE" | "HYBRID";
export type PrizeKind = "CAGNOTTE" | "SPONSORISE" | "LOT";

export type HackathonSummary = {
  id: string;
  title: string;
  organizerName: string;
  format: HackathonFormat;
  city: string | null;
  startsAt: string;
  endsAt: string;
  closesAt: string;
  teamMin: number;
  teamMax: number;
  status: "OPEN" | "JURY" | "DONE";
  level: string;
  stack: string;
  prizeKind: PrizeKind | null;
  prizes: string[];
  sponsorName: string | null;
  mentoringMinutes: number;
  instructors: number;
  /** Instructors the organizer wants to recruit. */
  instructorCount: number;
  /** False while the KABAD team has not published it: only its author and the team see it. */
  published: boolean;
  pot: number;
  teams: number;
  participants: number;
  contributors: number;
  companies: number;
  resultsAt: string | null;
  winner: { team: string; captain: string } | null;
};

export type TeamPerson = { id: string; name: string; city: string; skill: string };

export type TeamView = {
  id: string;
  name: string;
  solo: boolean;
  lookingFor: string | null;
  captainId: string;
  members: TeamPerson[];
  requests: Array<{ id: string; user: { id: string; name: string; city: string }; createdAt: string }>;
  submission: { projectName: string; repoUrl: string; demoUrl: string | null; explanation: string; payoutOperator: string | null; payoutPhone: string | null; updatedAt: string } | null;
};

export type OpenTeam = { id: string; name: string; lookingFor: string | null; members: number; requested: boolean };

export type HackathonDetail = HackathonSummary & {
  description: string;
  rulesUrl: string | null;
  missionText: string | null;
  instructorFee: number | null;
  jury: Array<{ id: string; name: string }>;
  instructorsList: Array<{ id: string; name: string }>;
  amJuror: boolean;
  myTeam: TeamView | null;
  openTeams: OpenTeam[];
  published: boolean;
  canEdit: boolean;
};

export type MissionView = {
  id: string;
  fee: number;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  hackathon: { id: string; title: string; organizerName: string; format: HackathonFormat; city: string | null; startsAt: string; endsAt: string; missionText: string | null };
};

export type RankingRow = { teamId: string; team: string; captainId: string; captain: string; mark: number };

export type PayoutView = { role: "WINNER" | "MENTOR" | "PLATFORM"; amount: number; beneficiary: string | null; operator: string | null; phone: string | null; reference: string | null; status: "PENDING" | "SENT"; sentAt: string | null };

export type HackathonResults = HackathonSummary & { ranking: RankingRow[]; payouts: PayoutView[]; publishedAt: string | null };

export type JuryItem = {
  hackathonTitle: string;
  total: number;
  scored: number;
  submission: { id: string; index: number; projectName: string; repoUrl: string; demoUrl: string | null; explanation: string } | null;
};

export type ContributionView = { name: string; amount: number; createdAt: string };

/* Africa Rise-Up */

export type RiseDomain = "WATER" | "HEALTH" | "AGRICULTURE" | "EDUCATION" | "ENERGY" | "FINANCE" | "OTHER";

export type RiseEventView = { id: string; title: string; agenda: string; startsAt: string; minutes: number; meetingUrl: string; live: boolean; projectId: string; projectName: string };

export type RiseProjectSummary = {
  id: string;
  name: string;
  domain: RiseDomain;
  summary: string;
  skills: string[];
  members: number;
  countries: number;
  avatars: Array<{ id: string; name: string }>;
  /** The event running now or the next one. */
  event: RiseEventView | null;
  isMember: boolean;
};

export type RisePostView = { id: string; body: string; createdAt: string; author: { id: string; name: string } | null; replies: number };

export type RiseProjectDetail = RiseProjectSummary & {
  problem: string;
  initiator: { id: string; name: string };
  conversationId: string | null;
  posts: RisePostView[];
  events: RiseEventView[];
  people: Array<{ id: string; name: string; city: string; skill: string; initiator: boolean }>;
};

export type TestQuestion = { q: string; options?: string[]; answer: string };

export type TestAppSummary = {
  id: string;
  name: string;
  platforms: Array<"WEB" | "ANDROID" | "IOS">;
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
  testers: number;
  /** The viewer joined the testers' group. */
  joined: boolean;
  stepsCount: number;
  myDoneSteps: number[];
};

export type TestAppDetail = TestAppSummary & {
  steps: string[];
  questions: Array<Omit<TestQuestion, "answer">>;
  conversationId: string | null;
  testerAvatars: Array<{ id: string; name: string }>;
};

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
