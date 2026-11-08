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
  /** 환불 계산용 리포트 몫(원, 리포트별). 열람한 리포트는 이 금액이 환불에서 빠진다(/refund 표와 같은 값). */
  reportValueKrw: number;
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
    reportValueKrw: 0,
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
    reportValueKrw: 4990,
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
    reportValueKrw: 4990,
  },
};

/** 기간형 상담권의 하루 질문 상한(사장님 결정 11/8) */
export const UNLIMITED_DAILY_CAP = 20;

export function isConsultProductType(value: unknown): value is ConsultProductType {
  return typeof value === "string" && value in CONSULT_PLANS;
}

/** 환불 가능 금액(원) — 전자상거래법 제17조 제2항 제5호 단서, 콘텐츠이용자 보호지침 제25조, 소비자분쟁해결기준(인터넷콘텐츠업).
 * - 열람한 리포트 몫은 빼고, 횟수권은 남은 질문 × (질문 몫 ÷ 총 질문 수), 결제 후 7일 이내만.
 * - 기간권은 이용일수 몫을 빼고, 7일이 지난 해지면 남은 금액의 10%도 뺀다.
 * - 상담방을 한 번도 열지 않았으면(선물 미개봉 포함) 7일 이내 전액.
 * 결제오류·중복·미제공·회사 장애는 이 계산과 관계없이 전액(사장님이 직접 판단). */
export function refundableKrw(
  plan: ConsultPlan,
  state: { paidAt: Date; creditsLeft: number | null; reportsOpened: number; opened: boolean },
  now: Date = new Date(),
): number {
  const day = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(0, Math.ceil((now.getTime() - state.paidAt.getTime()) / day));
  const reportsPart = plan.reportValueKrw * plan.includes.length;
  const servicePart = plan.amount - reportsPart;
  const unopenedReports = plan.reportValueKrw * Math.max(0, plan.includes.length - state.reportsOpened);
  // 한 번도 열지 않았으면(선물을 받는 분이 아직 안 연 경우 포함) 7일 이내 전액
  if (!state.opened && elapsedDays <= 7) return plan.amount;
  if (plan.credits !== null) {
    if (elapsedDays > 7) return 0;
    const unused = Math.max(0, state.creditsLeft ?? 0);
    return Math.floor(unopenedReports + (servicePart * unused) / plan.credits);
  }
  const days = plan.unlimitedDays ?? plan.validDays;
  const usedDays = Math.min(days, Math.max(1, elapsedDays));
  const remaining = (servicePart * (days - usedDays)) / days;
  const penalty = elapsedDays > 7 ? remaining * 0.1 : 0;
  return Math.max(0, Math.floor(unopenedReports + remaining - penalty));
}
