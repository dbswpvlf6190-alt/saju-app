-- CreateTable
CREATE TABLE "KakaoToken" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresIn" INTEGER NOT NULL,

    CONSTRAINT "KakaoToken_pkey" PRIMARY KEY ("id")
);
