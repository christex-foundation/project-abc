-- AlterTable
ALTER TABLE "Bounty" ADD COLUMN     "targetDistricts" "District"[] DEFAULT ARRAY[]::"District"[];

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "targetDistricts" "District"[] DEFAULT ARRAY[]::"District"[];
