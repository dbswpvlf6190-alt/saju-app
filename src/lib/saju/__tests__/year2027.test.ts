import { describe, expect, it } from "vitest";
import { BIRTH_YEARS, birthYearInfo, birthYearsOf, isSamjae2027, monthFlows, stemNote, yearRelationLabel, yearTheme } from "../year2027";
import { TTI, TTI_BY_SLUG } from "../ttiCompat";

describe("2027 정미년 띠별 운세", () => {
  it("출생연도 → 간지·띠를 맞게 계산한다", () => {
    expect(birthYearInfo(1963)).toMatchObject({ ganzhiKor: "계묘", ganzhiHanja: "癸卯", age2027: 64 });
    expect(birthYearInfo(1963).tti.animal).toBe("토끼");
    expect(birthYearInfo(1967).ganzhiHanja).toBe("丁未");
    expect(birthYearInfo(1984).ganzhiHanja).toBe("甲子");
    expect(birthYearInfo(2009).tti.animal).toBe("소");
    expect(birthYearInfo(1940).ganzhiHanja).toBe("庚辰");
  });

  it("2027년 날삼재는 돼지·토끼·양띠뿐이다", () => {
    const samjae = TTI.filter((t) => isSamjae2027(t.branch)).map((t) => t.animal);
    expect(samjae.sort()).toEqual(["돼지", "양", "토끼"].sort());
  });

  it("띠 관계 요약이 명리 관계와 맞다", () => {
    expect(yearRelationLabel(TTI_BY_SLUG.mal)).toBe("육합");
    expect(yearRelationLabel(TTI_BY_SLUG.so)).toBe("충·형");
    expect(yearRelationLabel(TTI_BY_SLUG.jwi)).toBe("원진");
    expect(yearRelationLabel(TTI_BY_SLUG.tokki)).toBe("삼합·날삼재");
    expect(yearRelationLabel(TTI_BY_SLUG.yang)).toBe("내 띠의 해·날삼재");
    expect(yearRelationLabel(TTI_BY_SLUG.gae)).toBe("형·파");
    expect(yearRelationLabel(TTI_BY_SLUG.horangi)).toBe("무난");
  });

  it("월별 흐름: 말띠는 7월(未)이 육합으로 좋은 달, 1월(丑)은 원진·해로 조심", () => {
    const m = monthFlows("午");
    expect(m).toHaveLength(12);
    expect(m.find((x) => x.month === 7)!.tone).toBe("good");
    expect(m.find((x) => x.month === 12)!.tone).toBe("care"); // 子午 충
    expect(m.find((x) => x.month === 6)!.tone).toBe("mine");
  });

  it("모든 띠에 한 해 풀이가 있고, 천간 10개 모두 풀이가 있다", () => {
    for (const t of TTI) expect(yearTheme(t).summary.length).toBeGreaterThan(20);
    for (const s of ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]) expect(stemNote(s).body.length).toBeGreaterThan(20);
  });

  it("페이지 범위 1940~2009년생 70개, 띠마다 5~6개", () => {
    expect(BIRTH_YEARS).toHaveLength(70);
    for (const t of TTI) expect(birthYearsOf(t).length).toBeGreaterThanOrEqual(5);
  });

  it("질병·사망 같은 단정 표현을 쓰지 않는다", () => {
    const all = TTI.map((t) => JSON.stringify(yearTheme(t))).join(" ");
    for (const w of ["사망", "죽음", "암", "수술", "사고가 난다", "병에 걸"]) expect(all.includes(w)).toBe(false);
  });
});
