import type { WuXing } from "./ganzhi";

export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female";

/** 자시(23:00~01:00) 경계 처리 방식.
 * - "late-zi": 23:00 이후를 다음날 자시로 취급해 일주가 즉시 바뀜 (한국 만세력 다수가 채택하는 방식)
 * - "night-zi-split": 23:00~24:00은 야자시(일주는 당일 유지, 시주만 다음 간지), 00:00~01:00은 조자시
 */
export type ZiHourMode = "late-zi" | "night-zi-split";

export interface SajuInput {
  calendarType: CalendarType;
  /** calendarType이 "lunar"일 때만 사용. 윤달 여부 */
  isLeapMonth?: boolean;
  year: number;
  /** 1~12 */
  month: number;
  /** 1~31 */
  day: number;
  /** 0~23. 생시를 모르면 undefined */
  hour?: number;
  /** 0~59. 기본값 0 */
  minute?: number;
  gender: Gender;
  ziHourMode?: ZiHourMode;
}

export interface Pillar {
  /** 예: "庚午" */
  ganZhiHanja: string;
  /** 예: "경오" */
  ganZhiKor: string;
  ganHanja: string;
  zhiHanja: string;
  ganKor: string;
  zhiKor: string;
  ganWuxing: WuXing;
  zhiWuxing: WuXing;
}

export interface SajuResult {
  input: Required<Omit<SajuInput, "hour" | "minute" | "isLeapMonth">> & {
    hour: number | null;
    minute: number | null;
    isLeapMonth: boolean;
  };
  solar: { year: number; month: number; day: number; hour: number; minute: number };
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean };
  yearPillar: Pillar;
  monthPillar: Pillar;
  dayPillar: Pillar;
  /** 생시를 모르면 null */
  timePillar: Pillar | null;
  /** 8글자(시주 모르면 6글자) 중 오행별 출현 횟수 */
  wuxingCount: Record<WuXing, number>;
  /** 오행별 비율(%), 소수점 1자리 반올림, 합계는 100에 가깝도록 보정 */
  wuxingPercent: Record<WuXing, number>;
}

/**
 * SajuResult.input(정규화된 결과)을 다시 calculateSaju에 넣을 수 있는 SajuInput으로 되돌린다.
 * lunar-typescript에 의존하지 않는 순수 함수라서, 계산 로직(engine.ts)을 클라이언트 번들에서
 * 제외하고 싶은 곳(결제 화면 등)에서도 이 함수만 가볍게 가져다 쓸 수 있도록 분리해두었다.
 */
export function resultToInput(result: SajuResult): SajuInput {
  return {
    calendarType: result.input.calendarType,
    isLeapMonth: result.input.isLeapMonth,
    year: result.input.year,
    month: result.input.month,
    day: result.input.day,
    hour: result.input.hour ?? undefined,
    minute: result.input.minute ?? undefined,
    gender: result.input.gender,
    ziHourMode: result.input.ziHourMode,
  };
}
