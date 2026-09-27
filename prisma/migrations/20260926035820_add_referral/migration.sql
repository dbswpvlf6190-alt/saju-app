-- CreateTable
CREATE TABLE "Referrer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "birthKey" TEXT NOT NULL,
    "userId" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralVisit" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "birthKey" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_code_key" ON "Referrer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Referrer_couponCode_key" ON "Referrer"("couponCode");

-- CreateIndex
CREATE INDEX "Referrer_userId_idx" ON "Referrer"("userId");

-- CreateIndex
CREATE INDEX "ReferralVisit_referrerId_ipHash_idx" ON "ReferralVisit"("referrerId", "ipHash");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralVisit_referrerId_birthKey_key" ON "ReferralVisit"("referrerId", "birthKey");

-- AddForeignKey
ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
