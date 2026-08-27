import type { AnalyticsEventName, AnalyticsMeta } from "./events";
import { sanitizeAnalyticsMeta } from "./events";

/** 클라이언트에서 전환 이벤트를 기록한다. 실패해도 UI 흐름을 막으면 안 되므로 항상 조용히 무시한다. */
export function trackEvent(name: AnalyticsEventName, meta?: AnalyticsMeta): void {
  if (typeof window === "undefined") return;
  const safeMeta = sanitizeAnalyticsMeta(meta);
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
