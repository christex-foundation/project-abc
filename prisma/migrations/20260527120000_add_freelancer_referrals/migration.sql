-- AlterEnum: new credit-transaction reasons for the referral system.
ALTER TYPE "CreditTxnReason" ADD VALUE 'REFERRAL_FIRST_SUBMISSION';
ALTER TYPE "CreditTxnReason" ADD VALUE 'REFERRAL_WIN_BONUS';
ALTER TYPE "CreditTxnReason" ADD VALUE 'REFERRAL_REVERSAL';

-- AlterTable: per-user referral code (nullable; lazily generated on first view).
ALTER TABLE "user"
  ADD COLUMN "referralCode" TEXT;

CREATE UNIQUE INDEX "user_referralCode_key" ON "user"("referralCode");

-- AlterTable: capture the referrer at signup-completion. Immutable thereafter.
ALTER TABLE "FreelancerProfile"
  ADD COLUMN "referrerProfileId" TEXT;

CREATE INDEX "FreelancerProfile_referrerProfileId_idx"
  ON "FreelancerProfile"("referrerProfileId");

ALTER TABLE "FreelancerProfile"
  ADD CONSTRAINT "FreelancerProfile_referrerProfileId_fkey"
  FOREIGN KEY ("referrerProfileId") REFERENCES "FreelancerProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ledger column tying referral rows to the referred freelancer.
ALTER TABLE "CreditTransaction"
  ADD COLUMN "referredProfileId" TEXT;

CREATE INDEX "CreditTransaction_referredProfileId_idx"
  ON "CreditTransaction"("referredProfileId");

ALTER TABLE "CreditTransaction"
  ADD CONSTRAINT "CreditTransaction_referredProfileId_fkey"
  FOREIGN KEY ("referredProfileId") REFERENCES "FreelancerProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique indexes for referral idempotency.
-- One first-submission grant per (referrer, referred) pair.
CREATE UNIQUE INDEX "CreditTransaction_referral_first_submission_unique"
  ON "CreditTransaction"("freelancerProfileId", "referredProfileId")
  WHERE "reason" = 'REFERRAL_FIRST_SUBMISSION';

-- One reversal per (referrer, referred) pair — mirrors the first-submission lock.
CREATE UNIQUE INDEX "CreditTransaction_referral_reversal_unique"
  ON "CreditTransaction"("freelancerProfileId", "referredProfileId")
  WHERE "reason" = 'REFERRAL_REVERSAL';

-- One win-bonus per (referrer, winning submission) — referee wins multiple bounties → multiple rows.
CREATE UNIQUE INDEX "CreditTransaction_referral_win_unique"
  ON "CreditTransaction"("freelancerProfileId", "submissionId")
  WHERE "reason" = 'REFERRAL_WIN_BONUS';
