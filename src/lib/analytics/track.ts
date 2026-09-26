import type { AnalyticsEventName, AnalyticsMeta } from "./events";
import { sanitizeAnalyticsMeta } from "./events";
import { firstSource } from "./source";

// 결제로 이어지는 이벤트에는 첫 유입 경로(src)를 붙여 채널별 결제 수를 볼 수 있게 한다(source.ts).
const ATTRIBUTED_EVENTS = new Set<AnalyticsEventName>([
  "premium_cta_click",
  "checkout_start",
  "payment_success",
  "coupon_redeemed",
  "compatibility_premium_click",
  "exam_promo_click",
]);

/** 클라이언트에서 전환 이벤트를 기록한다. 실패해도 UI 흐름을 막으면 안 되므로 항상 조용히 무시한다. */
export function trackEvent(name: AnalyticsEventName, meta?: AnalyticsMeta): void {
  if (typeof window === "undefined") return;
  const src = ATTRIBUTED_EVENTS.has(name) ? firstSource() : undefined;
  const safeMeta = sanitizeAnalyticsMeta(src ? { ...meta, src } : meta);
  try {
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, meta: safeMeta }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // 네트워크/브라우저 제약으로 실패해도 사용자 흐름에는 영향 없음
  }
}
