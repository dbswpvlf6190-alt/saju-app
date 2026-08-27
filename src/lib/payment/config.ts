export const PREMIUM_REPORT_PRICE_KRW = 4900;
export const PREMIUM_REPORT_NAME = "사주 상세 분석 리포트";

export const COMPATIBILITY_REPORT_PRICE_KRW = 4900;
export const COMPATIBILITY_REPORT_NAME = "궁합 상세 분석 리포트";

export type ProductType = "premium_report" | "compatibility_report";

/** 상품 가격/이름은 오직 이 카탈로그(서버)만이 결정한다. 클라이언트가 보낸 금액은 절대
 * 신뢰하지 않는다 — 개발자 도구로 금액을 조작해도 여기 정의된 값 외에는 결제가 생성되지 않는다. */
export const PRODUCT_CATALOG: Record<ProductType, { amount: number; name: string }> = {
  premium_report: { amount: PREMIUM_REPORT_PRICE_KRW, name: PREMIUM_REPORT_NAME },
  compatibility_report: { amount: COMPATIBILITY_REPORT_PRICE_KRW, name: COMPATIBILITY_REPORT_NAME },
};

export function isProductType(value: unknown): value is ProductType {
  return value === "premium_report" || value === "compatibility_report";
}
