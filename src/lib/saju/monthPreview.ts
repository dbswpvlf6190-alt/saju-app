import { Solar } from "lunar-typescript";
import { CHEONGAN_WUXING, ganZhiToKor, type WuXing } from "./ganzhi";
import type { SajuResult } from "./types";

// 신년운세 "한 달 무료 맛보기"(2026-10-23). 사장님 피드백: AI 한두 문장짜리 맛보기는 내용이 적고 막연해서 결제할
// 이유가 안 생긴다 → 계산으로 정해지는 구체적인 것(그달의 기운·나에게 좋은 날짜·사람 관계·할 일)을 보여준다.
// AI를 쓰지 않아 비용·남용 걱정이 없고, 같은 생일이면 언제 봐도 같은 답이 나온다.
// 규칙(전통 해석 중 하나): 그달·그날 천간이 내 일간과 어떤 관계인지(십성 계열) + 지지 충(沖)·육합(六合).
// 좋은 날 = 그날 천간이 재성·관성·인성이고 그날 지지가 내 일지와 충하지 않는 날. 단정 금지("~로 봐요").
// 유료 신년운세도 달마다 같은 계산(좋은 날 포함)을 보여줘야 맛보기보다 덜 구체적이지 않다.

type Group = "비겁" | "식상" | "재성" | "관성" | "인성";

const GEN: Record<WuXing, WuXing> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CTRL: Record<WuXing, WuXing> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

function groupOf(me: WuXing, other: WuXing): Group {
  if (me === other) return "비겁";
  if (GEN[me] === other) return "식상";
  if (CTRL[me] === other) return "재성";
  if (CTRL[other] === me) return "관성";
  return "인성";
}

const CLASH: Record<string, string> = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const HARMONY: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const GOOD_DAY_GROUPS: Group[] = ["재성", "관성", "인성"];

const MONTH_TITLE: Record<Group, string> = {
  재성: "재물이 들어오는 달",
  관성: "자리와 신용이 쌓이는 달",
  인성: "귀인이 돕는 달",
  식상: "솜씨를 펼치는 달",
  비겁: "내 사람을 챙기는 달",
};

const MONEY: Record<Group, string> = {
  재성: "들어오는 돈이 눈에 보이는 달로 봐요. 미뤄 둔 정산이나 받을 돈을 챙기기 좋아요.",
  관성: "당장 큰돈보다 신용이 쌓이는 달이에요. 약속한 일을 지키면 다음 결실로 이어지는 흐름이에요.",
  인성: "새로 벌이기보다 문서·계약·통장을 꼼꼼히 정리해 두기 좋은 달이에요.",
  식상: "손재주와 경험을 쓰는 만큼 돈이 되는 달이에요. 작게 팔아 보거나 일을 늘려 보기 좋아요.",
  비겁: "모임·경조사로 나가는 돈이 늘기 쉬운 달이에요. 큰 지출은 아래 좋은 날로 미뤄 두세요.",
};

const PEOPLE: Record<Group, string> = {
  재성: "집안 살림을 챙기면 가족 분위기가 편안해지는 흐름이에요.",
  관성: "윗사람이나 바깥 일에서 인정받기 좋은 흐름이에요.",
  인성: "도와주려는 사람이 가까이 있는 달이에요. 혼자 고민하지 말고 먼저 물어보세요.",
  식상: "자녀나 아랫사람에게 마음을 쓰면 보람으로 돌아오는 흐름이에요.",
  비겁: "친구·형제와 힘을 모으면 든든해지는 달이에요.",
};

const ACTION: Record<Group, string> = {
  재성: "받을 돈·통장 정리",
  관성: "중요한 약속이나 서류 일",
  인성: "배움을 시작하거나 상담받기",
  식상: "새로운 일을 시작하기",
  비겁: "사람을 만나 힘을 모으기",
};

export interface MonthPreview {
  year: number;
  month: number;
  monthGanzhiKor: string; // 예: "신축"
  group: Group;
  title: string; // 예: "재물이 들어오는 달"
  goodDays: number[]; // 그달 안의 날짜(일), 최대 3개
  money: string;
  people: string;
  tip: string;
}

function eightCharOn(y: number, m: number, d: number) {
  return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
}

