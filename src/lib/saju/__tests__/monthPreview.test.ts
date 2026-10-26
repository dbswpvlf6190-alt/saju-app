import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { getMonthPreview, getYearFlow, topMonths } from "../monthPreview";

const r = calculateSaju({ calendarType: "solar", gender: "female", year: 1965, month: 3, day: 14 });

describe("getMonthPreview", () => {
  it("2027년 1월(15일 기준)은 신축월, 좋은 날은 1월 안의 날짜 최대 3개", () => {
    const p = getMonthPreview(r, 2027, 1);
    expect(p.monthGanzhiKor).toBe("신축");
    expect(p.goodDays.length).toBeGreaterThan(0);
    expect(p.goodDays.length).toBeLessThanOrEqual(3);
    expect(p.goodDays.every((d) => d >= 1 && d <= 31)).toBe(true);
  });

  it("같은 생일이면 언제 봐도 같은 답", () => {
    expect(getMonthPreview(r, 2027, 5)).toEqual(getMonthPreview(r, 2027, 5));
  });
});

describe("getYearFlow", () => {
  it("열두 달 모두 있고 달마다 제목이 한 가지로만 반복되지 않는다", () => {
    const flow = getYearFlow(r, 2027);
    expect(flow.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(new Set(flow.map((m) => m.title)).size).toBeGreaterThan(2);
    expect(topMonths(flow, 2)).toHaveLength(2);
  });
});
