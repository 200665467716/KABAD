/* Shapes exchanged between the server and the screens. Dates are ISO strings. */
import type { WeeklyRange } from "./slots";


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
  /** Address of the profile photo, or null: the screens then show the initials. */
  photo: string | null;
};

/** Pourquoi le membre est suggéré : une clé de auth.suggestions.why, avec les technologies communes s’il y en a. */
export type Recommendation = MemberCard & { why: { key: "mentorIn" | "shared" | "sameCity" | "sameCountry" | "mentorAvailable" | "active"; tech?: string } };

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

export type MentorDetail = MentorCard & {
  bio: string;
  topics: string;
  timeZone: string;
  gender: "FEMALE" | "MALE" | null;
  /** From the badge the KABAD team granted: the job, the experience and the links to the mentor's work. */
  jobTitle: string;
  company: string | null;
  experience: string;
  links: { github: string | null; linkedin: string | null; portfolio: string | null };
  /** Average of the marks given by the devs after their sessions; null while nobody has rated. */
  rating: { average: number; count: number } | null;
  /** Free slots of the next 30 days. */
  slots: string[];
  /** Slots already booked by someone: shown crossed out, not selectable. */
  takenSlots: string[];
};

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
  /** The mark the dev gave after the session (1 to 5) and their word for the mentor; null while not rated. */
  rating: number | null;
  ratingComment: string | null;
  /** True for the dev, once the confirmed session is over and not rated yet. */
  canRate: boolean;
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
  /** 0 to 5 prizes in free text, in the order of the ranking. */
  prizes: string[];
  instructors: number;
  /** Instructors the organizer wants to recruit. */
  instructorCount: number;
  /** False while the KABAD team has not published it: only its author and the team see it. */
  published: boolean;
  teams: number;
  participants: number;
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
  /** Members the captain invited, who have not answered yet. Seen by the captain only. */
  invites: Array<{ id: string; user: { id: string; name: string; city: string }; createdAt: string }>;
  /** The team's discussion in the messaging; null for a solo entry or a team created before discussions existed. */
  conversationId: string | null;
  submission: { projectName: string; repoUrl: string; demoUrl: string | null; explanation: string; updatedAt: string } | null;
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
  /** Teams whose captain invited the viewer, who has not answered yet. */
  invitations: Array<{ id: string; team: string; captain: string; members: number }>;
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
/** A row of the published ranking, with the prize the team won, if any. */
export type ResultRow = RankingRow & { prize: string | null };

export type HackathonResults = HackathonSummary & { ranking: ResultRow[]; publishedAt: string | null };

export type JuryItem = {
  hackathonTitle: string;
  total: number;
  scored: number;
  submission: { id: string; index: number; projectName: string; repoUrl: string; demoUrl: string | null; explanation: string } | null;
};

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
  createdAt: string;
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
