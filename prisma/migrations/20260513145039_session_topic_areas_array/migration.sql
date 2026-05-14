/*
  Warnings:

  - You are about to drop the column `topicArea` on the `OnlineConversation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OnlineConversation" DROP COLUMN "topicArea",
ADD COLUMN     "topicAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
