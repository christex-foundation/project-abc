-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'OPEN', 'AWARDED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'WITHDRAWN', 'AWARDED', 'REJECTED');

-- NOTE: enum value additions (CreditTxnReason.PROPOSAL_SPEND, PaymentType.MILESTONE_PAYOUT)
-- live in the preceding 20260529112455_add_project_enum_values migration so they
-- are committed before being referenced below.

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bountyId_fkey";

-- AlterTable
ALTER TABLE "CreditTransaction" ADD COLUMN     "proposalId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "bountyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT,
    "companyNameSnapshot" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "deliverables" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "budgetCap" INTEGER NOT NULL,
    "awardedProposalId" TEXT,
    "contractorProfileId" TEXT,
    "contractorNameSnapshot" TEXT,
    "escrowFinancialAccountId" TEXT,
    "escrowFundedAmount" INTEGER NOT NULL DEFAULT 0,
    "checkoutSessionId" TEXT,
    "checkoutSessionUrl" TEXT,
    "aiEmbedding" DOUBLE PRECISION[],
    "creditsExempt" BOOLEAN NOT NULL DEFAULT false,
    "timeToComplete" TEXT,
    "publishedAt" TIMESTAMP(3),
    "awardedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSkill" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerProfileId" TEXT,
    "freelancerNameSnapshot" TEXT,
    "coverLetter" TEXT NOT NULL,
    "proposedTotal" INTEGER NOT NULL,
    "proposedTimeline" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalMilestone" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "dueInDays" INTEGER,

    CONSTRAINT "ProposalMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceProposalMilestoneId" TEXT,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "dueInDays" INTEGER,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneUpdate" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorNameSnapshot" TEXT,
    "note" TEXT NOT NULL,
    "deliverables" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneComment" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" "UserRole" NOT NULL,
    "authorNameSnapshot" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_awardedProposalId_key" ON "Project"("awardedProposalId");

-- CreateIndex
CREATE INDEX "Project_companyProfileId_idx" ON "Project"("companyProfileId");

-- CreateIndex
CREATE INDEX "Project_contractorProfileId_idx" ON "Project"("contractorProfileId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "ProjectSkill_projectId_idx" ON "ProjectSkill"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSkill_skillId_idx" ON "ProjectSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSkill_projectId_skillId_key" ON "ProjectSkill"("projectId", "skillId");

-- CreateIndex
CREATE INDEX "ProjectProposal_projectId_idx" ON "ProjectProposal"("projectId");

-- CreateIndex
CREATE INDEX "ProjectProposal_freelancerProfileId_idx" ON "ProjectProposal"("freelancerProfileId");

-- CreateIndex
CREATE INDEX "ProjectProposal_status_idx" ON "ProjectProposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProposal_projectId_freelancerProfileId_key" ON "ProjectProposal"("projectId", "freelancerProfileId");

-- CreateIndex
CREATE INDEX "ProposalMilestone_proposalId_idx" ON "ProposalMilestone"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ProposalMilestone_proposalId_position_key" ON "ProposalMilestone"("proposalId", "position");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_position_key" ON "Milestone"("projectId", "position");

-- CreateIndex
CREATE INDEX "MilestoneUpdate_milestoneId_idx" ON "MilestoneUpdate"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneComment_milestoneId_idx" ON "MilestoneComment"("milestoneId");

-- CreateIndex
CREATE INDEX "CreditTransaction_proposalId_idx" ON "CreditTransaction"("proposalId");

-- CreateIndex
CREATE INDEX "Payment_projectId_idx" ON "Payment"("projectId");

-- CreateIndex
CREATE INDEX "Payment_milestoneId_idx" ON "Payment"("milestoneId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractorProfileId_fkey" FOREIGN KEY ("contractorProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSkill" ADD CONSTRAINT "ProjectSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposal" ADD CONSTRAINT "ProjectProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposal" ADD CONSTRAINT "ProjectProposal_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalMilestone" ADD CONSTRAINT "ProposalMilestone_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProjectProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneUpdate" ADD CONSTRAINT "MilestoneUpdate_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneUpdate" ADD CONSTRAINT "MilestoneUpdate_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneComment" ADD CONSTRAINT "MilestoneComment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneComment" ADD CONSTRAINT "MilestoneComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProjectProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: idempotency key for proposal credit spend (one per proposal).
-- (Prisma does not yet support partial unique indexes declaratively.)
CREATE UNIQUE INDEX "CreditTransaction_proposal_spend_unique"
  ON "CreditTransaction"("proposalId")
  WHERE "reason" = 'PROPOSAL_SPEND';

-- Polymorphic ownership invariant: a Payment belongs to exactly one of a bounty
-- or a project (never both, never neither). submissionId / milestoneId are the
-- finer-grained owners within each domain.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_owner_exactly_one"
  CHECK (num_nonnulls("bountyId", "projectId") = 1);
