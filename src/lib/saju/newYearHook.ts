import { currentYearKst, getYearTheme } from "./goodYears";
import { getYearFlow, topMonths, type MonthFlow } from "./monthPreview";
import type { SajuResult } from "./types";

// 토스 v11 신년운세 카드의 "보자마자 내 이야기"를 만드는 계산(2026-10-26). 화면(React)과 분리해 테스트한다.
// 원칙: 전부 계산값(AI·서버 없음)이라 같은 생일이면 언제 봐도 같은 답이고, 금지(겁주기·건강·단정·가짜 마감)는 문구에도 쓰지 않는다.
// 손님은 50대 이상 77%·여성 65%(콘솔 10/23): 익숙한 말, 존댓말, 결제를 망설이는 이유(믿음·내용을 미리 못 봄)를 풀어 주는 구성.

type GroupName = "비겁" | "식상" | "재성" | "관성" | "인성";

/** 한 해 이름 — 토스 손님에게 익숙한 말. goodYears.getYearTheme의 라벨보다 쉬운 표현. */
export const SENIOR_YEAR_THEME: Record<GroupName, { label: string; line: string }> = {
  재성: { label: "재물이 붙는 해", line: "애쓴 만큼 재물과 결실이 따라오는 흐름으로 봐요." },
  관성: { label: "자리와 명예가 서는 해", line: "맡은 자리가 든든해지고 좋은 인연이 닿는 흐름으로 봐요." },
  인성: { label: "귀인이 돕는 해", line: "도와주는 사람이 곁에 생기고 마음이 편안해지는 흐름으로 봐요." },
  식상: { label: "재주가 빛나는 해", line: "하고 싶던 일을 펼치고, 솜씨를 알아봐 주는 흐름으로 봐요." },
  비겁: { label: "내 힘으로 일어서는 해", line: "스스로 판을 짜고 내 편이 늘어나는 흐름으로 봐요." },
};

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 양력 날짜의 요일(한글 한 글자). 서버·기기 시간대와 무관하게 같은 값. */
export function weekdayKor(year: number, month: number, day: number): string {
  return WEEKDAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export interface HookDay {
  month: number;
  day: number;
  weekday: string;
}

export interface NewYearHook {
  year: number;
  ganzhiKor: string;
  group: GroupName;
  label: string; // 한 해 이름 (예: "재물이 붙는 해")
  line: string;
  flow: MonthFlow[]; // 열두 달
  best: MonthFlow[]; // 흐름이 좋은 두 달(달 순서)
  top: MonthFlow; // 가장 좋은 한 달
  /** 가장 좋은 달의 가장 좋은 날(bestDay) — 결제 전에 실제로 알려 주는 날짜(없을 수 있음) */
  freeDay: HookDay | null;
  /** 가장 좋은 달의 나머지 좋은 날(잠금 개수 표시용) */
  lockedInTop: number;
  /** 열두 달 전체의 좋은 날 수(달마다 최대 3일) — "내게 좋은 날 N일"로 받는 것을 숫자로 보여 준다 */
  totalGoodDays: number;
  /** 재물이 들어오는 달(해당 기운인 달). 비어 있을 수 있다 */
  moneyMonths: number[];
}

export function buildNewYearHook(result: SajuResult, year: number = currentYearKst() + 1): NewYearHook {
  const theme = getYearTheme(result, year);
  const words = SENIOR_YEAR_THEME[theme.group];
  const flow = getYearFlow(result, year);
  const top = topMonths(flow, 1)[0];
  const best = topMonths(flow, 2).sort((a, b) => a.month - b.month);
  // 결제 전에 알려 주는 날짜는 그 달 좋은 날 중 점수가 가장 높은 하루(monthPreview.bestDay) — 날짜가 사람마다 달라 보이게.
  const firstDay = top.bestDay;
  const freeDay = firstDay ? { month: top.month, day: firstDay, weekday: weekdayKor(year, top.month, firstDay) } : null;
  return {
    year,
    ganzhiKor: theme.ganzhiKor,
    group: theme.group,
    label: words.label,
    line: words.line,
    flow,
    best,
    top,
    freeDay,
    lockedInTop: Math.max(0, top.goodDays.length - (firstDay ? 1 : 0)),
    totalGoodDays: flow.reduce((n, m) => n + m.goodDays.length, 0),
    moneyMonths: flow.filter((m) => m.group === "재성").map((m) => m.month),
  };
}

/** 달 이름 목록을 "3월 · 10월" 꼴로. */
export function monthList(months: number[]): string {
  return months.map((m) => `${m}월`).join(" · ");
}

/** "10월 14일(수)" 꼴. */
export function formatDay(d: HookDay): string {
  return `${d.month}월 ${d.day}일(${d.weekday})`;
}

/** 하루 가격 문구. 365일로 나눠 반올림 — 가격이 바뀌어도 맞게 계산한다. */
export function perDayLabel(priceKrw: number): string {
  return `하루 약 ${Math.max(1, Math.round(priceKrw / 365))}원꼴`;
}
