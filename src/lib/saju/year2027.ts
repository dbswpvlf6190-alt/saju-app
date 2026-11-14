/**
 * 2027 정미년(丁未年) 띠별·출생연도별 운세 페이지(/2027) 데이터.
 *
 * 검색 입구용 무료 콘텐츠라 "태어난 해 두 글자(천간·지지)"만으로 계산한다. 사주 여덟 글자 전체가 아니므로
 * 페이지마다 "생일을 넣으면 내 사주 전체로 본다"는 안내와 함께 /new-year로 이어 준다.
 * 같은 입력이면 항상 같은 결과(결정적) — 무작위 문구를 쓰지 않는다.
 * 질병·사고·수명 같은 단정 예언은 쓰지 않는다(토스·광고 정책, 사장님 원칙).
 */
import { TTI, TTI_BY_SLUG, branchRelationKinds, ttiByBranch, type RelationKind, type Tti } from "./ttiCompat";

export const Y2027 = {
  year: 2027,
  gan: "丁",
  zhi: "未",
  ganzhiKor: "정미",
  ganzhiHanja: "丁未",
  animal: "양",
  color: "붉은",
  ipchun: "2월 4일",
} as const;

export const BIRTH_YEAR_MIN = 1940;
export const BIRTH_YEAR_MAX = 2009;
export const BIRTH_YEARS: number[] = Array.from({ length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 }, (_, i) => BIRTH_YEAR_MIN + i);

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const STEMS_KOR = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const BRANCHES_KOR = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const STEM_COLOR = ["푸른", "푸른", "붉은", "붉은", "황금", "황금", "흰", "흰", "검은", "검은"] as const;

export interface BirthYearInfo {
  year: number;
  stem: string;
  stemKor: string;
  branch: string;
  ganzhiKor: string;
  ganzhiHanja: string;
  colorName: string;
  tti: Tti;
  /** 2027년 안에 맞는 만 나이 */
  age2027: number;
}

export function birthYearInfo(year: number): BirthYearInfo {
  const s = (((year - 4) % 10) + 10) % 10;
  const b = (((year - 4) % 12) + 12) % 12;
  const tti = ttiByBranch(BRANCHES[b])!;
  return {
    year,
    stem: STEMS[s],
    stemKor: STEMS_KOR[s],
    branch: BRANCHES[b],
    ganzhiKor: `${STEMS_KOR[s]}${BRANCHES_KOR[b]}`,
    ganzhiHanja: `${STEMS[s]}${BRANCHES[b]}`,
    colorName: STEM_COLOR[s],
    tti,
    age2027: Y2027.year - year,
  };
}

/** 그 띠로 태어난 해들(페이지 범위 안) */
export function birthYearsOf(tti: Tti): number[] {
  return BIRTH_YEARS.filter((y) => birthYearInfo(y).tti === tti);
}

// ── 삼재: 해묘미(돼지·토끼·양)는 사·오·미년. 2025 들삼재 → 2026 눌삼재 → 2027 날삼재 ──
const SAMJAE_2027 = new Set(["亥", "卯", "未"]);
export function isSamjae2027(branch: string): boolean {
  return SAMJAE_2027.has(branch);
}

// ── 2027년 달별 지지(절기 기준, 입춘 2/4 전 1월은 아직 병오년 축월) ──
export const MONTH_BRANCH_2027: { month: number; branch: string; note?: string }[] = [
  { month: 1, branch: "丑", note: "입춘 전이라 아직 2026년(병오년) 기운" },
  { month: 2, branch: "寅", note: "입춘(2/4)부터 정미년 시작" },
  { month: 3, branch: "卯" },
  { month: 4, branch: "辰" },
  { month: 5, branch: "巳" },
  { month: 6, branch: "午" },
  { month: 7, branch: "未" },
  { month: 8, branch: "申" },
  { month: 9, branch: "酉" },
  { month: 10, branch: "戌" },
  { month: 11, branch: "亥" },
  { month: 12, branch: "子" },
];

export type MonthTone = "good" | "care" | "light" | "mine" | "plain";

export interface MonthFlow {
  month: number;
  branch: string;
  animal: string;
  tone: MonthTone;
  label: string;
  line: string;
  note?: string;
}

