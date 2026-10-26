import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { branchRelation, getNewYearFacts } from "../newYearFacts";

describe("branchRelation", () => {
  it("육충·육합을 구분한다", () => {
    expect(branchRelation("未", "丑")).toBe("충");
    expect(branchRelation("未", "午")).toBe("합");
    expect(branchRelation("未", "子")).toBeNull();
  });
});

describe("getNewYearFacts(2027)", () => {
  const r = calculateSaju({ calendarType: "solar", gender: "female", year: 1994, month: 5, day: 27 }); // 계축일

  it("2027은 정미년이고 입춘은 2월 4일경이다", () => {
    const f = getNewYearFacts(r, 2027);
    expect(f.yearGanzhiHanja).toBe("丁未");
    expect(f.ipchun.startsWith("2027-02-0")).toBe(true);
  });

  it("월별 간지는 절기 기준이다(1월 辛丑, 2월 壬寅 … 12월 壬子)", () => {
    const f = getNewYearFacts(r, 2027);
    expect(f.months.map((m) => m.ganzhiHanja)).toEqual([
      "辛丑", "壬寅", "癸卯", "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子",
    ]);
  });

  it("1월만 입춘 전(전년도 병오 기운)으로 표시한다", () => {
    const f = getNewYearFacts(r, 2027);
    expect(f.months.filter((m) => m.beforeIpchun).map((m) => m.month)).toEqual([1]);
  });

  it("계수 일간: 세운 丁(화)은 재성, 일지 丑과 세운 未는 충", () => {
    const f = getNewYearFacts(r, 2027);
    expect(r.dayPillar.zhiHanja).toBe("丑");
    expect(f.yearStemGroup).toBe("재성");
    expect(f.yearBranchRelations).toContainEqual({ pillar: "일지", relation: "충" });
  });

  it("월지가 일지와 부딪히는 달을 표시한다(일지 丑: 7월 未월은 충, 12월 子월은 합)", () => {
    const f = getNewYearFacts(r, 2027);
    const chung = f.months.filter((m) => m.branchVsDay === "충").map((m) => m.month);
    expect(chung).toEqual([7]);
    const hap = f.months.filter((m) => m.branchVsDay === "합").map((m) => m.month);
    expect(hap).toEqual([12]);
  });
});
