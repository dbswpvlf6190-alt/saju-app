import type { SajuResult } from "./types";
import type { WuXing } from "./ganzhi";

// 오행 상생(生, 서로 북돋는 관계)·상극(剋, 서로 부딪히는 관계) 순환. 명리학의 전통적인
// 오행 이론을 단순화해 "재미로 보는 궁합 점수"를 만드는 데만 사용한다 — 확정적 판단이 아니다.
const GENERATES: Record<WuXing, WuXing> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

export type WuxingRelation = "상생" | "상극" | "비화";

// 서로 다른 두 오행은 항상 "한쪽이 다른 쪽을 낳는다(상생)" 또는 그렇지 않으면 "상극" 둘 중
// 하나다(오행 상생 순환이 5개 원소를 도는 전순환이라, 상생 관계가 아니면 반드시 상극 관계다).
function relationOf(a: WuXing, b: WuXing): WuxingRelation {
  if (a === b) return "비화";
  if (GENERATES[a] === b || GENERATES[b] === a) return "상생";
  return "상극";
}

/** 문자열을 결정적(deterministic) 시드로 바꿔 -range~range 사이 정수를 뽑는다.
 * 같은 두 사람 조합이면 언제 계산해도 항상 같은 점수가 나오도록 하기 위함(진짜 난수 대신 사용). */
function seededOffset(seed: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % (range * 2 + 1)) - range;
  return normalized;
}

function clampScore(score: number): number {
  return Math.max(35, Math.min(97, Math.round(score)));
}

const RELATION_BASE: Record<WuxingRelation, number> = { 상생: 82, 비화: 68, 상극: 58 };

const RELATION_HEADLINE: Record<WuxingRelation, string> = {
  상생: "서로를 북돋아주는 조합이에요",
  비화: "닮은 결이라 편안하게 느껴지는 조합이에요",
  상극: "결이 달라서 배울 점이 많은 조합이에요",
};

const RELATION_SUMMARY: Record<WuxingRelation, string> = {
  상생:
    "두 분의 기운이 서로 채워주는 관계라, 함께 있을 때 시너지가 나는 편이에요. 자연스럽게 서로에게 힘이 되어주는 흐름이 있어요.",
  비화:
    "비슷한 기운을 가진 두 분이라 취향이나 리듬이 잘 맞는 편이에요. 다만 자극보다는 편안함이 강한 관계라 서로 새로운 시도를 함께 해보는 것도 좋아요.",
  상극:
    "서로 다른 방향의 기운을 가진 조합이라 부딪히는 순간이 있을 수 있어요. 하지만 다른 만큼 서로에게 없는 걸 채워줄 수 있는 관계이기도 해요.",
};

export type CompatibilitySectionKey =
  | "personality"
  | "romance"
  | "conversation"
  | "conflict"
  | "growth"
  | "overall";

export interface FreeCompatibility {
  overallScore: number;
  relation: WuxingRelation;
  headline: string;
  summary: string;
}

export interface CompatibilityScores {
  overall: number;
  personality: number;
  romance: number;
  conversation: number;
  conflictRisk: "낮음" | "보통" | "있음";
}

/** 무료 궁합 결과 — AI 호출 없이 규칙 기반으로 즉시 계산한다(비화/상생/상극 관계 + 결정적 점수). */
export function calculateFreeCompatibility(self: SajuResult, partner: SajuResult): FreeCompatibility {
  const relation = relationOf(self.dayPillar.ganWuxing, partner.dayPillar.ganWuxing);
  const seed = `${self.dayPillar.ganZhiHanja}-${partner.dayPillar.ganZhiHanja}`;
  const overallScore = clampScore(RELATION_BASE[relation] + seededOffset(seed, 12));

  return {
    overallScore,
    relation,
    headline: RELATION_HEADLINE[relation],
    summary: RELATION_SUMMARY[relation],
  };
}

export interface CompatibilitySection {
  key: CompatibilitySectionKey;
  title: string;
  teaser: string;
}

const COMPATIBILITY_SECTION_LABELS: Record<CompatibilitySectionKey, string> = {
  personality: "성격 궁합",
  romance: "연애 궁합",
  conversation: "대화 궁합",
  conflict: "갈등 가능성",
  growth: "관계를 발전시키는 방법",
  overall: "종합 궁합 해석",
};

const SECTION_TEASER_BY_RELATION: Record<CompatibilitySectionKey, Record<WuxingRelation, string>> = {
  personality: {
    상생: "서로의 성향이 자연스럽게 맞물리는 부분이 많아요.",
    비화: "비슷한 성향이라 이해가 빠른 편이에요.",
    상극: "다른 성향이 부딪히는 지점이 있어요.",
  },
  romance: {
    상생: "표현 방식이 잘 맞아떨어지는 흐름이에요.",
    비화: "편안하지만 자극이 필요할 수 있는 흐름이에요.",
    상극: "온도차가 느껴질 수 있는 흐름이에요.",
  },
  conversation: {
    상생: "대화가 술술 풀리는 편이에요.",
    비화: "말이 잘 통하지만 새로운 주제가 필요해요.",
    상극: "관점 차이로 오해가 생길 수 있어요.",
  },
  conflict: {
    상생: "큰 갈등 없이 무난하게 흘러가는 편이에요.",
    비화: "권태로운 순간이 생길 수 있어요.",
    상극: "의견 차이가 잦을 수 있는 조합이에요.",
  },
  growth: {
    상생: "지금의 좋은 흐름을 어떻게 이어갈지가 중요해요.",
    비화: "새로운 자극을 함께 만들어가면 좋아요.",
    상극: "다름을 인정하는 게 관계의 열쇠예요.",
  },
  overall: {
    상생: "전체적으로 시너지가 좋은 조합이에요.",
    비화: "편안하지만 노력이 필요한 조합이에요.",
    상극: "서로 배울 점이 많은 조합이에요.",
  },
};

export const COMPATIBILITY_SECTION_KEYS: CompatibilitySectionKey[] = [
  "personality",
  "romance",
  "conversation",
  "conflict",
  "growth",
  "overall",
];

export function getCompatibilitySections(free: FreeCompatibility): CompatibilitySection[] {
  return COMPATIBILITY_SECTION_KEYS.map((key) => ({
    key,
    title: COMPATIBILITY_SECTION_LABELS[key],
    teaser: SECTION_TEASER_BY_RELATION[key][free.relation],
  }));
}

/** 유료 궁합 리포트용 세부 점수. AI 해석 프롬프트에 근거 데이터로 함께 전달된다. */
export function calculateCompatibilityScores(self: SajuResult, partner: SajuResult): CompatibilityScores {
  const free = calculateFreeCompatibility(self, partner);
  const seed = `${self.dayPillar.ganZhiHanja}-${partner.dayPillar.ganZhiHanja}`;

  const personality = clampScore(RELATION_BASE[free.relation] + seededOffset(`${seed}-personality`, 15));
  const romance = clampScore(RELATION_BASE[free.relation] + seededOffset(`${seed}-romance`, 15));
  const conversation = clampScore(RELATION_BASE[free.relation] + seededOffset(`${seed}-conversation`, 15));

  const conflictRisk: CompatibilityScores["conflictRisk"] =
    free.relation === "상극" ? "있음" : free.relation === "비화" ? "보통" : "낮음";

  return { overall: free.overallScore, personality, romance, conversation, conflictRisk };
}
