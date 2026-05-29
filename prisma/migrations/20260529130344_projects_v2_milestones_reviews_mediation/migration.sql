/*
  Warnings:

  - You are about to drop the column `sourceProposalMilestoneId` on the `Milestone` table. All the data in the column will be lost.
  - You are about to drop the column `proposedTotal` on the `ProjectProposal` table. All the data in the column will be lost.
  - You are about to drop the `ProposalMilestone` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_bountyId_fkey";

-- DropForeignKey
ALTER TABLE "ProposalMilestone" DROP CONSTRAINT "ProposalMilestone_proposalId_fkey";

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "projectId" TEXT,
ALTER COLUMN "bountyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN "sourceProposalMilestoneId",
ADD COLUMN     "revisionCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProjectProposal" DROP COLUMN "proposedTotal";

-- DropTable
DROP TABLE "ProposalMilestone";

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "raterUserId" TEXT,
    "rateeUserId" TEXT,
    "raterRole" "UserRole" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "raterNameSnapshot" TEXT,
    "rateeNameSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_projectId_idx" ON "Review"("projectId");

-- CreateIndex
CREATE INDEX "Review_rateeUserId_idx" ON "Review"("rateeUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_projectId_raterUserId_key" ON "Review"("projectId", "raterUserId");

-- CreateIndex
CREATE INDEX "Dispute_projectId_idx" ON "Dispute"("projectId");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_raterUserId_fkey" FOREIGN KEY ("raterUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rateeUserId_fkey" FOREIGN KEY ("rateeUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Polymorphic ownership invariant: a Dispute belongs to exactly one of a bounty
-- or a project (never both, never neither).
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_owner_exactly_one"
  CHECK (num_nonnulls("bountyId", "projectId") = 1);
