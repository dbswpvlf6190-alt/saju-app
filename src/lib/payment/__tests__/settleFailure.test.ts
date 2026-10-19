import { describe, expect, it } from "vitest";
import { describeFailure } from "../failure";

const pay = (extra: Record<string, unknown> = {}) => ({ id: "p", status: "FAILED", amount: { total: 4900 }, ...extra });

describe("결제 실패 사유 문구", () => {
  it("카드사 오류 코드와 메시지를 보여 준다", () => {
    expect(describeFailure(pay({ failure: { pgCode: "V104", pgMessage: "NO MPI SET 미사용 설정 지불수단" } }), true)).toBe(
      "V104 NO MPI SET 미사용 설정 지불수단",
    );
  });

  it("사유가 없으면 상태를 보여 준다", () => {
    expect(describeFailure(pay(), true)).toBe("상태 FAILED");
  });

  it("금액이 다르면 불일치로 알린다", () => {
    expect(describeFailure(pay({ status: "PAID", amount: { total: 100 } }), false)).toBe("금액 불일치(결제 100원)");
  });
});
