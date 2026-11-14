import { describe, expect, it } from "vitest";
import { findBannedOutput, isCrisisQuestion } from "../safety";

describe("findBannedOutput", () => {
  it("거절하는 문장 속 금지어는 문제 삼지 않는다", () => {
    expect(findBannedOutput("수명은 사주로 말씀드리지 않아요. 대신 지금 시기를 편안하게 지내는 법을 말씀드릴게요.")).toEqual([]);
    expect(findBannedOutput("그 부분은 사주로 다루지 않아요(로또 번호).")).toEqual([]);
  });

  it("거절이 아닌 문장의 금지 표현은 잡는다", () => {
    expect(findBannedOutput("올해는 반드시 돈이 들어와요.").length).toBeGreaterThan(0);
    expect(findBannedOutput("수명은 말씀드리지 않아요.\n그래도 100% 좋은 해예요.").length).toBeGreaterThan(0);
  });
});

describe("isCrisisQuestion", () => {
  it("극단 선택 신호를 알아본다", () => {
    expect(isCrisisQuestion("요즘 너무 우울하고 살기 싫어요")).toBe(true);
    expect(isCrisisQuestion("이사는 언제 하는 게 좋아요?")).toBe(false);
  });
});
