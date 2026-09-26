-- CreateTable
CREATE TABLE "CompatInvite" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inviterKey" TEXT NOT NULL,
    "inviterName" TEXT,
    "inviterInputJson" TEXT NOT NULL,
    "partnerKey" TEXT,
    "partnerName" TEXT,
    "partnerInputJson" TEXT,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pushEndpoint" TEXT,
    "pushP256dh" TEXT,
    "pushAuth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompatInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompatInvite_code_key" ON "CompatInvite"("code");

-- CreateIndex
CREATE INDEX "CompatInvite_inviterKey_idx" ON "CompatInvite"("inviterKey");

-- CreateIndex
CREATE INDEX "CompatInvite_expiresAt_idx" ON "CompatInvite"("expiresAt");
