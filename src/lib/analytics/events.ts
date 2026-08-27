// 전환 퍼널 추적 이벤트 이름. 여기 없는 이름은 서버에서 거부한다(임의 이벤트 스팸 방지).
export const ANALYTICS_EVENT_NAMES = [
  "landing_view",
  "saju_start",
  "saju_complete",
  "free_result_view",
  "premium_preview_view",
  "premium_cta_click",
  "checkout_start",
  "payment_success",
  "payment_fail",
  "compatibility_start",
  "compatibility_complete",
  "compatibility_premium_click",
  "daily_fortune_view",
  "share_click",
  "review_submit",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

// meta에 절대 담으면 안 되는 필드(생년월일시·성별 등 사주 입력값). 클라이언트/서버 양쪽에서
// 이중으로 걸러낸다 — 실수로라도 개인정보가 이벤트 로그에 섞여 들어가지 않도록 하기 위함이다.
const FORBIDDEN_META_KEYS = new Set([
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "gender",
  "birthinput",
  "name",
  "email",
  "phone",
  "phonenumber",
]);

export type AnalyticsMeta = Record<string, string | number | boolean>;

/** meta 객체에서 금지 필드를 제거하고, 값도 원시타입(string/number/boolean)만 남긴다. */
export function sanitizeAnalyticsMeta(meta: unknown): AnalyticsMeta | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const result: AnalyticsMeta = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    if (FORBIDDEN_META_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
