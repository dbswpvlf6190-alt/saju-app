import { prisma } from "@/lib/db/prisma";
import type { ReviewItem } from "@/components/saju/ReviewList";

/** 홈(`/`)과 /type-test 양쪽에서 같은 후기 목록을 보여주기 위한 공용 조회 함수. */
export async function getVisibleReviews(limit = 10): Promise<ReviewItem[]> {
  const reviews = await prisma.review.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, rating: true, content: true, productType: true, createdAt: true },
  });
  return reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
