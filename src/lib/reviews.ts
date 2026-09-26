import { prisma } from "@/lib/db/prisma";
import type { ReviewItem } from "@/components/saju/ReviewList";

/** 홈(`/`)과 /type-test 양쪽에서 같은 후기 목록을 보여주기 위한 공용 조회 함수. */
export async function getVisibleReviews(limit = 10): Promise<ReviewItem[]> {
  const reviews = await prisma.review.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, rating: true, content: true, productType: true, createdAt: true, paymentId: true },
  });

  // 쿠폰 사용 주문은 결제 금액 0원인 PAID 주문으로 남는다(/api/coupons/redeem).
  const freeOrders = await prisma.order.findMany({
    where: { paymentId: { in: reviews.map((r) => r.paymentId) }, amount: 0 },
    select: { paymentId: true },
  });
  const freePaymentIds = new Set(freeOrders.map((o) => o.paymentId));

  return reviews.map(({ paymentId, ...r }) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    viaCoupon: freePaymentIds.has(paymentId),
  }));
}
