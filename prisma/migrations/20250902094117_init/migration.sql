-- CreateTable
CREATE TABLE "public"."Prize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "giftshowGoodsCode" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParticipationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ParticipationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Winner" (
    "id" TEXT NOT NULL,
    "userPhoneNumber" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "giftshowTrId" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "participationCodeId" TEXT NOT NULL,

    CONSTRAINT "Winner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationCode_code_key" ON "public"."ParticipationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Winner_participationCodeId_key" ON "public"."Winner"("participationCodeId");

-- AddForeignKey
ALTER TABLE "public"."Winner" ADD CONSTRAINT "Winner_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "public"."Prize"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Winner" ADD CONSTRAINT "Winner_participationCodeId_fkey" FOREIGN KEY ("participationCodeId") REFERENCES "public"."ParticipationCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
