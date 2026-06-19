-- Provincial targeting + PIN lock for bounties; province/district on freelancers.

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('EASTERN', 'NORTHERN', 'NORTH_WEST', 'SOUTHERN', 'WESTERN_AREA');

-- CreateEnum
CREATE TYPE "District" AS ENUM ('KAILAHUN', 'KENEMA', 'KONO', 'BOMBALI', 'FALABA', 'KOINADUGU', 'TONKOLILI', 'KAMBIA', 'KARENE', 'PORT_LOKO', 'BO', 'BONTHE', 'MOYAMBA', 'PUJEHUN', 'WESTERN_AREA_URBAN', 'WESTERN_AREA_RURAL');

-- AlterTable
ALTER TABLE "FreelancerProfile" ADD COLUMN "province" "Province",
ADD COLUMN "district" "District";

-- AlterTable
ALTER TABLE "Bounty" ADD COLUMN "targetProvinces" "Province"[] DEFAULT ARRAY[]::"Province"[],
ADD COLUMN "accessPinHash" TEXT;
