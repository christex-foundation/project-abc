-- AlterTable
ALTER TABLE "user" ADD COLUMN "handle" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_handle_key" ON "user"("handle");
