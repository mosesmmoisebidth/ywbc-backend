-- CreateEnum
CREATE TYPE "GatheringType" AS ENUM ('CIRCLE', 'WORKSHOP', 'SUPPORT', 'TRAINING', 'CONVERSATION');

-- AlterTable
ALTER TABLE "OnlineConversation" ADD COLUMN     "accessibilityNotes" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "coHosts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "gatheringType" "GatheringType",
ADD COLUMN     "language" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "prepItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topicArea" TEXT;

-- AlterTable
ALTER TABLE "Psychologist" ADD COLUMN     "email" TEXT,
ADD COLUMN     "momoAccountName" TEXT,
ADD COLUMN     "momoNumber" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "EmailChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newEmail" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");

-- CreateIndex
CREATE INDEX "EmailChangeRequest_code_idx" ON "EmailChangeRequest"("code");

-- AddForeignKey
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
