-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CapsuleTheme" AS ENUM ('BACKEND', 'MOBILE', 'CAREER');

-- CreateEnum
CREATE TYPE "ChallengeKind" AS ENUM ('CAGNOTTE', 'SPONSORISE', 'LOT');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('OPEN', 'JURY', 'DONE');

-- CreateEnum
CREATE TYPE "ContributionStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutRole" AS ENUM ('WINNER', 'MENTOR', 'PLATFORM');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SENT');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WEB', 'ANDROID');

-- CreateEnum
CREATE TYPE "TestReportStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'REFUSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubId" INTEGER,
ADD COLUMN     "githubLogin" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seniorVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "mentorCapacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profileLink" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "replyTime" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MentorRequest" (
    "id" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "project" VARCHAR(120) NOT NULL,
    "situation" VARCHAR(1000) NOT NULL,
    "repo" VARCHAR(200),
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "MentorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pair" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "menteeId" TEXT NOT NULL,
    "project" VARCHAR(120) NOT NULL,
    "repo" VARCHAR(200),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nextSessionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentoringSession" (
    "id" TEXT NOT NULL,
    "pairId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "topic" VARCHAR(120) NOT NULL,
    "done" VARCHAR(1000) NOT NULL,
    "next" VARCHAR(500) NOT NULL,
    "notedById" TEXT NOT NULL,
    "confirmedByMentor" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByMentee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capsule" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "theme" "CapsuleTheme" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minutes" INTEGER NOT NULL,
    "body" VARCHAR(6000) NOT NULL,
    "code" VARCHAR(2000),
    "reads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Capsule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "kind" "ChallengeKind" NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "level" VARCHAR(20) NOT NULL,
    "stack" VARCHAR(60) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "resultsAt" TIMESTAMP(3),
    "requiresMentoring" BOOLEAN NOT NULL DEFAULT false,
    "prizeLabel" VARCHAR(120),
    "sponsorName" VARCHAR(120),
    "sponsorAmount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeJuror" (
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChallengeJuror_pkey" PRIMARY KEY ("challengeId","userId")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoUrl" VARCHAR(200) NOT NULL,
    "demoUrl" VARCHAR(200),
    "explanation" VARCHAR(800) NOT NULL,
    "payoutOperator" VARCHAR(30),
    "payoutPhone" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuryScore" (
    "submissionId" TEXT NOT NULL,
    "jurorId" TEXT NOT NULL,
    "works" INTEGER NOT NULL,
    "code" INTEGER NOT NULL,
    "tests" INTEGER NOT NULL,
    "explain" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuryScore_pkey" PRIMARY KEY ("submissionId","jurorId")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "company" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContributionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "role" "PayoutRole" NOT NULL,
    "beneficiaryId" TEXT,
    "amount" INTEGER NOT NULL,
    "operator" VARCHAR(30),
    "phone" VARCHAR(30),
    "reference" VARCHAR(60),
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestApp" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "platform" "Platform" NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "minutes" INTEGER NOT NULL,
    "slots" INTEGER NOT NULL,
    "pitch" VARCHAR(500) NOT NULL,
    "task" VARCHAR(200) NOT NULL,
    "steps" TEXT[],
    "questions" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestReport" (
    "id" TEXT NOT NULL,
    "testAppId" TEXT NOT NULL,
    "testerId" TEXT NOT NULL,
    "device" VARCHAR(40) NOT NULL,
    "answers" JSONB NOT NULL,
    "remarks" VARCHAR(2000) NOT NULL,
    "status" "TestReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "refusalReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "TestReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screenshot" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "Screenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actor" VARCHAR(120) NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "href" VARCHAR(200) NOT NULL,
    "icon" VARCHAR(20) NOT NULL,
    "tone" VARCHAR(20) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "MentorRequest_mentorId_status_idx" ON "MentorRequest"("mentorId", "status");

-- CreateIndex
CREATE INDEX "MentorRequest_menteeId_status_idx" ON "MentorRequest"("menteeId", "status");

-- CreateIndex
CREATE INDEX "Pair_menteeId_idx" ON "Pair"("menteeId");

-- CreateIndex
CREATE UNIQUE INDEX "Pair_mentorId_menteeId_key" ON "Pair"("mentorId", "menteeId");

-- CreateIndex
CREATE INDEX "MentoringSession_pairId_startsAt_idx" ON "MentoringSession"("pairId", "startsAt");

-- CreateIndex
CREATE INDEX "Capsule_theme_createdAt_idx" ON "Capsule"("theme", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_challengeId_userId_key" ON "Submission"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "Contribution_challengeId_status_idx" ON "Contribution"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_challengeId_role_key" ON "Payout"("challengeId", "role");

-- CreateIndex
CREATE INDEX "TestApp_active_createdAt_idx" ON "TestApp"("active", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestReport_testAppId_testerId_key" ON "TestReport"("testAppId", "testerId");

-- CreateIndex
CREATE UNIQUE INDEX "Screenshot_reportId_position_key" ON "Screenshot"("reportId", "position");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- AddForeignKey
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pair" ADD CONSTRAINT "Pair_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pair" ADD CONSTRAINT "Pair_menteeId_fkey" FOREIGN KEY ("menteeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringSession" ADD CONSTRAINT "MentoringSession_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "Pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentoringSession" ADD CONSTRAINT "MentoringSession_notedById_fkey" FOREIGN KEY ("notedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capsule" ADD CONSTRAINT "Capsule_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeJuror" ADD CONSTRAINT "ChallengeJuror_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeJuror" ADD CONSTRAINT "ChallengeJuror_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryScore" ADD CONSTRAINT "JuryScore_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuryScore" ADD CONSTRAINT "JuryScore_jurorId_fkey" FOREIGN KEY ("jurorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestApp" ADD CONSTRAINT "TestApp_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_testAppId_fkey" FOREIGN KEY ("testAppId") REFERENCES "TestApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestReport" ADD CONSTRAINT "TestReport_testerId_fkey" FOREIGN KEY ("testerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screenshot" ADD CONSTRAINT "Screenshot_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TestReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
