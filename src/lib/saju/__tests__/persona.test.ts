import { describe, expect, it } from "vitest";
import { WUXING_PERSONA } from "../persona";

describe("캐릭터 연결 문구(bridgeLine)", () => {
  it("다섯 캐릭터 모두 있고, 1장으로 이어주며, 결론(좋다/나쁘다)을 밝히지 않는다", () => {
    for (const wuxing of ["목", "화", "토", "금", "수"] as const) {
      const line = WUXING_PERSONA[wuxing].bridgeLine;
      expect(line.endsWith(" — 사용설명서 1장에서 이어서 풀어드려요.")).toBe(true);
      expect(line.length).toBeGreaterThan(30);
      expect(line).not.toMatch(/반드시|무조건|100%/);
    }
  });
});