const KIND_LINE: Partial<Record<RelationKind, string>> = {
  육합: "내 띠와 짝이 맞는 달이에요. 사람을 만나고 부탁하기 좋아요.",
  삼합: "내 띠와 같은 방향으로 모이는 달이에요. 함께 일을 벌이기 좋아요.",
  충: "내 띠와 마주 보는 달이에요. 이사·계약 같은 큰 결정은 한 번 더 확인하세요.",
  원진: "서운함이 쌓이기 쉬운 달이에요. 말은 짧고 부드럽게 하세요.",
  형: "잔소리·지적이 오가기 쉬운 달이에요. 역할을 미리 나눠 두세요.",
  해: "작은 오해가 생기기 쉬운 달이에요. 중요한 얘기는 얼굴 보고 하세요.",
  파: "계획이 틀어지기 쉬운 달이에요. 약속은 한 번 더 확인하세요.",
};

export function monthFlows(branch: string): MonthFlow[] {
  return MONTH_BRANCH_2027.map(({ month, branch: mb, note }) => {
    const kinds = branchRelationKinds(branch, mb);
    const animal = ttiByBranch(mb)!.animal;
    let tone: MonthTone = "plain";
    let label = "보통";
    let line = "무리하지 않고 하던 일을 꾸준히 이어 가기 좋은 달이에요.";
    if (kinds.includes("육합") || kinds.includes("삼합")) {
      tone = "good";
      label = "좋은 달";
      line = KIND_LINE[kinds.includes("육합") ? "육합" : "삼합"]!;
    } else if (kinds.includes("충") || kinds.includes("원진")) {
      tone = "care";
      label = "조심할 달";
      line = KIND_LINE[kinds.includes("충") ? "충" : "원진"]!;
    } else if (kinds.includes("같은 띠")) {
      tone = "mine";
      label = "내 띠의 달";
      line = "내 띠와 같은 기운이 도는 달이에요. 내 페이스대로 밀고 가되 고집은 조금 내려놓으세요.";
    } else if (kinds.some((k) => k === "형" || k === "해" || k === "파")) {
      tone = "light";
      label = "가볍게 조심";
      line = KIND_LINE[kinds.find((k) => k === "형" || k === "해" || k === "파")!]!;
    }
    return { month, branch: mb, animal, tone, label, line, note };
  });
}

// ── 띠별 2027 한 해 흐름(태어난 해의 띠 글자와 未의 관계) ──
export interface YearTheme {
  headline: string;
  summary: string;
  body: string[];
  work: string;
  money: string;
  people: string;
}

