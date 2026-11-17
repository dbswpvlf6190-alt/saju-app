import type { SajuResult } from "@/lib/saju";
import { buildNewYearHook, weekdayKor, type HookDay } from "@/lib/saju/newYearHook";

// 웹 /new-year 결제 전 미리보기와 결제 후 달 카드(2026-11-17).
// 11/12~17 웹 손님 약 42명이 생일을 넣었지만 결제 전 화면에 "○○일주" 한 줄뿐이라 결제 0건이었다.
// 토스 v11에서 효과를 본 구성(한 해 이름 → 가장 좋은 달 + 좋은 날 하루 무료 → 열두 달 그래프 → 받는 것 숫자)을 웹에도 쓴다.
// 결제 전 응답에는 미리보기에 필요한 값만 담는다 — 다른 달의 재물·가족·좋은 날짜(유료 내용)는 네트워크 응답에도 넣지 않는다.
// 결제 후 달 카드는 결제 전 화면이 약속한 것(달마다 좋은 날짜·요일, 재물·가족·할 일)을 그대로 보여 준다.

export interface NewYearTeaser {
  year: number;
  ganzhiKor: string;
  label: string;
  line: string;
  top: { month: number; title: string; tip: string };
  freeDay: HookDay | null;
  lockedInTop: number;
  /** 열두 달 막대(그 사람 안에서의 상대 높이 25~100) */
  bars: { m: number; h: number }[];
  best: number[];
  moneyMonths: number[];
  totalGoodDays: number;
}

export function buildNewYearTeaser(result: SajuResult, year: number): NewYearTeaser {
  const hook = buildNewYearHook(result, year);
  const scores = hook.flow.map((f) => f.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  return {
    year: hook.year,
    ganzhiKor: hook.ganzhiKor,
    label: hook.label,
    line: hook.line,
    top: { month: hook.top.month, title: hook.top.title, tip: hook.top.tip },
    freeDay: hook.freeDay,
    lockedInTop: hook.lockedInTop,
    bars: hook.flow.map((f) => ({ m: f.month, h: Math.round(hi === lo ? 70 : 25 + (75 * (f.score - lo)) / (hi - lo)) })),
    best: hook.best.map((m) => m.month),
    moneyMonths: hook.moneyMonths,
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
