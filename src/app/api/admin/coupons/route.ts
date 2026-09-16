import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";
import { COUPON_EXPIRY_DAYS } from "@/lib/payment/config";

const MAX_ISSUE_COUNT = 20;

function generateCouponCode(): string {
  // 사람이 DM으로 옮겨 적어도 헷갈리지 않도록 대문자 hex 8자 + 접두사만 쓴다.
  return `SAJU${randomBytes(4).toString("hex").toUpperCase()}`;
}

/** 인스타 팔로우+댓글 추첨 당첨자용 무료 리포트 코드를 한 번에 여러 개 발급한다.
 * proxy.ts(미들웨어)가 /api/admin/* 전체를 이미 인증 검증하지만, matcher 설정이 바뀌어도
 * 이 라우트 혼자서는 뚫리지 않도록 여기서도 다시 검증한다. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let body: { count?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const count = Math.min(Math.max(Math.trunc(body.count ?? 5), 1), MAX_ISSUE_COUNT);
  const expiresAt = new Date(Date.now() + COUPON_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  try {
    const codes: string[] = [];
    // unique 제약 충돌(사실상 거의 없지만) 시 재시도할 수 있게 코드 하나씩 생성한다.
    for (let i = 0; i < count; i++) {
      let created = null;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const code = generateCouponCode();
        try {
          created = await prisma.coupon.create({ data: { code, expiresAt } });
        } catch (e) {
          if (attempt === 4) throw e;
        }
      }
      if (created) codes.push(created.code);
    }
    return NextResponse.json({ codes, expiresAt });
  } catch (e) {
    console.error("쿠폰 발급 중 오류:", e);
    return NextResponse.json({ error: "쿠폰 발급에 실패했습니다." }, { status: 500 });
  }
}
