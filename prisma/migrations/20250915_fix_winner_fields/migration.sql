-- AlterTable
ALTER TABLE "public"."Winner" 
ALTER COLUMN "userPhoneNumber" DROP NOT NULL,
ALTER COLUMN "giftshowTrId" DROP NOT NULL;