-- AI 사주 상담소: 상담권과 상담 메시지. 새 테이블만 추가하므로 기존 주문·리포트에 영향 없음.
CREATE TABLE "ConsultPass" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "orderPaymentId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "ownerInputJson" TEXT,
    "ownerName" TEXT,
    "familyJson" TEXT NOT NULL DEFAULT '[]',
    "familyMax" INTEGER NOT NULL DEFAULT 0,
    "creditsLeft" INTEGER,
    "unlimitedUntil" TIMESTAMP(3),
    "dailyCap" INTEGER NOT NULL DEFAULT 20,
    "giftFrom" TEXT,
    "costCapKrw" INTEGER NOT NULL,
    "costUsedKrw" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3),
    "reportsOpenedJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsultPass_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ConsultPass_orderPaymentId_key" ON "ConsultPass"("orderPaymentId");
CREATE INDEX "ConsultPass_expiresAt_idx" ON "ConsultPass"("expiresAt");

CREATE TABLE "ConsultMessage" (
    "id" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "profileKey" TEXT NOT NULL DEFAULT 'owner',
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "costKrw" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConsultMessage_passId_createdAt_idx" ON "ConsultMessage"("passId", "createdAt");
ALTER TABLE "ConsultMessage" ADD CONSTRAINT "ConsultMessage_passId_fkey" FOREIGN KEY ("passId") REFERENCES "ConsultPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
