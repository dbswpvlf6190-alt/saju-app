import type { SajuResult } from "@/lib/saju";
import { buildNewYearHook, weekdayKor, type HookDay } from "@/lib/saju/newYearHook";

// 웹 /new-year 결제 전 미리보기와 결제 후 달 카드(2026-11-17).
// 11/12~17 웹 손님 약 42명이 생일을 넣었지만 결제 전 화면에 "○○일주" 한 줄뿐이라 결제 0건이었다.
// 토스 v11에서 효과를 본 구성(한 해 이름 → 가장 좋은 달 + 좋은 날 하루 무료 → 열두 달 그래프 → 받는 것 숫자)을 웹에도 썼다.
// 2026-11-23: 그래프·좋은 달 목록·재물 달까지 공개하자 결제 시도가 14번 → 1번으로 줄어, 좋은 날 하루만 열고 나머지는 개수만 알린다.
// 결제 전 응답에는 미리보기에 필요한 값만 담는다 — 다른 달의 재물·가족·좋은 날짜(유료 내용)는 네트워크 응답에도 넣지 않는다.
// 결제 후 달 카드는 결제 전 화면이 약속한 것(달마다 좋은 날짜·요일, 재물·가족·할 일)을 그대로 보여 준다.

export interface NewYearTeaser {
  year: number;
  ganzhiKor: string;
  label: string;
  line: string;
  /** 결제 전에 여는 단 하나의 달(가장 좋은 달). 그 달 이름·조언은 결제 뒤에 보여 준다. */
  top: { month: number };
  freeDay: HookDay | null;
  lockedInTop: number;
  /** 흐름이 좋은 달·재물이 들어오는 달은 몇 번인지만 알린다(2026-11-23: 답을 미리 다 주면 결제하지 않는다). */
  bestCount: number;
  moneyCount: number;
  totalGoodDays: number;
}

export function buildNewYearTeaser(result: SajuResult, year: number): NewYearTeaser {
  const hook = buildNewYearHook(result, year);
  return {
    year: hook.year,
    ganzhiKor: hook.ganzhiKor,
    label: hook.label,
    line: hook.line,
    top: { month: hook.top.month },
    freeDay: hook.freeDay,
    lockedInTop: hook.lockedInTop,
    bestCount: hook.best.length,
    moneyCount: hook.moneyMonths.length,
    totalGoodDays: hook.totalGoodDays,
  };
}

export interface NewYearMonthCard {
  month: number;
  title: string;
  goodDays: { day: number; weekday: string }[];
  money: string;
  people: string;
  tip: string;
  best: boolean;
}

export function buildNewYearMonthCards(result: SajuResult, year: number): NewYearMonthCard[] {
  const hook = buildNewYearHook(result, year);
  const bestSet = new Set(hook.best.map((m) => m.month));
  return hook.flow.map((f) => ({
    month: f.month,
    title: f.title,
    goodDays: f.goodDays.map((d) => ({ day: d, weekday: weekdayKor(year, f.month, d) })),
    money: f.money,
    people: f.people,
    tip: f.tip,
    best: bestSet.has(f.month),
  }));
}
