-- 결제 오픈 알림 신청(카드사 심사 기간 임시 기능)
CREATE TABLE "WaitlistSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "src" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "WaitlistSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistSignup_email_productType_key" ON "WaitlistSignup"("email", "productType");
