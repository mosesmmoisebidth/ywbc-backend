-- AlterTable
ALTER TABLE "Meditation" ADD COLUMN     "narrator" TEXT,
ADD COLUMN     "transcript" TEXT,
ALTER COLUMN "audioURL" SET DEFAULT '',
ALTER COLUMN "duration" SET DEFAULT 0,
ALTER COLUMN "coverImageURL" SET DEFAULT '';
