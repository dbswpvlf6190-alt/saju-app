// 사장님 본인 시험 결제 — 손님 매출에서 뺀다. scripts/daily_report_pdf.py의 TEST_ORDERS와 같은 목록(앞부분 일치).
export const TEST_ORDER_PREFIXES = [
  "toss-9f4e2019", // 10/20 토스 실결제 시험(사장님 아이폰)
  "toss-3f1e76d2",
  "toss-4738803c",
  "423ad36b", // 8/28 웹 4,900원 — 사장님 본인 결제
  "toss-d3a28528", // 11/3 토스 신년운세 — 사장님 본인 결제
] as const;

/** 손님 실매출로 셀 주문인지: 시험 결제·0원(무료 질문·쿠폰)은 뺀다. */
export function isCustomerOrder(order: { paymentId: string; amount: number }): boolean {
  if (order.amount <= 0) return false;
  return !TEST_ORDER_PREFIXES.some((p) => order.paymentId.startsWith(p));
}
