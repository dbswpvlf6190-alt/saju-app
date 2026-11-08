import { describe, expect, it } from "vitest";
import { CONSULT_PLANS, refundableKrw } from "../plans";

const paidAt = new Date("2026-11-10T00:00:00Z");
const after = (days: number) => new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);

describe("refundableKrw", () => {
  it("한 번도 열지 않았으면 7일 이내 전액", () => {
    const plan = CONSULT_PLANS.premium_bundle;
    expect(refundableKrw(plan, { paidAt, creditsLeft: null, reportsOpened: 0, opened: false }, after(3))).toBe(plan.amount);
  });

  it("5회권: 2회 쓰면 남은 3회 몫만, 7일 지나면 0", () => {
    const plan = CONSULT_PLANS.consult_5;
    const state = { paidAt, creditsLeft: 3, reportsOpened: 0, opened: true };
    expect(refundableKrw(plan, state, after(2))).toBe(Math.floor((4990 * 3) / 5));
    expect(refundableKrw(plan, state, after(8))).toBe(0);
  });

  it("신년운세+15회: 리포트를 열면 리포트 몫이 빠진다", () => {
    const plan = CONSULT_PLANS.newyear_plus;
    const opened = refundableKrw(plan, { paidAt, creditsLeft: 15, reportsOpened: 1, opened: true }, after(1));
    expect(opened).toBe(14990 - 4990);
    const unopened = refundableKrw(plan, { paidAt, creditsLeft: 15, reportsOpened: 0, opened: true }, after(1));
    expect(unopened).toBe(14990);
  });

  it("30일권: 이용일수만큼 빼고, 7일 지나면 남은 금액의 10%도 뺀다", () => {
    const plan = CONSULT_PLANS.premium_bundle;
    const service = plan.amount - plan.reportValueKrw * 2;
    const base = { paidAt, creditsLeft: null, reportsOpened: 2, opened: true };
    expect(refundableKrw(plan, base, after(5))).toBe(Math.floor((service * 25) / 30));
    expect(refundableKrw(plan, base, after(10))).toBe(Math.floor(((service * 20) / 30) * 0.9));
    expect(refundableKrw(plan, base, after(31))).toBe(0);
  });
});
