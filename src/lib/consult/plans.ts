// AI 사주 상담소 상품(2026-11-08, docs/ai-consult-design.md). 가격·이름은 이 표와 payment/config의
// PRODUCT_CATALOG가 함께 쓴다. 웹 가격은 끝자리 990원(사장님 결정), 토스 가격은 공급가 10원 단위라 따로 둔다.

export type ConsultProductType = "consult_5" | "newyear_plus" | "premium_bundle";

export interface ConsultPlan {
  amount: number;
  name: string;
  /** 횟수형이면 질문 수, 기간형이면 null */
  credits: number | null;
  /** 기간형(무제한)이면 일수 */
  unlimitedDays: number | null;
  /** 상담권 유효기간(일). 횟수형은 넉넉히, 기간형은 무제한 기간과 같다. */
  validDays: number;
  /** 등록할 수 있는 가족 수 */
  familyMax: number;
  /** 상담권 1장의 AI 비용 상한(원). 넘으면 그날은 멈추고 다음 날 다시 쓴다. */
  costCapKrw: number;
  /** 결제와 함께 열리는 리포트(기존 리포트 생성기를 0원 내부 주문으로 재사용) */
  includes: ("new_year_report" | "premium_report")[];
}

export const CONSULT_PLANS: Record<ConsultProductType, ConsultPlan> = {
  consult_5: {
    amount: 4990,
    name: "AI 사주 상담 5회",
    credits: 5,
    unlimitedDays: null,
    validDays: 365,
    familyMax: 0,
    costCapKrw: 300,
    includes: [],
  },
  newyear_plus: {
    amount: 14990,
    name: "2027 신년운세 + AI 상담 15회",
    credits: 15,
    unlimitedDays: null,
    validDays: 365,
    familyMax: 0,
    costCapKrw: 1000,
    includes: ["new_year_report"],
  },
  premium_bundle: {
    amount: 29990,
    name: "평생·신년운세 + 가족 2명 + 30일 무제한 상담",
    credits: null,
    unlimitedDays: 30,
    validDays: 30,
    familyMax: 2,
    costCapKrw: 3000,
    includes: ["premium_report", "new_year_report"],
  },
};

/** 기간형 상담권의 하루 질문 상한(사장님 결정 11/8) */
export const UNLIMITED_DAILY_CAP = 20;

export function isConsultProductType(value: unknown): value is ConsultProductType {
  return typeof value === "string" && value in CONSULT_PLANS;
}
