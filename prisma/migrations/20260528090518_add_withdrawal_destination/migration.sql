-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "withdrawalHolderName" TEXT,
ADD COLUMN     "withdrawalPhone" TEXT,
ADD COLUMN     "withdrawalProviderName" TEXT,
ADD COLUMN     "withdrawalVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN     "withdrawalHolderName" TEXT,
ADD COLUMN     "withdrawalPhone" TEXT,
ADD COLUMN     "withdrawalProviderName" TEXT,
ADD COLUMN     "withdrawalVerifiedAt" TIMESTAMP(3);
