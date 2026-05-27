-- GDPR account-deletion support.
--
-- For relations whose owning user we want to be able to hard-delete, we drop
-- NOT NULL, add a snapshot column for residual attribution, and recreate the
-- FK with ON DELETE SET NULL so the dependent row survives.
--
-- Constraints that were already ON DELETE SET NULL in the database
-- (Setting.updatedById, CompanyInvite.acceptedUserId, CreditTransaction.adminUserId)
-- are unchanged at the SQL layer — the schema file just makes the action
-- explicit so it doesn't drift on the next `prisma migrate`.

-- ---------------------------------------------------------------------------
-- Bounty.companyProfileId: nullable + SET NULL + snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE "Bounty" DROP CONSTRAINT "Bounty_companyProfileId_fkey";

ALTER TABLE "Bounty"
  ALTER COLUMN "companyProfileId" DROP NOT NULL,
  ADD COLUMN "companyNameSnapshot" TEXT;

ALTER TABLE "Bounty"
  ADD CONSTRAINT "Bounty_companyProfileId_fkey"
  FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Submission.freelancerProfileId: nullable + SET NULL + snapshot
-- The composite unique (bountyId, freelancerProfileId) keeps working because
-- Postgres treats NULL as distinct in unique indexes by default — multiple
-- deleted-freelancer rows on the same bounty don't conflict.
-- ---------------------------------------------------------------------------
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_freelancerProfileId_fkey";

ALTER TABLE "Submission"
  ALTER COLUMN "freelancerProfileId" DROP NOT NULL,
  ADD COLUMN "freelancerNameSnapshot" TEXT;

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_freelancerProfileId_fkey"
  FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Dispute.raisedById: nullable + SET NULL + snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_raisedById_fkey";

ALTER TABLE "Dispute"
  ALTER COLUMN "raisedById" DROP NOT NULL,
  ADD COLUMN "raisedByEmailSnapshot" TEXT;

ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_raisedById_fkey"
  FOREIGN KEY ("raisedById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- CompanyInvite.invitedById: nullable + SET NULL
-- ---------------------------------------------------------------------------
ALTER TABLE "CompanyInvite" DROP CONSTRAINT "CompanyInvite_invitedById_fkey";

ALTER TABLE "CompanyInvite"
  ALTER COLUMN "invitedById" DROP NOT NULL;

ALTER TABLE "CompanyInvite"
  ADD CONSTRAINT "CompanyInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "user"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- AccountDeletionLog: append-only audit trail. No FK to user — it must
-- survive the user's deletion to retain the record of who was erased.
-- ---------------------------------------------------------------------------
CREATE TABLE "AccountDeletionLog" (
  "id"              TEXT NOT NULL,
  "deletedUserId"   TEXT NOT NULL,
  "deletedEmail"    TEXT NOT NULL,
  "deletedRole"     "UserRole" NOT NULL,
  "deletedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedByUserId" TEXT,
  "reason"          TEXT,
  CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionLog_deletedAt_idx"
  ON "AccountDeletionLog"("deletedAt");

CREATE INDEX "AccountDeletionLog_deletedByUserId_idx"
  ON "AccountDeletionLog"("deletedByUserId");
