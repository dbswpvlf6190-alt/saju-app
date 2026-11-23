import { describe, expect, it } from "vitest";
import { calculateSaju, type SajuInput } from "@/lib/saju";
import { buildNewYearHook } from "@/lib/saju/newYearHook";
import { buildNewYearMonthCards, buildNewYearTeaser } from "../preview";

const PEOPLE: SajuInput[] = [
  { calendarType: "solar", isLeapMonth: false, year: 1963, month: 3, day: 14, hour: 9, minute: 0, gender: "female" },
  { calendarType: "solar", isLeapMonth: false, year: 1975, month: 11, day: 2, gender: "male" },
  { calendarType: "lunar", isLeapMonth: false, year: 1981, month: 7, day: 21, hour: 22, minute: 30, gender: "female" },
];

describe("buildNewYearTeaser", () => {
  for (const p of PEOPLE) {
    const result = calculateSaju(p);
    const teaser = buildNewYearTeaser(result, 2027);
    const hook = buildNewYearHook(result, 2027);

    it(`${p.year}년생: 결제 전 미리보기는 토스 카드와 같은 계산값`, () => {
      expect(teaser.label).toBe(hook.label);
      expect(teaser.top.month).toBe(hook.top.month);
      expect(teaser.freeDay).toEqual(hook.freeDay);
      expect(teaser.bestCount).toBe(hook.best.length);
      expect(teaser.moneyCount).toBe(hook.moneyMonths.length);
    });

    it(`${p.year}년생: 다른 달의 유료 내용(재물·가족·좋은 날짜)은 응답에 없다`, () => {
      const json = JSON.stringify(teaser);
      for (const f of hook.flow) {
        if (f.month === hook.top.month) continue;
        expect(json).not.toContain(f.money);
        expect(json).not.toContain(f.people);
      }
      expect(json).not.toContain("goodDays");
      // 결제 전에는 그 달 이름·조언도, 다른 좋은 달·재물 달 목록도 보내지 않는다(개수만).
      expect(json).not.toContain(hook.top.tip);
      expect(json).not.toMatch(/"best"|"moneyMonths"|"bars"/);
    });

    it(`${p.year}년생: 결제 후 달 카드는 미리보기가 약속한 좋은 날 수와 같다`, () => {
      const cards = buildNewYearMonthCards(result, 2027);
      expect(cards).toHaveLength(12);
      expect(cards.reduce((n, c) => n + c.goodDays.length, 0)).toBe(teaser.totalGoodDays);
      const top = cards.find((c) => c.month === teaser.top.month)!;
      if (teaser.freeDay) expect(top.goodDays.map((d) => d.day)).toContain(teaser.freeDay.day);
      expect(cards.filter((c) => c.best)).toHaveLength(teaser.bestCount);
      expect(cards.find((c) => c.month === teaser.top.month)?.best).toBe(true);
    });
  }
});
