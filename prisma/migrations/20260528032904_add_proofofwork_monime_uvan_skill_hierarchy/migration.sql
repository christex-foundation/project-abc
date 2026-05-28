-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CHECKOUT', 'INTERNAL_TRANSFER', 'MOMO_PAYOUT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "monimeFinancialAccountId" TEXT,
ADD COLUMN     "monimeUvan" TEXT;

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "monimeFinancialAccountId" TEXT,
ADD COLUMN     "monimeUvan" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'CHECKOUT',
ADD COLUMN     "monimeTransferId" TEXT;

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "parentSkillId" TEXT;

-- CreateTable
CREATE TABLE "ProofOfWork" (
    "id" TEXT NOT NULL,
    "freelancerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfWorkSkill" (
    "id" TEXT NOT NULL,
    "proofOfWorkId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProofOfWorkSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountWithdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toPhoneNumber" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "monimePayoutId" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PROCESSING',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofOfWork_freelancerProfileId_idx" ON "ProofOfWork"("freelancerProfileId");

-- CreateIndex
CREATE INDEX "ProofOfWorkSkill_proofOfWorkId_idx" ON "ProofOfWorkSkill"("proofOfWorkId");

-- CreateIndex
CREATE INDEX "ProofOfWorkSkill_skillId_idx" ON "ProofOfWorkSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfWorkSkill_proofOfWorkId_skillId_key" ON "ProofOfWorkSkill"("proofOfWorkId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountWithdrawal_monimePayoutId_key" ON "AccountWithdrawal"("monimePayoutId");

-- CreateIndex
CREATE INDEX "AccountWithdrawal_userId_idx" ON "AccountWithdrawal"("userId");

-- CreateIndex
CREATE INDEX "AccountWithdrawal_monimePayoutId_idx" ON "AccountWithdrawal"("monimePayoutId");

-- CreateIndex
CREATE INDEX "AccountWithdrawal_status_idx" ON "AccountWithdrawal"("status");

-- CreateIndex
CREATE INDEX "Skill_parentSkillId_idx" ON "Skill"("parentSkillId");

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_parentSkillId_fkey" FOREIGN KEY ("parentSkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfWork" ADD CONSTRAINT "ProofOfWork_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfWorkSkill" ADD CONSTRAINT "ProofOfWorkSkill_proofOfWorkId_fkey" FOREIGN KEY ("proofOfWorkId") REFERENCES "ProofOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfWorkSkill" ADD CONSTRAINT "ProofOfWorkSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountWithdrawal" ADD CONSTRAINT "AccountWithdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
