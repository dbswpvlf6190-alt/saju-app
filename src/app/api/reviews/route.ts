import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { validateReview } from "@/lib/review/validate";
import { rateLimit } from "@/lib/security/rateLimit";
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/payment/orderAccess";

/** 공개 후기 목록. visible=true인 것만, 최신순으로 최대 50건. */
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { visible: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, rating: true, content: true, productType: true, createdAt: true },
    });
    return NextResponse.json({ reviews });
  } catch (e) {
    console.error("후기 목록 조회 중 오류:", e);
    return NextResponse.json({ error: "후기를 불러오지 못했습니다." }, { status: 500 });
  }
}

interface CreateReviewBody {
  paymentId?: string;
  rating?: number;
  content?: string;
}

/** 결제 완료(PAID) 주문의 paymentId를 제시해야만 후기를 남길 수 있다 — 이 paymentId가
 * 곧 "구매 완료" 증명이며, 별도의 회원 인증 체계 없이도 실제 구매자만 후기를 남기게 하는 장치다.
 * 주문 하나당 후기 1건만 허용한다(Review.paymentId가 unique). */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "reviews:create", { limit: 5, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CreateReviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body.paymentId) {
    return NextResponse.json({ error: "결제 정보가 필요합니다." }, { status: 400 });
  }

  const validation = validateReview({ rating: body.rating, content: body.content });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({ where: { paymentId: body.paymentId } });
    if (!order || order.status !== "PAID") {
      return NextResponse.json({ error: "결제 완료된 주문에서만 후기를 남길 수 있습니다." }, { status: 403 });
    }

    // paymentId만 알면 다른 사람의 실제 주문에 허위 후기를 남기거나 진짜 구매자의 후기
    // 작성 기회를 가로챌 수 있었다(SECURITY_AUDIT_FINAL.md 2-1번). 그 주문을 생성한
    // 브라우저에만 있는 서명 쿠키를 확인해서, 실제 구매자 본인만 후기를 남기게 한다.
    const accessToken = req.cookies.get(orderAccessCookieName(body.paymentId))?.value;
    if (!(await verifyOrderAccessToken(body.paymentId, accessToken))) {
      return NextResponse.json({ error: "이 주문에 대한 접근 권한이 없습니다." }, { status: 403 });
    }

    const existing = await prisma.review.findUnique({ where: { paymentId: body.paymentId } });
    if (existing) {
      return NextResponse.json({ error: "이미 이 주문으로 후기를 남기셨습니다." }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        paymentId: body.paymentId,
        productType: order.productType,
        rating: Number(body.rating),
        content: validation.content!,
      },
    });

    return NextResponse.json({ id: review.id }, { status: 201 });
  } catch (e) {
    console.error("후기 등록 중 오류:", e);
    return NextResponse.json({ error: "후기 등록에 실패했습니다." }, { status: 500 });
  }
}
