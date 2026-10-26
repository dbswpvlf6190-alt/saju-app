import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { SENIOR_YEAR_THEME, buildNewYearHook, formatDay, monthList, perDayLabel, weekdayKor } from "../newYearHook";

const SAMPLES = [
  { gender: "female", year: 1965, month: 3, day: 14 },
  { gender: "female", year: 1994, month: 5, day: 27 },
  { gender: "male", year: 1958, month: 11, day: 2, hour: 7 },
  { gender: "female", year: 1972, month: 8, day: 30, hour: 14 },
  { gender: "male", year: 1960, month: 1, day: 5 },
] as const;

const calc = (s: (typeof SAMPLES)[number]) => calculateSaju({ calendarType: "solar", ...s });

describe("weekdayKor", () => {
  it("알려진 날짜의 요일: 2027-01-01은 금요일, 2027-10-14는 목요일", () => {
    expect(weekdayKor(2027, 1, 1)).toBe("금");
    expect(weekdayKor(2027, 10, 14)).toBe("목");
    expect(weekdayKor(2027, 2, 6)).toBe("토"); // 2027 설날
  });
});

describe("buildNewYearHook(2027)", () => {
  it.each(SAMPLES)("%o: 열두 달·가장 좋은 달·날짜가 서로 맞는다", (s) => {
    const h = buildNewYearHook(calc(s), 2027);
    expect(h.year).toBe(2027);
    expect(h.ganzhiKor).toBe("정미");
    expect(h.flow).toHaveLength(12);
    // 가장 좋은 달은 그래프의 최고점이고, best 두 달 안에 들어 있다
    const maxScore = Math.max(...h.flow.map((m) => m.score));
    expect(h.top.score).toBe(maxScore);
    expect(h.best.map((m) => m.month)).toContain(h.top.month);
    expect(h.best).toHaveLength(2);
    expect(h.best[0].month).toBeLessThan(h.best[1].month);
    // 무료로 알려 주는 날짜는 그 달의 실제 좋은 날 중 가장 좋은 날(bestDay)이고, 달력에 있는 날짜다
    if (h.freeDay) {
      expect(h.freeDay.month).toBe(h.top.month);
      expect(h.freeDay.day).toBe(h.top.bestDay);
      expect(h.top.goodDays).toContain(h.freeDay.day);
      expect(h.freeDay.day).toBeGreaterThanOrEqual(1);
      expect(h.freeDay.day).toBeLessThanOrEqual(new Date(Date.UTC(2027, h.freeDay.month, 0)).getUTCDate());
      expect(h.lockedInTop).toBe(h.top.goodDays.length - 1);
    }
    // 열두 달 좋은 날 수는 달마다 0~3의 합
    expect(h.totalGoodDays).toBe(h.flow.reduce((n, m) => n + m.goodDays.length, 0));
    expect(h.totalGoodDays).toBeGreaterThan(0);
    expect(h.totalGoodDays).toBeLessThanOrEqual(36);
    for (const m of h.flow) expect(m.goodDays.length).toBeLessThanOrEqual(3);
  });

  it("같은 생일이면 언제 봐도 같은 결과(결정적)", () => {
    const a = buildNewYearHook(calc(SAMPLES[0]), 2027);
    const b = buildNewYearHook(calc(SAMPLES[0]), 2027);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("재물이 들어오는 달은 그 기운인 달만 담는다", () => {
    for (const s of SAMPLES) {
      const h = buildNewYearHook(calc(s), 2027);
      for (const m of h.moneyMonths) expect(h.flow[m - 1].group).toBe("재성");
    }
  });

  it("5갈래 한 해 이름 모두 문구가 있고 존댓말·단정·겁주기 표현이 없다", () => {
    for (const [group, w] of Object.entries(SENIOR_YEAR_THEME)) {
      expect(w.label.length, group).toBeGreaterThan(3);
      expect(w.line.endsWith("봐요."), group).toBe(true);
      expect(`${w.label} ${w.line}`).not.toMatch(/반드시|조심|위험|불행|나쁜|건강|병|사고|죽/);
    }
  });
});

describe("표시 문구 도우미", () => {
  it("날짜·달 목록·하루 가격", () => {
    expect(formatDay({ month: 10, day: 14, weekday: "목" })).toBe("10월 14일(목)");
    expect(monthList([3, 10])).toBe("3월 · 10월");
    expect(perDayLabel(3894)).toBe("하루 약 11원꼴");
    expect(perDayLabel(1)).toBe("하루 약 1원꼴");
  });
});
