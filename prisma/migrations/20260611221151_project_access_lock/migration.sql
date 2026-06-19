-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "accessPinHash" TEXT,
ADD COLUMN     "targetProvinces" "Province"[] DEFAULT ARRAY[]::"Province"[];
