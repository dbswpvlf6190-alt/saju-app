import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { getGoodYears } from "../goodYears";

// Threads 풀이 답글(scripts/threads_ilgan.mjs + pick_timing '좋은 해')과 같은 규칙인지 고정한다.
describe("getGoodYears", () => {
  it("계수 일간(1994-05-27): 2026·2027 재성(돈·성과), 2028 관성", () => {
    const r = calculateSaju({ calendarType: "solar", gender: "female", year: 1994, month: 5, day: 27 });
    expect(r.dayPillar.ganKor).toBe("계");
    const ys = getGoodYears(r, 2026, 5, 3);
    expect(ys.map((y) => [y.year, y.label])).toEqual([
      [2026, "돈·성과의 해"],
      [2027, "돈·성과의 해"],
      [2028, "기회·자리의 해"],
    ]);
  });

  it("비겁·식상 해는 건너뛴다(갑목 일간: 2026 병오=식상 제외)", () => {
    const r = calculateSaju({ calendarType: "solar", gender: "female", year: 1995, month: 7, day: 12, hour: 14 });
    expect(r.dayPillar.ganKor).toBe("갑");
    const ys = getGoodYears(r, 2026, 5, 5);
    expect(ys.every((y) => y.year !== 2026 && y.year !== 2027)).toBe(true);
    expect(ys[0]).toMatchObject({ year: 2028, label: "돈·성과의 해" });
  });
});
