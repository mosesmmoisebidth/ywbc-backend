/*
  Warnings:

  - You are about to drop the column `language` on the `OnlineConversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OnlineConversation" DROP COLUMN "language",
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
