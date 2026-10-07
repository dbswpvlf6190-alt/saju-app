import { describe, expect, it } from "vitest";
import { focusBannerParts } from "../focusCopy";

const text = (p: { head: string; label: string; tail: string }) => p.head + p.label + p.tail;

describe("입력 화면 배너 문구", () => {
  it("6장 방식: 어느 장에서 풀어주는지 말한다(미리보기를 먼저 보여준다고 약속하지 않는다)", () => {
    expect(text(focusBannerParts("wealth", "재물운", true))).toBe("🔮 재물운은 풀이 후 '일과 돈에서의 나' 장에서 풀어드려요");
    expect(text(focusBannerParts("love", "연애운", true))).toBe("🔮 연애운은 풀이 후 '사람 앞에서의 나' 장에서 풀어드려요");
    expect(text(focusBannerParts("wealth", "재물운", true))).not.toContain("미리보기");
  });

  it("긴급 롤백(옛 방식): 미리보기가 맨 앞에 나오는 방식에 맞는 문구", () => {
    expect(text(focusBannerParts("wealth", "재물운", false))).toBe("🔮 풀이가 끝나면 재물운 미리보기를 가장 먼저 보여드릴게요");
  });
});
