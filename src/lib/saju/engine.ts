import { EightChar, Lunar, LunarMonth, Solar } from "lunar-typescript";
import {
  CHEONGAN_WUXING,
  JIJI_WUXING,
  ganZhiToKor,
  ganToKor,
  zhiToKor,
  type WuXing,
} from "./ganzhi";
import type { Pillar, SajuInput, SajuResult, ZiHourMode } from "./types";

const ZI_HOUR_MODE_TO_SECT: Record<ZiHourMode, number> = {
  "late-zi": 1,
  "night-zi-split": 2,
};

export class SajuInputError extends Error {}

function validateInput(input: SajuInput): void {
  if (input.year < 1900 || input.year > 2100) {
    throw new SajuInputError("연도는 1900년부터 2100년 사이만 지원합니다.");
  }
  if (input.month < 1 || input.month > 12) {
    throw new SajuInputError("월은 1~12 사이여야 합니다.");
  }
  if (input.day < 1) {
    throw new SajuInputError("일은 1 이상이어야 합니다.");
  }
  if (input.hour !== undefined && (input.hour < 0 || input.hour > 23)) {
    throw new SajuInputError("시는 0~23 사이여야 합니다.");
  }
  if (input.minute !== undefined && (input.minute < 0 || input.minute > 59)) {
    throw new SajuInputError("분은 0~59 사이여야 합니다.");
  }
  if (input.calendarType === "solar" && input.isLeapMonth) {
    throw new SajuInputError("양력 입력에는 윤달 여부를 지정할 수 없습니다.");
  }

  // lunar-typescript는 존재하지 않는 날짜(예: 평년 2/29)를 넘겨도 조용히 그대로 저장할 뿐
  // 에러를 던지지 않으므로, 달력상 실존하는 날짜인지는 우리가 직접 검증해야 한다.
  if (input.calendarType === "solar") {
    const daysInMonth = new Date(input.year, input.month, 0).getDate();
    if (input.day > daysInMonth) {
      throw new SajuInputError(`${input.year}년 ${input.month}월은 ${daysInMonth}일까지 있습니다.`);
    }
  } else {
    const lunarMonth = input.isLeapMonth ? -input.month : input.month;
    const lunarMonthInfo = LunarMonth.fromYm(input.year, lunarMonth);
    if (!lunarMonthInfo) {
      throw new SajuInputError(
        input.isLeapMonth
          ? `${input.year}년에는 윤${input.month}월이 없습니다.`
          : `${input.year}년 ${input.month}월 정보를 찾을 수 없습니다.`,
      );
    }
    const dayCount = lunarMonthInfo.getDayCount();
    if (input.day > dayCount) {
      throw new SajuInputError(
        `${input.year}년 ${input.isLeapMonth ? "윤" : ""}${input.month}월은 ${dayCount}일까지 있습니다.`,
      );
    }
  }
}

function buildPillar(ganHanja: string, zhiHanja: string): Pillar {
  const ganWuxing: WuXing = CHEONGAN_WUXING[ganHanja];
  const zhiWuxing: WuXing = JIJI_WUXING[zhiHanja];
  if (!ganWuxing || !zhiWuxing) {
    throw new Error(`알 수 없는 간지: ${ganHanja}${zhiHanja}`);
  }
  return {
    ganZhiHanja: `${ganHanja}${zhiHanja}`,
    ganZhiKor: ganZhiToKor(`${ganHanja}${zhiHanja}`),
    ganHanja,
    zhiHanja,
    ganKor: ganToKor(ganHanja),
    zhiKor: zhiToKor(zhiHanja),
    ganWuxing,
    zhiWuxing,
  };
}

function computeWuxing(pillars: Pillar[]): {
  wuxingCount: Record<WuXing, number>;
  wuxingPercent: Record<WuXing, number>;
} {
  const wuxingCount: Record<WuXing, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const pillar of pillars) {
    wuxingCount[pillar.ganWuxing] += 1;
    wuxingCount[pillar.zhiWuxing] += 1;
  }
  const total = pillars.length * 2;
  const wuxingPercent: Record<WuXing, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  (Object.keys(wuxingCount) as WuXing[]).forEach((key) => {
    wuxingPercent[key] = total === 0 ? 0 : Math.round((wuxingCount[key] / total) * 1000) / 10;
  });
  return { wuxingCount, wuxingPercent };
}

/**
 * 생년월일시/성별을 입력받아 사주팔자(년주/월주/일주/시주)와 오행 비율을 계산한다.
 * 음력 입력은 윤달을 포함해 정확히 처리하며, 절기 기준 월주 계산은 lunar-typescript에 위임한다.
 */
export function calculateSaju(input: SajuInput): SajuResult {
  validateInput(input);

  const hour = input.hour ?? 0;
  const minute = input.minute ?? 0;
  const isLeapMonth = input.isLeapMonth ?? false;
  const ziHourMode: ZiHourMode = input.ziHourMode ?? "late-zi";

  let solar: Solar;
  if (input.calendarType === "solar") {
    solar = Solar.fromYmdHms(input.year, input.month, input.day, hour, minute, 0);
  } else {
    const lunarMonth = isLeapMonth ? -input.month : input.month;
    const lunar = Lunar.fromYmdHms(input.year, lunarMonth, input.day, hour, minute, 0);
    solar = lunar.getSolar();
  }

  const lunar = solar.getLunar();
  const eightChar: EightChar = lunar.getEightChar();
  eightChar.setSect(ZI_HOUR_MODE_TO_SECT[ziHourMode]);

  const yearPillar = buildPillar(eightChar.getYearGan(), eightChar.getYearZhi());
  const monthPillar = buildPillar(eightChar.getMonthGan(), eightChar.getMonthZhi());
  const dayPillar = buildPillar(eightChar.getDayGan(), eightChar.getDayZhi());
  const timePillar =
    input.hour === undefined ? null : buildPillar(eightChar.getTimeGan(), eightChar.getTimeZhi());

  const pillarsForWuxing = timePillar
    ? [yearPillar, monthPillar, dayPillar, timePillar]
    : [yearPillar, monthPillar, dayPillar];
  const { wuxingCount, wuxingPercent } = computeWuxing(pillarsForWuxing);

  return {
    input: {
      calendarType: input.calendarType,
      isLeapMonth,
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour ?? null,
      minute: input.hour === undefined ? null : minute,
      gender: input.gender,
      ziHourMode,
    },
    solar: {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
      hour: solar.getHour(),
      minute: solar.getMinute(),
    },
    lunar: {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      isLeapMonth: lunar.getMonth() < 0,
    },
    yearPillar,
    monthPillar,
    dayPillar,
    timePillar,
    wuxingCount,
    wuxingPercent,
  };
}
