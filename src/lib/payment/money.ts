// 해외판(PayPal) 결제 금액·통화 규칙. PayPal은 원화를 지원하지 않아 영어는 USD, 일본어는 JPY로 받는다.
// amount는 PortOne amount.total과 같은 단위로 저장한다. USD를 센트(399)로 보낼지 달러(3.99)로 보낼지는
// 포트원 PayPal 테스트 채널에서 확인하기 전이라 USD_AMOUNT_IS_CENTS 한 곳만 바꾸면 되게 해 두었다.

export type GlobalLocale = "en" | "ja";
export type GlobalCurrency = "USD" | "JPY";
export type OrderCurrency = "KRW" | GlobalCurrency;

export const GLOBAL_CURRENCY: Record<GlobalLocale, GlobalCurrency> = { en: "USD", ja: "JPY" };

/** 포트원 브라우저 SDK 타입 설명(totalAmount)에 "USD는 100배(센트), JPY는 1배"로 명시돼 있어 센트가 맞다. 그래도 테스트 채널에서 한 번 확인한 뒤에 실결제를 연다. */
export const USD_AMOUNT_IS_CENTS = true;

export function isGlobalLocale(value: unknown): value is GlobalLocale {
  return value === "en" || value === "ja";
}

/** "3.99 달러"를 주문·결제 금액(amount) 단위로 바꾼다. JPY는 소수 단위가 없다. */
export function usdToAmount(dollars: number): number {
  return USD_AMOUNT_IS_CENTS ? Math.round(dollars * 100) : dollars;
}

/** 화면·알림에 보여 줄 문구. 원화는 기존 표기("4,900원")를 그대로 유지한다. */
export function formatMoney(amount: number, currency: string = "KRW"): string {
  if (currency === "USD") {
    const dollars = USD_AMOUNT_IS_CENTS ? amount / 100 : amount;
    return `$${dollars.toFixed(2)}`;
  }
  if (currency === "JPY") return `¥${amount.toLocaleString("en-US")}`;
  return `${amount.toLocaleString()}원`;
}

/** 결제 조회 결과가 우리가 발급한 주문과 같은 금액·같은 통화인지. 통화가 다르면 숫자가 같아도 다른 결제다. */
export function paymentMatchesOrder(
  order: { amount: number; currency?: string | null },
  payment: { amount: { total: number }; currency?: string | null },
): boolean {
  return payment.amount.total === order.amount && (payment.currency ?? "KRW") === (order.currency ?? "KRW");
}
