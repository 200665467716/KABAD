-- CreateEnum
CREATE TYPE "Level" AS ENUM ('ASPIRANT', 'DEBUTANT', 'INTERMEDIAIRE', 'SENIOR');

-- CreateEnum
CREATE TYPE "BadgeStatus" AS ENUM ('PENDING', 'APPROVED', 'REFUSED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PrizeKind" AS ENUM ('CAGNOTTE', 'SPONSORISE', 'LOT');

-- CreateEnum
CREATE TYPE "HackathonStatus" AS ENUM ('OPEN', 'JURY', 'DONE');

-- CreateEnum
CREATE TYPE "HackathonFormat" AS ENUM ('ONLINE', 'ONSITE', 'HYBRID');

-- CreateEnum
CREATE TYPE "TeamRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RiseDomain" AS ENUM ('WATER', 'HEALTH', 'AGRICULTURE', 'EDUCATION', 'ENERGY', 'FINANCE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageKind" ADD VALUE 'FILE';
ALTER TYPE "MessageKind" ADD VALUE 'VOICE';

-- AlterEnum
ALTER TYPE "Platform" ADD VALUE 'IOS';

-- DropForeignKey
ALTER TABLE "ChallengeJuror" DROP CONSTRAINT "ChallengeJuror_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "ChallengeJuror" DROP CONSTRAINT "ChallengeJuror_userId_fkey";

-- DropForeignKey
ALTER TABLE "Contribution" DROP CONSTRAINT "Contribution_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "MentorRequest" DROP CONSTRAINT "MentorRequest_menteeId_fkey";

-- DropForeignKey
ALTER TABLE "MentorRequest" DROP CONSTRAINT "MentorRequest_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "MentoringSession" DROP CONSTRAINT "MentoringSession_notedById_fkey";

-- DropForeignKey
ALTER TABLE "MentoringSession" DROP CONSTRAINT "MentoringSession_pairId_fkey";

-- DropForeignKey
ALTER TABLE "Pair" DROP CONSTRAINT "Pair_menteeId_fkey";

-- DropForeignKey
ALTER TABLE "Pair" DROP CONSTRAINT "Pair_mentorId_fkey";

-- DropForeignKey
ALTER TABLE "Payout" DROP CONSTRAINT "Payout_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_userId_fkey";

-- DropIndex
DROP INDEX "Contribution_challengeId_status_idx";

-- DropIndex
DROP INDEX "Payout_challengeId_role_key";

-- DropIndex
DROP INDEX "Submission_challengeId_userId_key";

-- Les défis deviennent des hackathons (décision de l'équipe du 31 octobre) : les solutions, notes, contributions
-- et versements rattachés aux anciens défis ne peuvent pas être repris. Rien n'est encore en production.
DELETE FROM "JuryScore";
DELETE FROM "Submission";
DELETE FROM "Contribution";
DELETE FROM "Payout";

-- AlterTable
ALTER TABLE "Contribution" DROP COLUMN "challengeId",
ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "theme" VARCHAR(30);

-- AlterTable
ALTER TABLE "EmailToken" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codeHash" TEXT;

-- AlterTable
ALTER TABLE "Payout" DROP COLUMN "challengeId",
ADD COLUMN     "hackathonId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "challengeId",
DROP COLUMN "userId",
ADD COLUMN     "hackathonId" TEXT NOT NULL,
ADD COLUMN     "projectName" VARCHAR(60) NOT NULL,
ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TestApp" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "platforms" "Platform"[];
-- Une app testée peut maintenant viser plusieurs plateformes : on reprend l'ancienne.
UPDATE "TestApp" SET "platforms" = ARRAY["platform"];
ALTER TABLE "TestApp" DROP COLUMN "platform";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "mentorCapacity",
DROP COLUMN "replyTime",
ADD COLUMN     "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "level" "Level" NOT NULL DEFAULT 'DEBUTANT',
ADD COLUMN     "locale" VARCHAR(5) NOT NULL DEFAULT 'fr',
ADD COLUMN     "meetingUrl" VARCHAR(200) NOT NULL DEFAULT '',
ADD COLUMN     "timeZone" VARCHAR(40) NOT NULL DEFAULT 'Africa/Lome';

-- DropTable
DROP TABLE "Challenge";

-- DropTable
DROP TABLE "ChallengeJuror";

-- DropTable
DROP TABLE "MentorRequest";

-- DropTable
DROP TABLE "MentoringSession";

-- DropTable
DROP TABLE "Pair";

-- DropEnum
DROP TYPE "ChallengeKind";

-- DropEnum
DROP TYPE "ChallengeStatus";

-- DropEnum
DROP TYPE "RequestStatus";

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "mime" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "seconds" INTEGER,
    "data" BYTEA NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorBadgeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domains" TEXT[],
    "technologies" TEXT[],
    "experience" VARCHAR(10) NOT NULL,
    "jobTitle" VARCHAR(80) NOT NULL,
    "company" VARCHAR(80),
    "githubUrl" VARCHAR(200),
    "linkedinUrl" VARCHAR(200),
    "portfolioUrl" VARCHAR(200),
    "bio" VARCHAR(280) NOT NULL,
    "topics" VARCHAR(300) NOT NULL,
    "status" "BadgeStatus" NOT NULL DEFAULT 'PENDING',
    "refusalReason" VARCHAR(500),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "MentorBadgeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "reason" VARCHAR(80),

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentoringBooking" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 30,
    "topic" VARCHAR(120) NOT NULL,
    "problem" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(200),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "meetingUrl" VARCHAR(200),
    "declineReason" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "MentoringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hackathon" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "organizerName" VARCHAR(80) NOT NULL,
    "createdById" TEXT,
    "format" "HackathonFormat" NOT NULL,
    "city" VARCHAR(60),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "teamMin" INTEGER NOT NULL DEFAULT 1,
    "teamMax" INTEGER NOT NULL DEFAULT 5,
    "level" VARCHAR(20) NOT NULL,
    "stack" VARCHAR(60) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "rulesUrl" VARCHAR(200),
    "status" "HackathonStatus" NOT NULL DEFAULT 'OPEN',
    "resultsAt" TIMESTAMP(3),
    "mentoringMinutes" INTEGER NOT NULL DEFAULT 0,
    "prizeKind" "PrizeKind",
    "prizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sponsorName" VARCHAR(120),
    "sponsorAmount" INTEGER NOT NULL DEFAULT 0,
    "missionText" VARCHAR(600),
    "instructorFee" INTEGER,
    "instructorCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hackathon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HackathonJuror" (
    "hackathonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "HackathonJuror_pkey" PRIMARY KEY ("hackathonId","userId")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "captainId" TEXT NOT NULL,
    "solo" BOOLEAN NOT NULL DEFAULT false,
    "lookingFor" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "skill" VARCHAR(30) NOT NULL DEFAULT '',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","userId")
);

-- CreateTable
CREATE TABLE "TeamJoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TeamRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "TeamJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorMission" (
    "id" TEXT NOT NULL,
    "hackathonId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "InstructorMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestParticipant" (
    "testAppId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "doneSteps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestParticipant_pkey" PRIMARY KEY ("testAppId","userId")
);

-- CreateTable
CREATE TABLE "RiseProject" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "domain" "RiseDomain" NOT NULL,
    "summary" VARCHAR(200) NOT NULL,
    "problem" VARCHAR(1500) NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "initiatorId" TEXT NOT NULL,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiseProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiseMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" VARCHAR(30) NOT NULL DEFAULT '',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiseMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "RisePost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT,
    "parentId" TEXT,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "RisePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiseEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" VARCHAR(100) NOT NULL,
    "agenda" VARCHAR(600) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "meetingUrl" VARCHAR(200) NOT NULL,
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_messageId_key" ON "Attachment"("messageId");

-- CreateIndex
CREATE INDEX "MentorBadgeRequest_status_createdAt_idx" ON "MentorBadgeRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MentorBadgeRequest_userId_createdAt_idx" ON "MentorBadgeRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Availability_mentorId_weekday_idx" ON "Availability"("mentorId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_mentorId_day_key" ON "BlockedDate"("mentorId", "day");

-- CreateIndex
CREATE INDEX "MentoringBooking_mentorId_startsAt_idx" ON "MentoringBooking"("mentorId", "startsAt");

-- CreateIndex
CREATE INDEX "MentoringBooking_menteeId_startsAt_idx" ON "MentoringBooking"("menteeId", "startsAt");

-- CreateIndex
CREATE INDEX "MentoringBooking_status_startsAt_idx" ON "MentoringBooking"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Hackathon_status_startsAt_idx" ON "Hackathon"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_hackathonId_name_key" ON "Team"("hackathonId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_hackathonId_userId_key" ON "TeamMember"("hackathonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamJoinRequest_teamId_userId_key" ON "TeamJoinRequest"("teamId", "userId");

-- CreateIndex
CREATE INDEX "InstructorMission_mentorId_status_idx" ON "InstructorMission"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorMission_hackathonId_mentorId_key" ON "InstructorMission"("hackathonId", "mentorId");

-- CreateIndex
CREATE INDEX "TestParticipant_userId_idx" ON "TestParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiseProject_conversationId_key" ON "RiseProject"("conversationId");

-- CreateIndex
CREATE INDEX "RiseProject_domain_createdAt_idx" ON "RiseProject"("domain", "createdAt");

-- CreateIndex
CREATE INDEX "RiseMember_userId_idx" ON "RiseMember"("userId");

-- CreateIndex
CREATE INDEX "RisePost_projectId_parentId_createdAt_idx" ON "RisePost"("projectId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "RiseEvent_projectId_startsAt_idx" ON "RiseEvent"("projectId", "startsAt");

-- CreateIndex
CREATE INDEX "RiseEvent_startsAt_idx" ON "RiseEvent"("startsAt");

-- CreateIndex
CREATE INDEX "Contribution_hackathonId_status_idx" ON "Contribution"("hackathonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_hackathonId_role_key" ON "Payout"("hackathonId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_teamId_key" ON "Submission"("teamId");

-- CreateIndex
CREATE INDEX "Submission_hackathonId_idx" ON "Submission"("hackathonId");

-- CreateIndex
CREATE UNIQUE INDEX "TestApp_conversationId_key" ON "TestApp"("conversationId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorBadgeRequest" ADD CONSTRAINT "MentorBadgeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorBadgeRequest" ADD CONSTRAINT "MentorBadgeRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringBooking" ADD CONSTRAINT "MentoringBooking_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringBooking" ADD CONSTRAINT "MentoringBooking_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hackathon" ADD CONSTRAINT "Hackathon_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonJuror" ADD CONSTRAINT "HackathonJuror_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HackathonJuror" ADD CONSTRAINT "HackathonJuror_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorMission" ADD CONSTRAINT "InstructorMission_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorMission" ADD CONSTRAINT "InstructorMission_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "Hackathon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestApp" ADD CONSTRAINT "TestApp_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestParticipant" ADD CONSTRAINT "TestParticipant_testAppId_fkey" FOREIGN KEY ("testAppId") REFERENCES "TestApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestParticipant" ADD CONSTRAINT "TestParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseProject" ADD CONSTRAINT "RiseProject_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseProject" ADD CONSTRAINT "RiseProject_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseMember" ADD CONSTRAINT "RiseMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RiseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseMember" ADD CONSTRAINT "RiseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RisePost" ADD CONSTRAINT "RisePost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RiseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RisePost" ADD CONSTRAINT "RisePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RisePost" ADD CONSTRAINT "RisePost_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RisePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseEvent" ADD CONSTRAINT "RiseEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "RiseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiseEvent" ADD CONSTRAINT "RiseEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Un créneau ne porte qu'une seule réservation en attente ou acceptée : deux membres ne peuvent pas
-- réserver la même demi-heure d'un mentor, même s'ils cliquent au même instant.
CREATE UNIQUE INDEX "MentoringBooking_one_active_per_slot" ON "MentoringBooking"("mentorId", "startsAt") WHERE "status" IN ('PENDING', 'ACCEPTED');
