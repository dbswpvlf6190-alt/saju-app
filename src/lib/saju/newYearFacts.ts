import { Solar } from "lunar-typescript";
import { getYearGanzhi } from "./engine";
import { CHEONGAN_WUXING, ganZhiToKor } from "./ganzhi";
import { groupOf, type Group } from "./goodYears";
import type { Pillar, SajuResult } from "./types";

// 신년운세 v2의 "계산으로 정해지는 사실"(2026-10-22). AI가 월별 흐름을 지어내지 않도록 월별 간지와 지지의 충·합을
// 코드로 먼저 구해 프롬프트에 넘긴다(6장 리포트의 manualFacts와 같은 방식). 해석(좋다·나쁘다)은 여기서 하지 않는다.

/** 지지 육충(서로 부딪히는 짝). */
const CHUNG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};

/** 지지 육합(서로 끌어당기는 짝). */
const HAP: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};

export type BranchRelation = "충" | "합" | null;

export function branchRelation(a: string, b: string): BranchRelation {
  if (CHUNG[a] === b) return "충";
  if (HAP[a] === b) return "합";
  return null;
}

export interface PillarRelation {
  /** 비교한 내 사주의 자리 */
  pillar: "년지" | "월지" | "일지" | "시지";
  relation: "충" | "합";
}

export interface NewYearMonthFact {
  /** 양력 월(1~12) */
  month: number;
  ganzhiKor: string;
  ganzhiHanja: string;
  /** 월간(천간)이 내 일간에게 어떤 기운인지 */
  stemGroup: Group;
  /** 월지가 내 일지와 이루는 관계. 없으면 null */
  branchVsDay: BranchRelation;
  /** 이 달에 아직 전년도 간지(입춘 전)가 적용되는지. 1월이 해당 */
  beforeIpchun: boolean;
}

export interface NewYearFacts {
  year: number;
  yearGanzhiKor: string;
  yearGanzhiHanja: string;
  /** 세운 천간이 내 일간에게 어떤 기운인지 */
  yearStemGroup: Group;
  /** 세운 지지가 내 사주 네 자리와 이루는 충·합 */
  yearBranchRelations: PillarRelation[];
  /** 입춘 날짜(YYYY-MM-DD). 사주에서 해가 바뀌는 기준 */
  ipchun: string;
  months: NewYearMonthFact[];
}

function ipchunOf(year: number): string {
  const lunar = Solar.fromYmdHms(year, 3, 1, 12, 0, 0).getLunar();
  const s = lunar.getJieQiTable()["立春"];
  return `${s.getYear()}-${String(s.getMonth()).padStart(2, "0")}-${String(s.getDay()).padStart(2, "0")}`;
}

/** 그 달 15일 정오의 월주. 절기는 대개 4~8일에 시작하니 15일은 항상 그 달 절기 이후의 월주다. */
function monthPillarOf(year: number, month: number): { gan: string; zhi: string; yearGan: string } {
  const ec = Solar.fromYmdHms(year, month, 15, 12, 0, 0).getLunar().getEightChar();
  return { gan: ec.getMonthGan(), zhi: ec.getMonthZhi(), yearGan: ec.getYearGan() };
}

export function getNewYearFacts(result: SajuResult, year: number): NewYearFacts {
  const me = result.dayPillar.ganWuxing;
  const dayZhi = result.dayPillar.zhiHanja;
  const yp: Pillar = getYearGanzhi(year);

  const seats: Array<[PillarRelation["pillar"], Pillar | null | undefined]> = [
    ["년지", result.yearPillar],
    ["월지", result.monthPillar],
    ["일지", result.dayPillar],
    ["시지", result.timePillar],
  ];
  const yearBranchRelations: PillarRelation[] = [];
  for (const [pillar, p] of seats) {
    if (!p) continue;
    const rel = branchRelation(yp.zhiHanja, p.zhiHanja);
    if (rel) yearBranchRelations.push({ pillar, relation: rel });
  }

  const yearOfJan = getYearGanzhi(year - 1).ganHanja;
  const months: NewYearMonthFact[] = [];
  for (let m = 1; m <= 12; m++) {
    const { gan, zhi, yearGan } = monthPillarOf(year, m);
    const hanja = gan + zhi;
    months.push({
      month: m,
      ganzhiHanja: hanja,
      ganzhiKor: ganZhiToKor(hanja),
      stemGroup: groupOf(me, CHEONGAN_WUXING[gan]),
      branchVsDay: branchRelation(zhi, dayZhi),
      // 그 달 15일의 연간이 전년도 천간이면 아직 입춘 전이다.
      beforeIpchun: yearGan === yearOfJan && yearGan !== yp.ganHanja,
    });
  }

  return {
    year,
    yearGanzhiKor: yp.ganZhiKor,
    yearGanzhiHanja: yp.ganZhiHanja,
    yearStemGroup: groupOf(me, CHEONGAN_WUXING[yp.ganHanja]),
    yearBranchRelations,
    ipchun: ipchunOf(year),
    months,
  };
}
