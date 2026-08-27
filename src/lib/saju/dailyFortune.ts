import type { SajuResult } from "./types";
import type { WuXing } from "./ganzhi";

// 일간(day gan)의 오행별로 카테고리별 문구를 여러 개씩 준비해두고, "일간 오행 + 날짜 + 카테고리"를
// 결정적으로 조합해 매일 다른(그러나 같은 사람·같은 날엔 항상 동일한) 결과를 만든다.
// AI 호출 없이 무료로 재방문을 유도하기 위한 가벼운 규칙 기반 콘텐츠다.
const OVERALL_PHRASES: Record<WuXing, string[]> = {
  목: [
    "오늘은 새로운 일을 시작하기에 나쁘지 않은 흐름이에요. 미뤄뒀던 계획을 한 걸음 꺼내보세요.",
    "성장의 기운이 강해서, 배우고 싶었던 것에 시간을 내보면 만족스러울 수 있어요.",
    "몸을 움직이는 활동이 오늘의 기분을 한결 가볍게 만들어줄 수 있어요.",
  ],
  화: [
    "표현력이 좋아지는 하루라 하고 싶은 말을 솔직하게 전해도 좋아요.",
    "활동적으로 움직일수록 기분 좋은 하루가 될 가능성이 있어요.",
    "평소보다 눈에 띄는 하루가 될 수 있어요. 자신감을 갖고 임해보세요.",
  ],
  토: [
    "차분히 하나씩 처리하기 좋은 흐름이에요. 급하게 서두르지 않아도 괜찮아요.",
    "평소 루틴을 지키는 것만으로도 안정감을 느낄 수 있는 날이에요.",
    "믿을 수 있는 사람과의 대화가 마음을 편하게 해줄 수 있는 하루예요.",
  ],
  금: [
    "결정을 내려야 할 일이 있다면, 오늘은 원칙대로 판단해도 좋은 흐름이에요.",
    "정리하고 싶었던 일을 마무리 짓기 좋은 하루예요.",
    "맺고 끊음이 분명해지는 날이라, 미뤄온 정리를 해보는 것도 좋겠어요.",
  ],
  수: [
    "생각이 깊어지는 하루라, 중요한 결정은 한 번 더 곱씹어보고 내려도 좋아요.",
    "평소보다 감이 좋아지는 날이니 직감을 믿어봐도 괜찮을 수 있어요.",
    "새로운 정보나 소식이 들어올 수 있는 하루예요. 귀 기울여보세요.",
  ],
};

const LOVE_PHRASES: Record<WuXing, string[]> = {
  목: ["먼저 다가가면 좋은 반응이 돌아올 수 있는 하루예요.", "솔직한 마음을 표현하기 좋은 흐름이에요."],
  화: ["감정 표현이 풍부해지는 날이라 마음을 전하기 좋아요.", "활발한 매력이 돋보일 수 있는 하루예요."],
  토: ["편안하고 안정적인 분위기가 관계에 도움이 되는 날이에요.", "꾸준한 마음이 상대에게 잘 전해질 수 있어요."],
  금: ["관계를 신중히 살펴보기 좋은 흐름이에요.", "분명한 태도가 오히려 신뢰를 줄 수 있는 날이에요."],
  수: ["마음이 유연해지며 예상치 못한 인연이 다가올 수 있어요.", "섬세한 배려가 빛을 발하는 하루예요."],
};

const WEALTH_PHRASES: Record<WuXing, string[]> = {
  목: ["새로운 시도가 재물의 씨앗이 될 수 있는 흐름이에요.", "작은 기회를 놓치지 않는 게 도움이 될 수 있어요."],
  화: ["적극적인 행동이 수입으로 이어질 가능성이 엿보여요.", "지출보다 실행이 먼저인 하루예요."],
  토: ["차곡차곡 쌓아온 노력이 결실을 맺기 좋은 흐름이에요.", "무리한 지출만 피하면 안정적인 하루예요."],
  금: ["지출과 수입을 정리하면 흐름이 더 좋아질 수 있어요.", "계획적인 소비가 도움이 되는 날이에요."],
  수: ["정보와 기회를 빠르게 포착하는 감각이 살아나는 흐름이에요.", "예상치 못한 곳에서 좋은 소식이 올 수 있어요."],
};

const CAREER_PHRASES: Record<WuXing, string[]> = {
  목: ["새로운 도전과 확장의 기회가 열릴 수 있는 흐름이에요.", "적극적으로 나서보면 좋은 결과가 따라올 수 있어요."],
  화: ["존재감을 드러낼 좋은 기회가 다가오는 흐름이에요.", "발표나 소통이 필요한 일에 유리한 하루예요."],
  토: ["맡은 역할에서 신뢰를 단단히 쌓아가는 흐름이에요.", "꾸준함이 성과로 이어지는 하루예요."],
  금: ["성과를 명확히 인정받을 수 있는 흐름이 엿보여요.", "완성도 높은 결과물을 만들기 좋은 날이에요."],
  수: ["아이디어와 기획력이 빛을 발할 수 있는 흐름이에요.", "유연한 대처가 좋은 평가로 이어질 수 있어요."],
};