const YEAR_THEME: Record<string, YearTheme> = {
  jwi: {
    headline: "말 한마디가 운을 바꾸는 해",
    summary: "쥐띠에게 2027년은 양(未)과 원진·해로 묶여 서운함과 오해가 생기기 쉬운 해로 풀이돼요. 일 자체보다 사람 사이의 온도를 챙길수록 흐름이 편해져요.",
    body: [
      "쥐띠의 자(子)와 2027년의 미(未)는 원진 관계예요. 큰 사건보다는 '그 말이 서운했다' 같은 작은 감정이 쌓이기 쉬운 흐름이에요.",
      "눈치가 빠른 쥐띠는 상대의 변화를 금방 알아차리는 만큼 혼자 해석하고 마음에 담아 두기 쉬워요. 올해는 짐작보다 직접 물어보는 쪽이 운을 지켜 줘요.",
    ],
    work: "혼자 준비하던 일을 함께하는 사람에게 미리 공유해 두면 오해 없이 진행돼요.",
    money: "가까운 사이의 돈거래·보증은 올해 특히 기록을 남기세요.",
    people: "서운한 일은 그날 짧게 말하고 넘어가는 습관이 관계를 지켜요.",
  },
  so: {
    headline: "익숙한 자리에 변화가 들어오는 해",
    summary: "소띠에게 2027년은 축(丑)과 미(未)가 마주 보는 충의 해예요. 이사·이직·역할 변화처럼 움직임이 생기기 쉬운 해로, 서두르지 않고 순서대로 정리하면 오히려 새 자리를 만드는 해가 돼요.",
    body: [
      "충은 나쁜 일이 아니라 '고여 있던 것이 움직인다'는 뜻에 가까워요. 오래 미뤄 둔 정리·변화가 자연스럽게 시작되는 흐름이에요.",
      "끈기 있는 소띠는 변화를 버티는 힘이 강해요. 다만 한꺼번에 바꾸려 하면 지치기 쉬우니, 큰 결정은 하나씩 순서를 정해 진행하세요.",
    ],
    work: "역할이나 자리 변화가 생기면 기록과 인수인계를 꼼꼼히 해 두세요.",
    money: "큰 지출·계약은 한 번 더 비교하고, 서류는 사본을 남겨 두세요.",
    people: "가족과 생활 리듬이 어긋나기 쉬우니 일정을 미리 나눠 이야기하세요.",
  },
  horangi: {
    headline: "내 속도로 밀고 가기 좋은 해",
    summary: "호랑이띠에게 2027년은 미(未)와 합이나 충으로 묶이지 않는 무난한 해예요. 띠 기운이 크게 흔들리지 않는 만큼 내가 정한 계획대로 꾸준히 밀고 가기 좋아요.",
    body: [
      "띠로 보면 크게 부딪히는 기운이 없어 외부 변수보다 내 선택이 결과를 좌우하는 해예요.",
      "추진력이 강점인 호랑이띠는 목표를 작게 쪼개 하나씩 끝내는 방식이 잘 맞아요. 시작보다 마무리에 힘을 주세요.",
    ],
    work: "새로 벌이기보다 하던 일을 마무리하고 성과로 남기기 좋은 해예요.",
    money: "고정 지출을 한 번 정리하면 연말에 남는 돈이 달라져요.",
    people: "자존심이 걸린 다툼은 하루 미뤄서 이야기하면 대부분 풀려요.",
  },
  tokki: {
    headline: "삼합의 도움과 날삼재가 함께 있는 해",
    summary: "토끼띠에게 2027년은 해묘미(亥卯未) 삼합으로 사람과 기회가 모이는 해이면서, 3년 삼재의 마지막인 '날삼재'가 끝나는 해예요. 들어오는 기회는 살리고, 큰 결정은 한 번 더 확인하는 균형이 중요해요.",
    body: [
      "삼합은 같은 방향을 보는 사람들이 모이는 기운이에요. 함께하자는 제안이나 도움의 손길이 들어오기 쉬워요.",
      "날삼재는 삼재가 '나가는' 해로, 그동안 쌓인 일을 정리하고 마무리하는 시기로 봐요. 겁먹을 필요는 없고, 무리한 확장보다 정리에 무게를 두면 좋아요.",
    ],
    work: "함께하는 제안이 들어오면 역할과 기간을 분명히 정하고 시작하세요.",
    money: "새 투자보다 이미 가진 것을 정리하고 지키는 쪽이 맞는 해예요.",
    people: "섬세한 토끼띠의 조율 능력이 빛나는 해예요. 다만 혼자 다 맞춰 주지는 마세요.",
  },
  yong: {
    headline: "큰 그림을 현실로 옮기는 해",
    summary: "용띠에게 2027년은 미(未)와 합이나 충으로 묶이지 않는 무난한 해예요. 띠 기운이 조용한 해라 크게 벌이기보다 계획을 실제 일정으로 옮기는 데 집중하면 좋아요.",
    body: [
      "띠로 보면 큰 변수가 적은 해라, 목표를 구체적인 숫자와 날짜로 바꿔 두면 한 해가 훨씬 정리돼요.",
      "포부가 큰 용띠는 계획을 여러 개 동시에 벌이기 쉬워요. 올해는 가장 중요한 하나를 먼저 끝내세요.",
    ],
    work: "리더 역할이 주어지면 일을 나눠 맡기는 연습이 성과를 키워요.",
    money: "보여 주기 위한 지출을 줄이면 목돈 만들기에 좋은 해예요.",
    people: "기대가 큰 만큼 실망도 커지기 쉬워요. 고마운 건 바로 표현하세요.",
  },
  baem: {
    headline: "조용히 실력을 다지는 해",
    summary: "뱀띠에게 2027년은 미(未)와 합이나 충으로 묶이지 않는 무난한 해예요. 2025~2026년 이어진 흐름을 차분히 다듬고, 다음 기회를 위한 실력을 쌓기 좋은 해예요.",
    body: [
      "띠 기운이 조용한 해라 겉으로 드러나는 변화보다 안에서 쌓는 준비가 중요해요.",
      "집중력이 강한 뱀띠에게 맞는 해예요. 배우고 싶던 것, 정리하고 싶던 것을 하나 정해 끝까지 해 보세요.",
    ],
    work: "자격·기술처럼 남는 공부를 시작하기 좋은 해예요.",
    money: "충동적인 지출보다 계획한 지출만 하는 습관이 잘 맞아요.",
    people: "속마음을 너무 오래 감추면 오해가 생겨요. 가까운 사람에게는 먼저 말해 주세요.",
  },
  mal: {
    headline: "짝을 만나는 육합의 해",
    summary: "말띠에게 2027년은 오(午)와 미(未)가 짝을 이루는 육합의 해예요. 2026년 내 해(병오년)의 뜨거운 흐름을 지나, 함께할 사람과 기회가 자연스럽게 붙는 해로 풀이돼요.",
    body: [
      "육합은 서로를 끌어당기는 관계예요. 협력·동업·인연처럼 '함께'가 들어가는 일에 힘이 실리기 쉬워요.",
      "활동적인 말띠는 혼자 달릴 때보다 좋은 파트너가 있을 때 속도가 붙어요. 올해는 누구와 함께할지가 성과를 좌우해요.",
    ],
    work: "협업·소개·제휴 제안을 열린 마음으로 들어 보세요.",
    money: "함께하는 일에서 수입이 생기기 쉬우니 정산 방식은 처음에 정해 두세요.",
    people: "인연이 이어지기 좋은 해예요. 가족·연인에게도 시간을 내 주세요.",
  },
  yang: {
    headline: "내 해이자 날삼재가 끝나는 해",
    summary: "양띠에게 2027년은 정미년, 바로 내 띠의 해예요. 동시에 3년 삼재의 마지막인 '날삼재'라, 그동안의 흐름을 정리하고 내 자리를 단단히 하는 해로 봐요.",
    body: [
      "자기 띠의 해는 주목받고 역할이 커지기 쉬운 해예요. 다만 같은 기운이 겹쳐 고집이 세지기 쉬우니 주변의 의견을 한 번 더 들어 보세요.",
      "날삼재는 삼재가 '나가는' 해예요. 새로 크게 벌이기보다 정리와 마무리에 힘을 두면, 2028년을 가볍게 시작할 수 있어요.",
    ],
    work: "맡은 일의 범위를 분명히 해 두면 과로를 막을 수 있어요.",
    money: "새 투자보다 빚·보험·고정비를 정리하기 좋은 해예요.",
    people: "다정한 양띠는 부탁을 거절하기 어려워해요. 올해는 내 몫부터 챙기세요.",
  },
  wonsungi: {
    headline: "새로운 시도가 잘 붙는 해",
    summary: "원숭이띠에게 2027년은 미(未)와 합이나 충으로 묶이지 않는 무난한 해예요. 띠 기운이 가벼운 만큼 배우고 시도하는 일에 부담이 적은 해예요.",
    body: [
      "큰 변수가 적은 해라 작은 실험을 여러 번 해 보기 좋아요. 맞는 것을 찾으면 하반기에 키우세요.",
      "재치 있는 원숭이띠는 시작이 빠른 만큼 금방 흥미를 잃기도 해요. 석 달 단위로 점검하면 끝까지 갈 수 있어요.",
    ],
    work: "새 기술·새 도구를 익혀 두면 다음 해의 무기가 돼요.",
    money: "작은 부수입 시도는 좋지만, 남의 말만 듣고 하는 투자는 피하세요.",
    people: "가벼운 농담이 상처가 될 수 있어요. 가까운 사이일수록 말의 온도를 챙기세요.",
  },
  dak: {
    headline: "꼼꼼함이 인정받는 해",
    summary: "닭띠에게 2027년은 미(未)와 합이나 충으로 묶이지 않는 무난한 해예요. 원칙과 꼼꼼함이 그대로 결과로 이어지기 쉬운 해예요.",
    body: [
      "띠 기운이 조용해 내가 쌓은 만큼 돌아오는 해로 볼 수 있어요. 기록과 정리를 잘하는 닭띠에게 유리해요.",
      "다만 기준이 분명한 만큼 다른 사람의 방식이 답답하게 느껴질 수 있어요. 결과가 같다면 방식은 조금 양보해 보세요.",
    ],
    work: "평가·검토·관리처럼 정확함이 필요한 일에서 인정받기 쉬워요.",
    money: "가계부·지출 정리가 그대로 저축으로 이어지는 해예요.",
    people: "정확한 말이 날카롭게 들릴 수 있어요. 칭찬을 먼저, 지적은 나중에 하세요.",
  },
  gae: {
    headline: "책임이 커지는 만큼 정리가 필요한 해",
    summary: "개띠에게 2027년은 술(戌)과 미(未)가 형·파로 묶여, 맡은 일이 늘고 계획이 중간에 바뀌기 쉬운 해로 풀이돼요. 혼자 다 짊어지지 않고 나눠 맡기면 흐름이 편해져요.",
    body: [
      "형은 서로를 다듬는 긴장, 파는 계획이 어긋나기 쉬운 기운이에요. 큰일보다는 자잘한 일정 변경이 잦을 수 있어요.",
      "책임감이 큰 개띠는 남의 몫까지 떠안기 쉬워요. 올해는 '내 일'과 '남의 일'의 선을 분명히 하는 게 운을 지켜요.",
    ],
    work: "약속과 일정은 기록하고 한 번 더 확인하세요.",
    money: "계획에 없던 지출이 생기기 쉬우니 비상금을 따로 두세요.",
    people: "옳고 그름을 따지기 전에 상대 사정을 한 번 들어 보세요.",
  },
  dwaeji: {
    headline: "삼합의 인연과 날삼재가 함께 있는 해",
    summary: "돼지띠에게 2027년은 해묘미(亥卯未) 삼합으로 도와주는 사람이 모이는 해이면서, 3년 삼재의 마지막인 '날삼재'가 끝나는 해예요. 여유로운 마음은 지키되 약속과 돈 관리는 단단히 하면 좋아요.",
    body: [
      "삼합은 같은 방향의 사람들이 모이는 기운이에요. 소개·추천으로 좋은 인연이 이어지기 쉬워요.",
      "날삼재는 삼재가 '나가는' 해로, 마무리와 정리의 시기예요. 너그러운 돼지띠는 부탁을 쉽게 들어주기 쉬우니 올해는 거절하는 연습도 필요해요.",
    ],
    work: "주변의 추천이나 소개로 들어오는 일을 눈여겨보세요.",
    money: "빌려주는 돈·보증은 올해 특히 신중하게 결정하세요.",
    people: "고마운 사람에게 먼저 연락하면 인연이 더 단단해져요.",
  },
};

