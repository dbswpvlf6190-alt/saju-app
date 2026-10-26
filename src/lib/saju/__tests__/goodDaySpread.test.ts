import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { buildNewYearHook } from "../newYearHook";
import { getMonthPreview, getYearFlow } from "../monthPreview";

// 결제 전에 무료로 보여 주는 날짜가 사람마다 같은 날(1일·11일·21일)로 몰리면 가짜처럼 보인다(10/26 측정: 예전 방식은 1일 56%).
function people() {
  const out = [];
  for (let y = 1950; y <= 1975; y += 5)
    for (let m = 1; m <= 12; m += 2)
      for (let d = 3; d <= 28; d += 5) out.push(calculateSaju({ calendarType: "solar", gender: "female", year: y, month: m, day: d }));
  return out;
}

describe("좋은 날 고르기", () => {
  it("bestDay는 항상 goodDays 안의 날짜이고, 좋은 날이 없으면 null이다", () => {
    for (const r of people().slice(0, 40)) {
      for (const f of getYearFlow(r, 2027)) {
        if (f.goodDays.length === 0) expect(f.bestDay).toBeNull();
        else expect(f.goodDays).toContain(f.bestDay);
        expect([...f.goodDays].sort((a, b) => a - b)).toEqual(f.goodDays); // 날짜순
        expect(new Set(f.goodDays).size).toBe(f.goodDays.length);
      }
    }
  });

  it("무료 공개 날짜가 한 날짜로 몰리지 않는다(1일이 전체의 25% 미만, 서로 다른 날짜가 8가지 이상)", () => {
    const days: number[] = [];
    // 한 사람의 한 해 계산이 약 25ms라 표본을 절반으로 줄여 시간 제한 안에 끝낸다.
    for (const r of people().filter((_, i) => i % 2 === 0)) {
      const h = buildNewYearHook(r, 2027);
      if (h.freeDay) days.push(h.freeDay.day);
    }
    expect(days.length).toBeGreaterThan(50);
    const firstShare = days.filter((d) => d === 1).length / days.length;
    expect(firstShare).toBeLessThan(0.25);
    expect(new Set(days).size).toBeGreaterThanOrEqual(8);
  }, 30000);

  it("좋은 날은 같은 생일이면 언제 봐도 같다", () => {
    const r = people()[7];
    expect(getMonthPreview(r, 2027, 10)).toEqual(getMonthPreview(r, 2027, 10));
  });
});