const RELATIONSHIP_PHRASES: Record<WuXing, string[]> = {
  목: ["새로운 사람들과의 만남이 활발해지는 흐름이에요.", "먼저 연락해보면 반가운 답이 올 수 있어요."],
  화: ["주변에서 먼저 다가오는 인연이 늘어나는 흐름이에요.", "모임이나 자리에서 좋은 인상을 남길 수 있어요."],
  토: ["오래된 인연이 더 깊어질 수 있는 흐름이에요.", "믿음직한 모습으로 신뢰를 얻는 하루예요."],
  금: ["관계를 정리하고 핵심 인맥에 집중하기 좋은 흐름이에요.", "분명한 의사표현이 관계에 도움이 되는 날이에요."],
  수: ["폭넓은 네트워크가 예상치 못한 도움으로 돌아올 흐름이에요.", "가벼운 대화가 좋은 인연으로 이어질 수 있어요."],
};

const ONE_LINERS = [
  "오늘 하루도 나답게, 무리하지 않아도 괜찮아요.",
  "작은 선택 하나가 기분 좋은 하루를 만들어줄 수 있어요.",
  "완벽하지 않아도 충분히 잘하고 있어요.",
  "오늘의 나에게 조금 더 다정해도 좋아요.",
  "서두르지 않아도 흐름은 이어져요.",
  "오늘 느낀 감정을 있는 그대로 받아들여보세요.",
];

const LUCKY_COLORS = ["네이비", "라벤더", "아이보리", "테라코타", "포레스트그린", "머스타드", "그레이", "버건디"];

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

/** 문자열을 결정적 시드로 바꿔 0 이상 max 미만의 정수를 뽑는다(카테고리마다 다른 결과가
 * 나오도록 category를 시드에 함께 섞는다). */
function seededIndex(seed: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % max;
}

function pick(seed: string, pool: string[]): string {
  return pool[seededIndex(seed, pool.length)];
}

/** 한국 시간(KST, UTC+9) 기준 오늘 날짜를 반환한다. Vercel 서버 시각(UTC)과 무관하게
 * 한국 사용자 기준으로 "오늘"이 자연스럽게 맞아떨어지도록 하기 위함이다. */
export function todayInKst(now: Date = new Date()): Date {
  const kstMillis = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMillis);
}

export interface DailyFortune {
  dateLabel: string;
  text: string;
}

export interface DailyFortuneDetail {
  dateLabel: string;
  overall: string;
  love: string;
  wealth: string;
  career: string;
  relationship: string;
  luckyNumber: number;
  luckyColor: string;
  oneLiner: string;
}

/** 일간(day gan)과 KST 기준 오늘 날짜를 조합해 결정적으로 8가지 오늘의 운세 항목을 만든다.
 * "동일 인물 + 동일 날짜"에는 항상 같은 결과가 나오고(새로고침해도 안 바뀜), 날짜가
 * 바뀌면 자동으로 새 결과가 나온다 — 사용자를 식별하는 값으로는 일주(day pillar) 간지
 * 문자열을 쓴다(로그인이 없는 서비스라 이 정도가 실질적으로 가장 안정적인 "사용자" 시드다). */
export function getDailyFortuneDetail(result: SajuResult, now: Date = new Date()): DailyFortuneDetail {
  const kstNow = todayInKst(now);
  const wuxing = result.dayPillar.ganWuxing;
  const daySeed = `${result.dayPillar.ganZhiHanja}-${dayOfYear(kstNow)}-${kstNow.getUTCFullYear()}`;

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(now);

  return {
    dateLabel,
    overall: pick(`${daySeed}-overall`, OVERALL_PHRASES[wuxing]),
    love: pick(`${daySeed}-love`, LOVE_PHRASES[wuxing]),
    wealth: pick(`${daySeed}-wealth`, WEALTH_PHRASES[wuxing]),
    career: pick(`${daySeed}-career`, CAREER_PHRASES[wuxing]),
    relationship: pick(`${daySeed}-relationship`, RELATIONSHIP_PHRASES[wuxing]),
    luckyNumber: seededIndex(`${daySeed}-number`, 9) + 1,
    luckyColor: pick(`${daySeed}-color`, LUCKY_COLORS),
    oneLiner: pick(`${daySeed}-oneliner`, ONE_LINERS),
  };
}

/** 기존 화면(간단한 한 줄 운세)과의 호환을 위한 얇은 래퍼. */
export function getDailyFortune(result: SajuResult, now: Date = new Date()): DailyFortune {
  const detail = getDailyFortuneDetail(result, now);
  return { dateLabel: detail.dateLabel, text: detail.overall };
}
