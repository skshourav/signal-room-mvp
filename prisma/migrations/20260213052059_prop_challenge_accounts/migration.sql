-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'PASSED');

-- CreateEnum
CREATE TYPE "ChallengePhase" AS ENUM ('PHASE1', 'PHASE2');

-- AlterTable
ALTER TABLE "ClientAccount" ADD COLUMN     "challengePhase" "ChallengePhase" NOT NULL DEFAULT 'PHASE1',
ADD COLUMN     "challengeStatus" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "maxLossPct" DOUBLE PRECISION,
ADD COLUMN     "passedAt" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "phase1TargetPct" DOUBLE PRECISION,
ADD COLUMN     "phase2StartedAt" TIMESTAMP(3),
ADD COLUMN     "phase2TargetPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeAccountId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeAccountId_fkey" FOREIGN KEY ("activeAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
