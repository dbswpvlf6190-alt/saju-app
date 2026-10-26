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
/** 좋은 날의 기본 점수(재물 > 신용 > 귀인). 비겁·식상은 좋은 날로 치지 않아 점수 없음. */
const GROUP_SCORE_DAY: Record<Group, number> = { 재성: 3, 관성: 2.5, 인성: 2, 식상: 0, 비겁: 0 };

const MONTH_TITLE: Record<Group, string> = {
  재성: "재물이 들어오는 달",
  관성: "자리와 신용이 쌓이는 달",
  인성: "귀인이 돕는 달",
  식상: "솜씨를 펼치는 달",
  비겁: "내 사람을 챙기는 달",
};

// 같은 기운의 달이 한 해에 여러 번 나오므로(5가지 기운, 12달) 기운마다 표현을 3가지씩 두고, 그 기운의 몇 번째 달인지에 따라 돌려 쓴다
// (getYearFlow의 variant). 달마다 똑같은 문장이 반복되면 "나머지도 같은 내용"으로 느껴 결제 이유가 사라진다(10/23 사장님 피드백, 10/26 실제 12달 결과에서 재확인).
// 금지: 겁주기·건강·단정("반드시")·가짜 마감.
const MONEY: Record<Group, string[]> = {
  재성: [
    "들어오는 돈이 눈에 보이는 달로 봐요. 미뤄 둔 정산이나 받을 돈을 챙기기 좋아요.",
    "애쓴 만큼 수입이 따라오는 달로 봐요. 가계부를 열어 새는 곳부터 살펴보세요.",
    "재물 흐름이 오르는 달이에요. 모아 둘 돈과 쓸 돈을 나눠 두면 마음이 편해요.",
  ],
  관성: [
    "당장 큰돈보다 신용이 쌓이는 달이에요. 약속한 일을 지키면 다음 결실로 이어지는 흐름이에요.",
    "믿음이 돈이 되는 달로 봐요. 갚을 것은 제때 갚고 받을 것은 정중히 챙겨 보세요.",
    "서류와 계약이 중요한 달이에요. 도장을 찍기 전에 한 번 더 읽어 보면 든든해요.",
  ],
  인성: [
    "새로 벌이기보다 문서·계약·통장을 꼼꼼히 정리해 두기 좋은 달이에요.",
    "배움에 쓰는 돈이 나중에 돌아오는 달로 봐요. 꼭 필요한 곳에 아껴 쓰면 좋아요.",
    "귀인의 조언이 돈 이야기에도 도움이 되는 달이에요. 큰 결정은 믿는 사람과 상의해 보세요.",
  ],
  식상: [
    "손재주와 경험을 쓰는 만큼 돈이 되는 달이에요. 작게 팔아 보거나 일을 늘려 보기 좋아요.",
    "내가 가진 솜씨가 수입으로 이어지는 달로 봐요. 작은 부업이나 재능 나눔을 생각해 보세요.",
    "쓰는 즐거움도 커지는 달이에요. 하고 싶은 일에 쓸 돈을 미리 정해 두면 알뜰해요.",
  ],
  비겁: [
    "모임·경조사로 나가는 돈이 늘기 쉬운 달이에요. 큰 지출은 이달의 좋은 날로 미뤄 두세요.",
    "함께 쓰는 돈이 늘어나는 달로 봐요. 모임 예산을 미리 정해 두면 부담이 줄어요.",
    "나눔이 많아지는 달이에요. 내 몫의 저축은 먼저 따로 떼어 두면 든든해요.",
  ],
};

const PEOPLE: Record<Group, string[]> = {
  재성: [
    "집안 살림을 챙기면 가족 분위기가 편안해지는 흐름이에요.",
    "가족과 함께하는 식사 한 끼가 마음을 이어 주는 달이에요.",
    "집 안을 함께 정리하면 대화가 늘어나는 흐름이에요.",
  ],
  관성: [
    "윗사람이나 바깥 일에서 인정받기 좋은 흐름이에요.",
    "맡은 일을 성실히 하면 주변의 믿음이 쌓이는 달이에요.",
    "어른께 안부를 전하면 좋은 말씀을 들을 수 있는 흐름이에요.",
  ],
  인성: [
    "도와주려는 사람이 가까이 있는 달이에요. 혼자 고민하지 말고 먼저 물어보세요.",
    "오래 알던 분의 조언이 힘이 되는 달이에요. 연락이 뜸했던 분께 먼저 안부를 전해 보세요.",
    "배우고 싶은 것을 이야기하면 길을 알려 주는 사람이 나타나는 흐름이에요.",
  ],
  식상: [
    "자녀나 아랫사람에게 마음을 쓰면 보람으로 돌아오는 흐름이에요.",
    "내 이야기를 편하게 꺼내면 마음이 통하는 달이에요. 칭찬 한마디가 큰 힘이 돼요.",
    "가까운 사람과 취미를 함께하면 정이 깊어지는 흐름이에요.",
  ],
  비겁: [
    "친구·형제와 힘을 모으면 든든해지는 달이에요.",
    "동료와 마음을 합치면 일이 수월해지는 달이에요. 도움을 청해도 괜찮아요.",
    "오랜 친구를 만나면 마음이 가벼워지는 흐름이에요. 약속을 하나 잡아 보세요.",
  ],
};

