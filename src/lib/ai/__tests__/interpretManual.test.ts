import { describe, expect, it } from "vitest";
import { cleanManualText, countChars, manualProblems } from "../interpretManual";

describe("cleanManualText", () => {
  it("마크다운 기호와 장 제목 줄을 걷어낸다", () => {
    const t = cleanManualText("## 지금 시기 사용법\n\n**2026년**은 비겁의 해예요.\n- 첫째", "지금 시기 사용법");
    expect(t).not.toMatch(/[#*]/);
    expect(t.startsWith("지금 시기")).toBe(false);
    expect(t).toContain("2026년은 비겁의 해예요.");
  });
});

describe("manualProblems", () => {
  it("금지어(단정·건강)를 잡는다", () => {
    const body = "가".repeat(1000);
    expect(manualProblems(body + " 반드시 잘돼요", 900).join()).toContain("금지어");
    expect(manualProblems(body + " 소화기를 챙기세요", 900).join()).toContain("금지어");
  });

  it("목표의 65% 미만이면 분량 부족, 이상이면 통과", () => {
    expect(manualProblems("가".repeat(500), 900).join()).toContain("분량 부족");
    expect(manualProblems("가".repeat(600), 900)).toEqual([]);
  });

  it("글자 수는 공백을 빼고 센다", () => {
    expect(countChars("가 나\n다")).toBe(3);
  });
});
