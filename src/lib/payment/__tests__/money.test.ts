import { describe, expect, it } from "vitest";
import { GLOBAL_PRODUCT_CATALOG, GLOBAL_PRODUCT_TYPES, PRODUCT_CATALOG, isGlobalProductType } from "../config";
import { GLOBAL_CURRENCY, formatMoney, paymentMatchesOrder, usdToAmount } from "../money";

describe("해외판 금액·통화", () => {
  it("원화 표기는 기존과 같다", () => {
    expect(formatMoney(4900)).toBe("4,900원");
    expect(formatMoney(4900, "KRW")).toBe("4,900원");
  });

  it("USD·JPY 표기", () => {
    expect(formatMoney(usdToAmount(3.99), "USD")).toBe("$3.99");
    expect(formatMoney(580, "JPY")).toBe("¥580");
    expect(formatMoney(1280, "JPY")).toBe("¥1,280");
  });

  it("영어는 달러, 일본어는 엔화로 받는다(PayPal은 원화 미지원)", () => {
    expect(GLOBAL_CURRENCY).toEqual({ en: "USD", ja: "JPY" });
  });

  it("금액이 같아도 통화가 다르면 다른 결제다", () => {
    expect(paymentMatchesOrder({ amount: 399, currency: "USD" }, { amount: { total: 399 }, currency: "USD" })).toBe(true);
    expect(paymentMatchesOrder({ amount: 399, currency: "USD" }, { amount: { total: 399 }, currency: "KRW" })).toBe(false);
    expect(paymentMatchesOrder({ amount: 399, currency: "USD" }, { amount: { total: 400 }, currency: "USD" })).toBe(false);
  });

  it("통화 정보가 없는 기존 원화 주문·결제는 그대로 맞는다", () => {
    expect(paymentMatchesOrder({ amount: 4900 }, { amount: { total: 4900 } })).toBe(true);
    expect(paymentMatchesOrder({ amount: 4900, currency: "KRW" }, { amount: { total: 4900 }, currency: null })).toBe(true);
    expect(paymentMatchesOrder({ amount: 4900, currency: "KRW" }, { amount: { total: 4900 }, currency: "USD" })).toBe(false);
  });
});

describe("해외판 상품 카탈로그", () => {
  it("모든 해외 상품이 국내 카탈로그에도 있고 영어·일본어 가격과 이름이 있다", () => {
    for (const type of GLOBAL_PRODUCT_TYPES) {
      expect(PRODUCT_CATALOG[type]).toBeDefined();
      for (const locale of ["en", "ja"] as const) {
        const item = GLOBAL_PRODUCT_CATALOG[type][locale];
        expect(Number.isInteger(item.amount) && item.amount > 0).toBe(true);
        expect(item.name.length).toBeGreaterThan(3);
      }
    }
  });

  it("개별 항목·차액 상품은 아직 해외판에서 팔지 않는다", () => {
    expect(isGlobalProductType("single_section")).toBe(false);
    expect(isGlobalProductType("section_upgrade")).toBe(false);
    expect(isGlobalProductType("premium_report")).toBe(true);
  });
});
