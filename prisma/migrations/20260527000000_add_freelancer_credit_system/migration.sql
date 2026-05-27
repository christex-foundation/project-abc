-- CreateEnum
CREATE TYPE "CreditTxnReason" AS ENUM ('MONTHLY_RESET', 'SUBMISSION_SPEND', 'WIN_BONUS', 'SPAM_PENALTY', 'ADMIN_GRANT', 'ADMIN_REVOKE');

-- AlterTable: FreelancerProfile cache columns
ALTER TABLE "FreelancerProfile"
  ADD COLUMN "creditsBalance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "creditsPeriodKey" TEXT;

-- AlterTable: Bounty exemption flag
ALTER TABLE "Bounty"
  ADD COLUMN "creditsExempt" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "freelancerProfileId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" "CreditTxnReason" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "submissionId" TEXT,
    "bountyId" TEXT,
    "adminUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_freelancerProfileId_createdAt_idx" ON "CreditTransaction"("freelancerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_submissionId_idx" ON "CreditTransaction"("submissionId");

-- CreateIndex
CREATE INDEX "CreditTransaction_reason_periodKey_idx" ON "CreditTransaction"("reason", "periodKey");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique indexes: idempotency keys for credit transactions.
-- (Prisma does not yet support partial unique indexes declaratively.)
CREATE UNIQUE INDEX "CreditTransaction_submission_spend_unique"
  ON "CreditTransaction"("submissionId")
  WHERE "reason" = 'SUBMISSION_SPEND';

CREATE UNIQUE INDEX "CreditTransaction_submission_win_unique"
  ON "CreditTransaction"("submissionId")
  WHERE "reason" = 'WIN_BONUS';

CREATE UNIQUE INDEX "CreditTransaction_submission_spam_unique"
  ON "CreditTransaction"("submissionId")
  WHERE "reason" = 'SPAM_PENALTY';

CREATE UNIQUE INDEX "CreditTransaction_reset_period_unique"
  ON "CreditTransaction"("freelancerProfileId", "periodKey")
  WHERE "reason" = 'MONTHLY_RESET';
