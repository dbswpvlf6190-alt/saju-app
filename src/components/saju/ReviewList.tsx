export interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  productType: string;
  createdAt: string;
  /** 이벤트 쿠폰으로 무료로 받은 리포트의 후기. 무료로 받은 이용자의 후기를 판매 화면에
   * 보여줄 때는 그 사실을 함께 밝힌다(공정위 추천·보증 심사지침의 경제적 이해관계 표시). */
  viaCoupon: boolean;
}

const PRODUCT_LABEL: Record<string, string> = {
  premium_report: "사주 상세 분석",
  compatibility_report: "궁합 상세 분석",
};

// 후기가 한두 개일 때 평균 별점을 크게 내세우면 오히려 표본이 적다는 게 드러나서, 이 개수부터 요약을 보인다.
const SUMMARY_MIN_COUNT = 3;

export function ReviewList({ reviews }: { reviews: ReviewItem[] }) {
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-sm font-medium text-foreground-muted">이용 후기</h3>
        {reviews.length >= SUMMARY_MIN_COUNT && (
          <span className="text-xs text-foreground-muted">
            <span className="text-accent-gold">★ {average.toFixed(1)}</span> · 후기 {reviews.length}개
          </span>
        )}
      </div>
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-accent-gold" aria-label={`별점 ${review.rating}점`}>
              {"★".repeat(review.rating)}
              <span className="text-foreground-muted/30">{"★".repeat(5 - review.rating)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
              {review.viaCoupon && (
                <span className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px]">
                  이벤트 쿠폰 이용
                </span>
              )}
              {PRODUCT_LABEL[review.productType] ?? review.productType}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{review.content}</p>
          <p className="mt-2 text-xs text-foreground-muted">
            {new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(
              new Date(review.createdAt),
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