const ACTION: Record<Group, string[]> = {
  재성: ["받을 돈·통장 정리", "가계부와 지출 점검", "저축·적금 계획 세우기"],
  관성: ["중요한 약속이나 서류 일", "미뤄 둔 연락과 인사", "맡은 일 마무리하기"],
  인성: ["배움을 시작하거나 상담받기", "집 안 서류와 문서 정리", "존경하는 분께 안부 전하기"],
  식상: ["새로운 일을 시작하기", "손으로 만드는 일 해 보기", "하고 싶던 취미 시작하기"],
  비겁: ["사람을 만나 힘을 모으기", "가족·친구 모임 잡기", "함께할 계획 세우기"],
};

/** variant번째 표현(표현 수보다 크면 처음부터 다시). */
function pick<T>(list: T[], variant: number): T {
  return list[((variant % list.length) + list.length) % list.length];
}

export interface MonthPreview {
  year: number;
  month: number;
  monthGanzhiKor: string; // 예: "신축"
  group: Group;
  title: string; // 예: "재물이 들어오는 달"
  goodDays: number[]; // 그달 안의 날짜(일), 최대 3개(날짜순)
  bestDay: number | null; // goodDays 중 점수가 가장 높은 하루(결제 전 무료 공개용). goodDays가 비면 null
  money: string;
  people: string;
  tip: string;
}

function eightCharOn(y: number, m: number, d: number) {
  return Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
}

/** 양력 year년 month월 한 달의 맛보기. 달 이름(간지)은 그달 15일 기준(절기로 바뀌는 월주). */
export function getMonthPreview(result: SajuResult, year: number, month: number, variant = 0): MonthPreview {
  const me = result.dayPillar.ganWuxing;
  const myDayZhi = result.dayPillar.zhiHanja;
  const mid = eightCharOn(year, month, 15);
  const monthGan = mid.getMonthGan();
  const monthZhi = mid.getMonthZhi();
  const group = groupOf(me, CHEONGAN_WUXING[monthGan]);

  // 좋은 날: 달을 열흘씩 셋으로 나눠 각 구간에서 점수가 가장 높은 날 하나씩(한쪽에 몰리지 않게).
  // (10/26 수정) 예전엔 "가장 이른 날"이라 5가지 중 3가지가 좋은 날인 탓에 56%가 1일·11일·21일로 나와 사람마다 같은 날짜로 보였다.
  // 점수 = 그날 천간 기운(재물 > 신용 > 귀인) + 내 일지와 맞는 날(육합) 가산. 같은 점수면 구간 가운데에 가까운 날.
  // bestDay = 세 날짜 중 점수가 가장 높은 하루 — 결제 전에 무료로 알려 주는 날짜.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const goodDays: number[] = [];
  let bestDay: number | null = null;
  let bestScore = -1;
  for (const [from, to] of [[1, 10], [11, 20], [21, daysInMonth]] as const) {
    const center = (from + to) / 2;
    let pick: number | null = null;
    let pickScore = -1;
    for (let d = from; d <= to; d++) {
      const ec = eightCharOn(year, month, d);
      const g = groupOf(me, CHEONGAN_WUXING[ec.getDayGan()]);
      if (!GOOD_DAY_GROUPS.includes(g) || CLASH[myDayZhi] === ec.getDayZhi()) continue;
      const score = GROUP_SCORE_DAY[g] + (HARMONY[myDayZhi] === ec.getDayZhi() ? 1.5 : 0);
      if (score > pickScore || (score === pickScore && pick !== null && Math.abs(d - center) < Math.abs(pick - center))) {
        pick = d;
        pickScore = score;
      }
    }
    if (pick !== null) {
      goodDays.push(pick);
      if (pickScore > bestScore || (pickScore === bestScore && bestDay !== null && Math.abs(pick - 15.5) < Math.abs(bestDay - 15.5))) {
        bestScore = pickScore;
        bestDay = pick;
      }
    }
  }

  let people = pick(PEOPLE[group], variant);
  if (CLASH[myDayZhi] === monthZhi) {
    people = "가까운 사람과 생각이 부딪히기 쉬운 달이에요. 하고 싶은 말은 하루 묵혔다가 부드럽게 꺼내 보세요.";
  } else if (HARMONY[myDayZhi] === monthZhi) {
    people = "가족이나 오랜 인연과 마음이 잘 맞는 달이에요. 미뤄 둔 만남을 잡기 좋아요.";
  }

  const action = pick(ACTION[group], variant);
  const tip = bestDay ? `${month}월 ${bestDay}일 전후로 ${action}에 마음을 써 보세요.` : `${action}에 마음을 써 보세요.`;

  return {
    year,
    month,
    monthGanzhiKor: ganZhiToKor(monthGan + monthZhi),
    group,
    title: MONTH_TITLE[group],
    goodDays,
    bestDay,
    money: pick(MONEY[group], variant),
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
  // 같은 기운의 달이 여러 번 나오므로, 그 기운의 몇 번째 달인지(variant)에 따라 문구를 돌려 써서 달마다 같은 문장이 반복되지 않게 한다.
  const seen: Record<string, number> = {};
  return Array.from({ length: 12 }, (_, i) => {
    const monthGroup = groupOf(result.dayPillar.ganWuxing, CHEONGAN_WUXING[eightCharOn(year, i + 1, 15).getMonthGan()]);
    const variant = (seen[monthGroup] = (seen[monthGroup] ?? -1) + 1);
    const p = getMonthPreview(result, year, i + 1, variant);
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