/** 양력 year년 month월 한 달의 맛보기. 달 이름(간지)은 그달 15일 기준(절기로 바뀌는 월주). */
export function getMonthPreview(result: SajuResult, year: number, month: number): MonthPreview {
  const me = result.dayPillar.ganWuxing;
  const myDayZhi = result.dayPillar.zhiHanja;
  const mid = eightCharOn(year, month, 15);
  const monthGan = mid.getMonthGan();
  const monthZhi = mid.getMonthZhi();
  const group = groupOf(me, CHEONGAN_WUXING[monthGan]);

  // 좋은 날: 달을 열흘씩 셋으로 나눠 각 구간에서 가장 이른 날 하나씩(한쪽에 몰리지 않게).
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const goodDays: number[] = [];
  for (const [from, to] of [[1, 10], [11, 20], [21, daysInMonth]] as const) {
    for (let d = from; d <= to; d++) {
      const ec = eightCharOn(year, month, d);
      const g = groupOf(me, CHEONGAN_WUXING[ec.getDayGan()]);
      if (GOOD_DAY_GROUPS.includes(g) && CLASH[myDayZhi] !== ec.getDayZhi()) {
        goodDays.push(d);
        break;
      }
    }
  }

  let people = PEOPLE[group];
  if (CLASH[myDayZhi] === monthZhi) {
    people = "가까운 사람과 생각이 부딪히기 쉬운 달이에요. 하고 싶은 말은 하루 묵혔다가 부드럽게 꺼내 보세요.";
  } else if (HARMONY[myDayZhi] === monthZhi) {
    people = "가족이나 오랜 인연과 마음이 잘 맞는 달이에요. 미뤄 둔 만남을 잡기 좋아요.";
  }

  const first = goodDays[0];
  const tip = first ? `${month}월 ${first}일 전후로 ${ACTION[group]}에 마음을 써 보세요.` : `${ACTION[group]}에 마음을 써 보세요.`;

  return {
    year,
    month,
    monthGanzhiKor: ganZhiToKor(monthGan + monthZhi),
    group,
    title: MONTH_TITLE[group],
    goodDays,
    money: MONEY[group],
    people,
    tip,
  };
}

// 열두 달 흐름(2026-10-23 사장님 피드백): 한 달만 보여주면 "나머지도 같은 내용 반복이겠지"로 느낀다 →
// 달마다 기운·제목이 다르다는 걸 그래프와 제목으로 보여주고, 달별 좋은 날짜·할 일은 유료로 남긴다.
const GROUP_SCORE: Record<Group, number> = { 재성: 4, 관성: 3.5, 인성: 3, 식상: 2.2, 비겁: 1.5 };

export interface MonthFlow extends MonthPreview {
  score: number; // 막대 높이용(1~4.5), 단정 표현에는 쓰지 않는다
  clash: boolean;
  harmony: boolean;
  goodDayCount: number;
}

export function getYearFlow(result: SajuResult, year: number): MonthFlow[] {
  const myDayZhi = result.dayPillar.zhiHanja;
  return Array.from({ length: 12 }, (_, i) => {
    const p = getMonthPreview(result, year, i + 1);
    const monthZhi = eightCharOn(year, i + 1, 15).getMonthZhi();
    const clash = CLASH[myDayZhi] === monthZhi;
    const harmony = HARMONY[myDayZhi] === monthZhi;
    // 같은 기운의 달끼리도 차이가 보이게, 그달 안의 '나에게 좋은 날' 수(천간 재성·관성·인성 + 일지 충 없음)를 더한다.
    const days = new Date(Date.UTC(year, i + 1, 0)).getUTCDate();
    let goodDayCount = 0;
    for (let d = 1; d <= days; d++) {
      const ec = eightCharOn(year, i + 1, d);
      if (GOOD_DAY_GROUPS.includes(groupOf(result.dayPillar.ganWuxing, CHEONGAN_WUXING[ec.getDayGan()])) && CLASH[myDayZhi] !== ec.getDayZhi()) goodDayCount++;
    }
    const score = Math.max(1, GROUP_SCORE[p.group] + (clash ? -1 : 0) + (harmony ? 0.5 : 0) + (goodDayCount - 15) * 0.12);
    return { ...p, score, clash, harmony, goodDayCount };
  });
}

/** 흐름이 가장 좋은 달 n개(점수 높은 순, 같으면 이른 달). */
export function topMonths(flow: MonthFlow[], n = 2): MonthFlow[] {
  return [...flow].sort((a, b) => b.score - a.score || a.month - b.month).slice(0, n);
}
