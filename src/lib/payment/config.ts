import { usdToAmount, type GlobalLocale } from "@/lib/payment/money";
// 카드사 심사가 끝나기 전에는 실연동 MID에서 카드 결제가 "[V104] NO MPI SET 미사용 설정 지불수단"으로 실패한다
// (10/4·10/6·10/9 결제 시도 전부 실패 확인). 그동안 결제 버튼 대신 "결제 오픈 알림 받기"(이메일)를 보여준다.
// 2026-10-14 카드사 심사가 끝나 false로 열었다(결제 오픈). WaitlistSignup 오픈 안내 메일은 /admin에서 복사해 보내고 목록을 삭제할 것.
// 다시 실패가 나면 true로 되돌려 배포하면 즉시 대기자 수집 화면으로 돌아간다.
export const PAYMENTS_PAUSED = false;

export const PREMIUM_REPORT_PRICE_KRW = 4900;
export const PREMIUM_REPORT_NAME = "사주 상세 분석 리포트";

export const COMPATIBILITY_REPORT_PRICE_KRW = 4900;

// 첫 구매 문턱을 낮추는 "궁금한 1가지만" 상품(2026-09-27). 산 뒤 나머지 4가지는 차액만 내고 연다
// (section_upgrade = 전체 가격 − 1가지 가격). 30일 퍼널에서 유료 안내→결제 버튼이 7%로 가장 크게 빠져서 도입.
export const SINGLE_SECTION_PRICE_KRW = 1900;
export const SINGLE_SECTION_NAME = "사주 상세 분석 (1가지)";
export const SECTION_UPGRADE_PRICE_KRW = PREMIUM_REPORT_PRICE_KRW - SINGLE_SECTION_PRICE_KRW;
export const SECTION_UPGRADE_NAME = "사주 상세 분석 (나머지 4가지)";
export const COMPATIBILITY_REPORT_NAME = "궁합 상세 분석 리포트";

// 이번 시즌(2026년 11월~2027년 2월) 한정 업셀 상품의 대상 연도. 다음 신년운세 시즌에는
// 이 값과 NEW_YEAR_REPORT_NAME을 함께 다음 해로 갱신해야 한다.
export const NEW_YEAR_REPORT_TARGET_YEAR = 2027;
export const NEW_YEAR_REPORT_PRICE_KRW = 3900;
export const NEW_YEAR_REPORT_NAME = `${NEW_YEAR_REPORT_TARGET_YEAR} 신년운세`;

export type ProductType =
  | "premium_report"
  | "compatibility_report"
  | "new_year_report"
  | "single_section"
  | "section_upgrade";

/** 상품 가격/이름은 오직 이 카탈로그(서버)만이 결정한다. 클라이언트가 보낸 금액은 절대
 * 신뢰하지 않는다 — 개발자 도구로 금액을 조작해도 여기 정의된 값 외에는 결제가 생성되지 않는다. */
export const PRODUCT_CATALOG: Record<ProductType, { amount: number; name: string }> = {
  premium_report: { amount: PREMIUM_REPORT_PRICE_KRW, name: PREMIUM_REPORT_NAME },
  compatibility_report: { amount: COMPATIBILITY_REPORT_PRICE_KRW, name: COMPATIBILITY_REPORT_NAME },
  new_year_report: { amount: NEW_YEAR_REPORT_PRICE_KRW, name: NEW_YEAR_REPORT_NAME },
  single_section: { amount: SINGLE_SECTION_PRICE_KRW, name: SINGLE_SECTION_NAME },
  section_upgrade: { amount: SECTION_UPGRADE_PRICE_KRW, name: SECTION_UPGRADE_NAME },
};

export function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && value in PRODUCT_CATALOG;
}

// ── 해외판(/en, /ja) 결제 ────────────────────────────────────────────────
// 포트원 + PayPal 실운영 채널이 열리고 테스트 결제를 마치기 전에는 false로 둔다. false인 동안은 해외 주문이 서버에서 거부된다.
export const GLOBAL_PAYMENTS_ENABLED = false;

/** 해외판에서 파는 상품(국내와 같은 구성). 개별 항목(single_section)은 PayPal 소액결제 요율 적용이 확인될 때 추가한다. */
export const GLOBAL_PRODUCT_TYPES = ["premium_report", "compatibility_report", "new_year_report"] as const;
export type GlobalProductType = (typeof GLOBAL_PRODUCT_TYPES)[number];

// 가격 제안(10/27, 환율 $1≈1,424원·100엔≈888원 기준 어림값 — 확정 전). amount는 PortOne 단위(money.ts 참고).
// 상품명은 임시다. 일본·영어권에서 "나 사용설명서"가 통하지 않아 새로 정해야 한다.
export const GLOBAL_PRODUCT_CATALOG: Record<GlobalProductType, Record<GlobalLocale, { amount: number; name: string }>> = {
  premium_report: {
    en: { amount: usdToAmount(3.99), name: "Saju Full Report" },
    ja: { amount: 580, name: "四柱推命 詳細レポート" },
  },
  compatibility_report: {
    en: { amount: usdToAmount(3.99), name: "Saju Compatibility Report" },
    ja: { amount: 580, name: "四柱推命 相性レポート" },
  },
  new_year_report: {
    en: { amount: usdToAmount(2.99), name: `${NEW_YEAR_REPORT_TARGET_YEAR} Saju New Year Forecast` },
    ja: { amount: 480, name: `${NEW_YEAR_REPORT_TARGET_YEAR}年 四柱推命 年運レポート` },
  },
};

export function isGlobalProductType(value: unknown): value is GlobalProductType {
  return typeof value === "string" && (GLOBAL_PRODUCT_TYPES as readonly string[]).includes(value);
}

// 인스타 추첨 이벤트로 발급하는 무료 리포트 쿠폰의 유효기간. 당첨자가 DM을 늦게 확인해도
// 쓸 수 있도록 매주 추첨 주기보다 넉넉하게 잡는다.
export const COUPON_EXPIRY_DAYS = 14;