export function yearTheme(tti: Tti): YearTheme {
  return YEAR_THEME[tti.slug];
}

/** 2027년 띠 관계를 한 단어로(목록·표 용) */
export function yearRelationLabel(tti: Tti): string {
  const kinds = branchRelationKinds(tti.branch, Y2027.zhi);
  const parts: string[] = [];
  if (kinds.includes("같은 띠")) parts.push("내 띠의 해");
  if (kinds.includes("육합")) parts.push("육합");
  if (kinds.includes("삼합")) parts.push("삼합");
  if (kinds.includes("충")) parts.push("충");
  if (kinds.includes("원진")) parts.push("원진");
  if (kinds.includes("형")) parts.push("형");
  if (kinds.includes("파")) parts.push("파");
  if (kinds.includes("해") && !kinds.includes("원진")) parts.push("해");
  if (isSamjae2027(tti.branch)) parts.push("날삼재");
  return parts.length ? parts.join("·") : "무난";
}

// ── 태어난 해의 천간과 2027년 丁의 관계 ──
export interface StemNote {
  title: string;
  body: string;
}

export function stemNote(stem: string): StemNote {
  switch (stem) {
    case "甲":
    case "乙":
      return {
        title: "나무가 불을 키워 주는 해",
        body: "태어난 해의 나무(木) 기운이 2027년의 불(火)을 키워 주는 관계예요. 내가 가진 것을 꺼내 쓰고 표현하는 해라 재능을 드러내기 좋지만, 그만큼 기운을 많이 쓰니 쉬는 날을 미리 정해 두세요.",
      };
    case "丙":
      return {
        title: "같은 불이 만나는 해",
        body: "태어난 해의 불(火) 기운과 2027년의 불이 같은 편이에요. 뜻이 맞는 동료가 생기기 쉬운 대신 경쟁도 생기기 쉬워요. 함께하는 일은 몫을 처음에 정해 두세요.",
      };
    case "丁":
      return {
        title: "같은 글자(丁)가 겹치는 해",
        body: "태어난 해의 천간이 2027년과 똑같은 정(丁)이에요. 내 색깔이 또렷해지는 해라 주도권을 잡기 쉽지만, 고집으로 보이지 않게 주변 의견을 한 번 더 들어 보세요.",
      };
    case "戊":
    case "己":
      return {
        title: "불이 흙을 데워 주는 해",
        body: "2027년의 불(火)이 태어난 해의 흙(土) 기운을 키워 주는 관계예요. 배움·문서·도움의 손길이 들어오기 쉬운 해라, 자격이나 공부를 시작하기 좋아요.",
      };
    case "庚":
    case "辛":
      return {
        title: "불이 쇠를 다듬는 해",
        body: "2027년의 불(火)이 태어난 해의 쇠(金) 기운을 다듬는 관계예요. 맡는 역할과 책임이 커지기 쉬운 해예요. 규칙과 순서를 정해 두면 부담이 성과로 바뀌어요.",
      };
    case "壬":
      return {
        title: "정임합(丁壬合): 제안이 들어오는 해",
        body: "태어난 해의 임(壬)과 2027년의 정(丁)이 합을 이뤄요. 새 인연이나 제안, 함께하자는 이야기가 들어오기 쉬운 해예요. 좋은 조건일수록 계약 내용은 꼼꼼히 확인하세요.",
      };
    case "癸":
      return {
        title: "정계충(丁癸沖): 계획이 바뀌기 쉬운 해",
        body: "태어난 해의 계(癸)와 2027년의 정(丁)이 부딪히는 관계예요. 세운 계획이 중간에 바뀌기 쉬우니 큰 결정은 서두르지 말고, 일정에 여유를 두세요.",
      };
    default:
      return { title: "", body: "" };
  }
}

