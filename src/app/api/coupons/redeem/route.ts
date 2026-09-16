import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/security/rateLimit";
import { orderAccessCookieName, signOrderAccessToken } from "@/lib/payment/orderAccess";

interface RedeemCouponBody {
  code?: string;
  birthInput?: SajuInput;
}

/**
 * 인스타 추첨 쿠폰 코드를 결제 없이 프리미엄 리포트로 전환한다. /api/orders(결제 주문 생성)와
 * 같은 모양의 Order(amount 0, status PAID)를 만들어서, 리포트 조회(/api/orders/[paymentId])와
 * 후기 작성(/api/reviews)이 결제 건과 완전히 동일한 코드 경로를 그대로 타게 한다.
 */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "coupons:redeem", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: RedeemCouponBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "쿠폰 코드를 입력해 주세요." }, { status: 400 });
  }
  if (!body.birthInput) {
    return NextResponse.json({ error: "생년월일 정보가 필요합니다." }, { status: 400 });
  }
  try {
    calculateSaju(body.birthInput);
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("쿠폰 사용 전 사주 검증 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }

  try {
    const now = new Date();
    // 동시에 같은 코드가 여러 번 제출돼도 한 번만 소진되도록, "미사용·미만료" 조건이 걸린
    // updateMany 한 번으로 원자적으로 선점한다(조회 후 갱신 방식은 경쟁 상태에 취약하다).
    const claimed = await prisma.coupon.updateMany({
      where: { code, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (claimed.count === 0) {
      const existing = await prisma.coupon.findUnique({ where: { code } });
      if (!existing) {
        return NextResponse.json({ error: "존재하지 않는 쿠폰 코드예요." }, { status: 404 });
      }
      if (existing.usedAt) {
        return NextResponse.json({ error: "이미 사용된 쿠폰 코드예요." }, { status: 409 });
      }
      return NextResponse.json({ error: "만료된 쿠폰 코드예요." }, { status: 410 });
    }

    const paymentId = randomUUID();
    try {
      const order = await prisma.order.create({
        data: {
          paymentId,
          amount: 0,
          productType: "premium_report",
          birthInputJson: JSON.stringify(body.birthInput),
          status: "PAID",
          paidAt: now,
        },
      });
      await prisma.coupon.update({ where: { code }, data: { usedOrderId: order.id } });

      const response = NextResponse.json({ paymentId: order.paymentId });
      response.cookies.set(orderAccessCookieName(order.paymentId), await signOrderAccessToken(order.paymentId), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    } catch (e) {
      // 주문 생성이 실패했는데 쿠폰만 소진된 상태로 남지 않도록 되돌린다.
      await prisma.coupon.updateMany({ where: { code, usedOrderId: null }, data: { usedAt: null } }).catch(() => {});
      throw e;
    }
  } catch (e) {
    console.error("쿠폰 사용 처리 중 오류:", e);
    return NextResponse.json({ error: "쿠폰 사용에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
