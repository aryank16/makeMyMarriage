-- AlterTable
ALTER TABLE "User" ADD COLUMN     "supabaseId" TEXT,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