// ── 나이대별 생활 팁 ──
export function ageTips(age: number): { stage: string; tips: string[] } {
  if (age < 20) return { stage: "10대 후반", tips: ["진로·입시처럼 큰 선택은 혼자보다 믿는 어른과 함께 정리해 보세요.", "하루 공부 시간보다 잠과 식사 리듬을 먼저 지키는 게 오래가요.", "새로 만나는 사람이 많아지는 시기예요. 나를 지키는 거절도 연습해 보세요."] };
  if (age < 30) return { stage: "20대", tips: ["일의 경험을 쌓는 해예요. 작은 일이라도 결과를 기록해 두세요.", "월급의 일부를 먼저 떼어 두는 습관이 평생 돈 습관이 돼요.", "관계는 넓히기보다 오래 갈 사람을 챙기는 쪽이 좋아요."] };
  if (age < 40) return { stage: "30대", tips: ["일과 가정 사이의 우선순위를 가족과 함께 정해 보세요.", "목돈 계획(집·교육·노후)을 숫자로 적어 두면 흔들리지 않아요.", "바쁠수록 혼자만의 시간을 일정에 넣어 두세요."] };
  if (age < 50) return { stage: "40대", tips: ["내 자리를 단단히 하는 해예요. 맡은 일의 성과를 정리해 두세요.", "자녀와 부모 사이에서 지치기 쉬우니 도움을 나눠 받으세요.", "보험·연금처럼 오래가는 계약을 한 번 점검해 보세요."] };
  if (age < 60) return { stage: "50대", tips: ["노후 자금과 고정 지출을 한 번 표로 정리해 보세요.", "매일 걷기처럼 작은 건강 습관을 하나 정해 꾸준히 이어 가세요.", "자녀가 독립하는 시기라면, 내 시간과 취미를 새로 채워 보세요."] };
  if (age < 70) return { stage: "60대", tips: ["일을 줄이거나 바꾸는 시기라면 하루 생활 리듬부터 새로 짜 보세요.", "연금·통장·보험 서류를 한곳에 모아 두면 가족도 마음이 편해요.", "손주·가족과의 시간, 오랜 친구와의 연락이 큰 힘이 되는 해예요."] };
  return { stage: "70대 이상", tips: ["무리한 일정보다 몸의 리듬에 맞춰 하루를 꾸리세요.", "가족과 자주 연락하고, 중요한 서류는 한곳에 정리해 두세요.", "가까운 이웃·친구와의 작은 모임이 마음을 든든하게 해 줘요."] };
}

export function ttiFromKey(key: string): Tti | undefined {
  return TTI_BY_SLUG[key];
}

export { TTI };
