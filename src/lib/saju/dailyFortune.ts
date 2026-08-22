import type { SajuResult } from "./types";
import type { WuXing } from "./ganzhi";

// 일간의 오행별로 "오늘의 운세" 문구를 여러 개씩 준비해두고, 날짜에 따라 결정적으로
// 하나를 골라 매일 다른(하지만 매번 새로고침해도 같은 날엔 동일한) 문구가 나오게 한다.
// AI 호출 없이 무료로 재방문을 유도하기 위한 가벼운 규칙 기반 콘텐츠다.
const DAILY_PHRASES: Record<WuXing, string[]> = {
  목: [
    "오늘은 새로운 일을 시작하기에 나쁘지 않은 흐름이에요. 미뤄뒀던 계획을 한 걸음 꺼내보세요.",
    "주변 사람에게 먼저 다가가면 좋은 반응이 돌아올 수 있는 하루예요.",
    "성장의 기운이 강해서, 배우고 싶었던 것에 시간을 내보면 만족스러울 수 있어요.",
  ],
  화: [
    "표현력이 좋아지는 하루라 하고 싶은 말을 솔직하게 전해도 좋아요.",
    "활동적으로 움직일수록 기분 좋은 하루가 될 가능성이 있어요.",
    "사람들 앞에서 나설 일이 생기면, 평소보다 자신감을 갖고 임해보세요.",
  ],
  토: [
    "차분히 하나씩 처리하기 좋은 흐름이에요. 급하게 서두르지 않아도 괜찮아요.",
    "믿을 수 있는 사람과의 대화가 마음을 편하게 해줄 수 있는 하루예요.",
    "평소 루틴을 지키는 것만으로도 안정감을 느낄 수 있는 날이에요.",
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

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86_400_000);
}

export interface DailyFortune {
  dateLabel: string;
  text: string;
}

/** 일간(day gan)의 오행과 오늘 날짜를 조합해 결정적으로 하나의 오늘의 운세 문구를 고른다. */
export function getDailyFortune(result: SajuResult, now: Date = new Date()): DailyFortune {
  const wuxing = result.dayPillar.ganWuxing;
  const phrases = DAILY_PHRASES[wuxing];
  const index = dayOfYear(now) % phrases.length;

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(now);

  return { dateLabel, text: phrases[index] };
}
