-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COMPANY', 'FREELANCER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('DRAFT', 'FUNDED', 'ACTIVE', 'JUDGING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BountyType" AS ENUM ('BOUNTY', 'PROJECT');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('FIXED', 'RANGE', 'VARIABLE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubmissionLabel" AS ENUM ('UNREVIEWED', 'REVIEWED', 'SHORTLISTED', 'SPAM', 'LOW_QUALITY', 'MID_QUALITY', 'HIGH_QUALITY');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ESCROW_DEPOSIT', 'PRIZE_PAYOUT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FREELANCER',
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "industry" TEXT,
    "country" TEXT NOT NULL DEFAULT 'SL',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "monimePayoutMomoNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "portfolio" TEXT,
    "experienceLevel" TEXT,
    "momoNumber" TEXT,
    "whatsappNumber" TEXT,
    "bankDetails" JSONB,
    "aiEmbedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerSkill" (
    "id" TEXT NOT NULL,
    "freelancerProfileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiencyLevel" INTEGER NOT NULL,
    "yearsExperience" INTEGER,

    CONSTRAINT "FreelancerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bounty" (
    "id" TEXT NOT NULL,
    "companyProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "deliverables" TEXT,
    "type" "BountyType" NOT NULL DEFAULT 'BOUNTY',
    "status" "BountyStatus" NOT NULL DEFAULT 'DRAFT',
    "compensationType" "CompensationType" NOT NULL DEFAULT 'FIXED',
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "totalPrizePool" INTEGER NOT NULL,
    "rewardAmount" INTEGER,
    "minRewardAsk" INTEGER,
    "maxRewardAsk" INTEGER,
    "rewards" JSONB,
    "numberOfWinners" INTEGER NOT NULL DEFAULT 1,
    "maxBonusSpots" INTEGER NOT NULL DEFAULT 0,
    "isWinnersAnnounced" BOOLEAN NOT NULL DEFAULT false,
    "winnersAnnouncedAt" TIMESTAMP(3),
    "eligibility" JSONB,
    "timeToComplete" TEXT,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "judgingDeadline" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "escrowFinancialAccountId" TEXT,
    "escrowFundedAmount" INTEGER NOT NULL DEFAULT 0,
    "checkoutSessionId" TEXT,
    "checkoutSessionUrl" TEXT,
    "aiEmbedding" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrizeTier" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "PrizeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountySkill" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BountySkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "freelancerProfileId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "tweet" TEXT,
    "otherInfo" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "label" "SubmissionLabel" NOT NULL DEFAULT 'UNREVIEWED',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eligibilityAnswers" JSONB,
    "ask" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "winnerPosition" INTEGER,
    "score" INTEGER,
    "feedback" TEXT,
    "notes" TEXT,
    "prizeAmount" INTEGER,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "submissionId" TEXT,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'SLE',
    "amount" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "fromEntity" TEXT,
    "toEntity" TEXT,
    "checkoutSessionId" TEXT,
    "monimePaymentId" TEXT,
    "monimePayoutId" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT,
    "invitedById" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prefs" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProfile_userId_key" ON "FreelancerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_name_key" ON "SkillCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_slug_key" ON "SkillCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_categoryId_idx" ON "Skill"("categoryId");

-- CreateIndex
CREATE INDEX "Skill_slug_idx" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "FreelancerSkill_freelancerProfileId_idx" ON "FreelancerSkill"("freelancerProfileId");

-- CreateIndex
CREATE INDEX "FreelancerSkill_skillId_idx" ON "FreelancerSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerSkill_freelancerProfileId_skillId_key" ON "FreelancerSkill"("freelancerProfileId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Bounty_slug_key" ON "Bounty"("slug");

-- CreateIndex
CREATE INDEX "Bounty_companyProfileId_idx" ON "Bounty"("companyProfileId");

-- CreateIndex
CREATE INDEX "Bounty_status_idx" ON "Bounty"("status");

-- CreateIndex
CREATE INDEX "Bounty_slug_idx" ON "Bounty"("slug");

-- CreateIndex
CREATE INDEX "PrizeTier_bountyId_idx" ON "PrizeTier"("bountyId");

-- CreateIndex
CREATE UNIQUE INDEX "PrizeTier_bountyId_position_key" ON "PrizeTier"("bountyId", "position");

-- CreateIndex
CREATE INDEX "BountySkill_bountyId_idx" ON "BountySkill"("bountyId");

-- CreateIndex
CREATE INDEX "BountySkill_skillId_idx" ON "BountySkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "BountySkill_bountyId_skillId_key" ON "BountySkill"("bountyId", "skillId");

-- CreateIndex
CREATE INDEX "Submission_bountyId_idx" ON "Submission"("bountyId");

-- CreateIndex
CREATE INDEX "Submission_freelancerProfileId_idx" ON "Submission"("freelancerProfileId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_label_idx" ON "Submission"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_bountyId_freelancerProfileId_key" ON "Submission"("bountyId", "freelancerProfileId");

-- CreateIndex
CREATE INDEX "Payment_bountyId_idx" ON "Payment"("bountyId");

-- CreateIndex
CREATE INDEX "Payment_submissionId_idx" ON "Payment"("submissionId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_monimePaymentId_idx" ON "Payment"("monimePaymentId");

-- CreateIndex
CREATE INDEX "Payment_monimePayoutId_idx" ON "Payment"("monimePayoutId");

-- CreateIndex
CREATE INDEX "Dispute_bountyId_idx" ON "Dispute"("bountyId");

-- CreateIndex
CREATE INDEX "Dispute_raisedById_idx" ON "Dispute"("raisedById");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "CompanyInvite_email_idx" ON "CompanyInvite"("email");

-- CreateIndex
CREATE INDEX "CompanyInvite_invitedById_idx" ON "CompanyInvite"("invitedById");

-- CreateIndex
CREATE INDEX "CompanyInvite_status_idx" ON "CompanyInvite"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_eventType_createdAt_idx" ON "Notification"("userId", "eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerProfile" ADD CONSTRAINT "FreelancerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT "FreelancerSkill_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerSkill" ADD CONSTRAINT "FreelancerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bounty" ADD CONSTRAINT "Bounty_companyProfileId_fkey" FOREIGN KEY ("companyProfileId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrizeTier" ADD CONSTRAINT "PrizeTier_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountySkill" ADD CONSTRAINT "BountySkill_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountySkill" ADD CONSTRAINT "BountySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_freelancerProfileId_fkey" FOREIGN KEY ("freelancerProfileId") REFERENCES "FreelancerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "Bounty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyInvite" ADD CONSTRAINT "CompanyInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: one open invite per email at a time.
-- (Prisma does not yet support partial unique indexes declaratively.)
CREATE UNIQUE INDEX "CompanyInvite_email_pending_unique"
  ON "CompanyInvite"("email")
  WHERE "status" = 'PENDING';
