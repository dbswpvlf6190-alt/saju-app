interface Review {
  id: string;
  rating: number;
  content: string;
  productType: string;
  createdAt: string;
}

const PRODUCT_LABEL: Record<string, string> = {
  premium_report: "사주 상세 분석",
  compatibility_report: "궁합 상세 분석",
};

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle p-6 text-center text-sm text-foreground-muted">
        첫 번째 후기를 남겨주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-accent-gold" aria-label={`별점 ${review.rating}점`}>
              {"★".repeat(review.rating)}
              <span className="text-foreground-muted/30">{"★".repeat(5 - review.rating)}</span>
            </span>
            <span className="text-xs text-foreground-muted">
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
