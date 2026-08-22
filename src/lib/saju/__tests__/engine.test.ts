import { describe, expect, it } from "vitest";
import { calculateSaju, SajuInputError } from "../engine";

const GANJI_60 = [
  "갑자", "을축", "병인", "정묘", "무진", "기사", "경오", "신미", "임신", "계유",
  "갑술", "을해", "병자", "정축", "무인", "기묘", "경진", "신사", "임오", "계미",
  "갑신", "을유", "병술", "정해", "무자", "기축", "경인", "신묘", "임진", "계사",
  "갑오", "을미", "병신", "정유", "무술", "기해", "경자", "신축", "임인", "계묘",
  "갑진", "을사", "병오", "정미", "무신", "기유", "경술", "신해", "임자", "계축",
  "갑인", "을묘", "병진", "정사", "무오", "기미", "경신", "신유", "임술", "계해",
];

describe("calculateSaju - 양력/음력 변환 정확성 (외부 출처 대조)", () => {
  it("2023년 음력 윤2월 1일 = 양력 2023-03-22 (뉴스 보도 대조)", () => {
    const result = calculateSaju({
      calendarType: "lunar",
      year: 2023,
      month: 2,
      day: 1,
      isLeapMonth: true,
      gender: "male",
    });
    expect(result.solar).toMatchObject({ year: 2023, month: 3, day: 22 });
    expect(result.lunar).toMatchObject({ year: 2023, month: 2, day: 1, isLeapMonth: true });
  });

  it("양력 2025-05-01 = 음력 4월 4일 (뉴스경남 보도 대조)", () => {
    const result = calculateSaju({
      calendarType: "solar",
      year: 2025,
      month: 5,
      day: 1,
      gender: "female",
    });
    expect(result.lunar).toMatchObject({ year: 2025, month: 4, day: 4, isLeapMonth: false });
  });

  it("평달(윤달 아님) 입력은 isLeapMonth=false로 정상 변환된다", () => {
    const result = calculateSaju({
      calendarType: "lunar",
      year: 2023,
      month: 2,
      day: 1,
      isLeapMonth: false,
      gender: "male",
    });
    // 평달 2월 1일은 윤달 2월 1일(3/22)과 달라야 한다
    expect(result.solar).not.toMatchObject({ year: 2023, month: 3, day: 22 });
    expect(result.lunar.isLeapMonth).toBe(false);
  });
});

describe("calculateSaju - 윤년 처리", () => {
  it("윤년 2월 29일(2024년 양력)을 정상 처리한다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      year: 2024,
      month: 2,
      day: 29,
      gender: "male",
    });
    expect(result.solar).toMatchObject({ year: 2024, month: 2, day: 29 });
  });

  it("평년 2월 29일(2023년)은 존재하지 않는 날짜이므로 SajuInputError를 던진다", () => {
    expect(() =>
      calculateSaju({ calendarType: "solar", year: 2023, month: 2, day: 29, gender: "male" }),
    ).toThrow(SajuInputError);
  });
});

describe("calculateSaju - 존재하지 않는 음력 날짜 검증", () => {
  it("윤달이 없는 해에 윤달을 지정하면 에러를 던진다 (2024년은 윤달 없음)", () => {
    expect(() =>
      calculateSaju({
        calendarType: "lunar",
        year: 2024,
        month: 2,
        day: 1,
        isLeapMonth: true,
        gender: "male",
      }),
    ).toThrow(SajuInputError);
  });

  it("작은달(29일까지)에 30일을 지정하면 에러를 던진다", () => {
    // 2023년 윤2월은 29일까지만 존재(소월)
    expect(() =>
      calculateSaju({
        calendarType: "lunar",
        year: 2023,
        month: 2,
        day: 30,
        isLeapMonth: true,
        gender: "male",
      }),
    ).toThrow(SajuInputError);
  });
});

describe("calculateSaju - 60갑자 순환 일관성", () => {
  it("연속된 이틀의 일주는 60갑자 순서상 정확히 한 칸 차이여야 한다", () => {
    const day1 = calculateSaju({ calendarType: "solar", year: 2024, month: 6, day: 10, gender: "male" });
    const day2 = calculateSaju({ calendarType: "solar", year: 2024, month: 6, day: 11, gender: "male" });
    const idx1 = GANJI_60.indexOf(day1.dayPillar.ganZhiKor);
    const idx2 = GANJI_60.indexOf(day2.dayPillar.ganZhiKor);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBe((idx1 + 1) % 60);
  });

  it("연주 60갑자는 60년 주기로 동일하게 반복된다(입춘 이후 날짜 기준)", () => {
    const y1 = calculateSaju({ calendarType: "solar", year: 1990, month: 6, day: 15, gender: "male" });
    const y2 = calculateSaju({ calendarType: "solar", year: 2050, month: 6, day: 15, gender: "male" });
    expect(y1.yearPillar.ganZhiKor).toBe(y2.yearPillar.ganZhiKor);
  });
});

describe("calculateSaju - 입춘 기준 연주 계산 (음력설과 다름)", () => {
  it("입춘(양력 2/4 전후) 이전 날짜는 명목상 새해가 시작돼도 연주가 전년도로 유지된다", () => {
    // 2024년 입춘은 2/4. 2/3은 입춘 이전이므로 연주는 계묘년(2023)이어야 한다.
    const beforeLiChun = calculateSaju({ calendarType: "solar", year: 2024, month: 2, day: 3, gender: "male" });
    const afterLiChun = calculateSaju({ calendarType: "solar", year: 2024, month: 2, day: 5, gender: "male" });
    expect(beforeLiChun.yearPillar.ganZhiKor).not.toBe(afterLiChun.yearPillar.ganZhiKor);
  });
});

