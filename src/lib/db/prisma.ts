import { PrismaClient } from "@/generated/prisma/client";

// Next.js 개발 모드의 핫 리로드로 인해 매 요청마다 새 PrismaClient가 생성되어
// SQLite 커넥션이 누적되는 것을 막기 위한 표준 싱글턴 패턴.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
