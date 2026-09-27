import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { COUPON_EXPIRY_DAYS } from "./config";

function generateCouponCode(): string {
  // 사람이 DM으로 옮겨 적어도 헷갈리지 않도록 대문자 hex 8자 + 접두사만 쓴다.
  return `SAJU${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** 무료 리포트 쿠폰 1개를 발급한다. unique 제약 충돌(사실상 거의 없지만) 시 새 코드로 재시도한다. */
export async function issueCoupon(): Promise<{ code: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  for (let attempt = 0; ; attempt++) {
    try {
      const created = await prisma.coupon.create({ data: { code: generateCouponCode(), expiresAt } });
      return { code: created.code, expiresAt: created.expiresAt };
    } catch (e) {
      if (attempt >= 4) throw e;
    }
  }
}