describe("calculateSaju - 자시(子時) 경계 처리", () => {
  const base = { calendarType: "solar" as const, year: 2024, month: 6, day: 10, gender: "male" as const };

  it("late-zi 모드: 23시는 이미 다음날로 취급되어 일주가 바뀐다", () => {
    const before = calculateSaju({ ...base, hour: 22, minute: 30, ziHourMode: "late-zi" });
    const after = calculateSaju({ ...base, hour: 23, minute: 30, ziHourMode: "late-zi" });
    expect(after.dayPillar.ganZhiKor).not.toBe(before.dayPillar.ganZhiKor);
  });

  it("night-zi-split 모드: 23시는 아직 당일 일주를 유지한다", () => {
    const before = calculateSaju({ ...base, hour: 22, minute: 30, ziHourMode: "night-zi-split" });
    const after = calculateSaju({ ...base, hour: 23, minute: 30, ziHourMode: "night-zi-split" });
    expect(after.dayPillar.ganZhiKor).toBe(before.dayPillar.ganZhiKor);
  });

  it("두 모드 모두 자정(00:30)에는 이미 다음날 일주를 갖는다", () => {
    const lateZi = calculateSaju({ ...base, hour: 0, minute: 30, ziHourMode: "late-zi" });
    const splitZi = calculateSaju({ ...base, hour: 0, minute: 30, ziHourMode: "night-zi-split" });
    expect(lateZi.dayPillar.ganZhiKor).toBe(splitZi.dayPillar.ganZhiKor);
  });
});

describe("calculateSaju - 생시 모름 처리", () => {
  it("hour를 지정하지 않으면 시주는 null이고 오행은 6글자 기준으로 계산된다", () => {
    const result = calculateSaju({ calendarType: "solar", year: 1990, month: 5, day: 15, gender: "female" });
    expect(result.timePillar).toBeNull();
    expect(result.input.hour).toBeNull();
    const total = Object.values(result.wuxingCount).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });

  it("hour를 지정하면 시주가 채워지고 오행은 8글자 기준으로 계산된다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      gender: "female",
    });
    expect(result.timePillar).not.toBeNull();
    const total = Object.values(result.wuxingCount).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });
});

describe("calculateSaju - 오행 비율 계산", () => {
  it("오행 비율의 합은 항상 100에 근접한다(반올림 오차 허용)", () => {
    const result = calculateSaju({
      calendarType: "solar",
      year: 2000,
      month: 1,
      day: 1,
      hour: 10,
      gender: "male",
    });
    const sum = Object.values(result.wuxingPercent).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(99.5);
    expect(sum).toBeLessThanOrEqual(100.5);
  });

  it("각 오행 카운트는 음수가 될 수 없고 목화토금수 5개 키를 모두 포함한다", () => {
    const result = calculateSaju({ calendarType: "solar", year: 2010, month: 8, day: 20, hour: 3, gender: "male" });
    expect(Object.keys(result.wuxingCount).sort()).toEqual(["금", "목", "수", "토", "화"].sort());
    Object.values(result.wuxingCount).forEach((count) => expect(count).toBeGreaterThanOrEqual(0));
  });
});

describe("calculateSaju - 입력 검증", () => {
  it("연도 범위를 벗어나면 SajuInputError를 던진다", () => {
    expect(() =>
      calculateSaju({ calendarType: "solar", year: 1800, month: 1, day: 1, gender: "male" }),
    ).toThrow(SajuInputError);
  });

  it("월이 0이거나 13 이상이면 에러를 던진다", () => {
    expect(() =>
      calculateSaju({ calendarType: "solar", year: 2000, month: 0, day: 1, gender: "male" }),
    ).toThrow(SajuInputError);
    expect(() =>
      calculateSaju({ calendarType: "solar", year: 2000, month: 13, day: 1, gender: "male" }),
    ).toThrow(SajuInputError);
  });

  it("시(hour)가 24 이상이면 에러를 던진다", () => {
    expect(() =>
      calculateSaju({ calendarType: "solar", year: 2000, month: 1, day: 1, hour: 24, gender: "male" }),
    ).toThrow(SajuInputError);
  });

  it("양력 입력에 윤달 플래그를 지정하면 에러를 던진다", () => {
    expect(() =>
      calculateSaju({
        calendarType: "solar",
        year: 2000,
        month: 1,
        day: 1,
        isLeapMonth: true,
        gender: "male",
      }),
    ).toThrow(SajuInputError);
  });
});

describe("calculateSaju - 결과 데이터 구조", () => {
  it("네 기둥 모두 한자/한글/오행 필드를 포함한다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      year: 1995,
      month: 12,
      day: 25,
      hour: 9,
      gender: "female",
    });
    for (const pillar of [result.yearPillar, result.monthPillar, result.dayPillar, result.timePillar]) {
      expect(pillar).not.toBeNull();
      expect(pillar!.ganZhiHanja).toHaveLength(2);
      expect(pillar!.ganZhiKor).toHaveLength(2);
      expect(["목", "화", "토", "금", "수"]).toContain(pillar!.ganWuxing);
      expect(["목", "화", "토", "금", "수"]).toContain(pillar!.zhiWuxing);
    }
  });
});
