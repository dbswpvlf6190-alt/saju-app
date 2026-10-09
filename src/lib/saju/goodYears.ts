import { CHEONGAN_WUXING, type WuXing } from "./ganzhi";
import { getYearGanzhi } from "./engine";
import type { SajuResult } from "./types";

// 무료 결과의 "앞으로 흐름이 좋은 해" 미리보기(2026-10-09). 지인 시험 사용에서 "몇 년도에 좋은 일이 생긴다"는
// 구체적인 연도가 가장 마음을 움직였다는 피드백으로 추가했다. 해마다 들어오는 천간(세운)이 내 일간과 어떤 관계인지만
// 본다(전통 해석의 십성 계열) — Threads 풀이 답글(scripts/threads_ilgan.mjs)과 같은 규칙이라 두 곳의 답이 같다.
// 단정 금지: "좋은 일이 생긴다"가 아니라 "흐름이 들어오는 해로 봐요"까지만 쓴다.

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

/** 좋은 해로 보여줄 기운과 한 줄 설명. 비겁·식상은 해석이 갈려서 미리보기에서는 쓰지 않는다. */
const GOOD: Partial<Record<Group, { label: string; line: string }>> = {
  재성: { label: "돈·성과의 해", line: "노력한 만큼 돈과 성과가 붙는 흐름이 들어오는 해로 봐요." },
  관성: { label: "기회·자리의 해", line: "자리와 기회, 좋은 인연이 열리는 흐름이 들어오는 해로 봐요." },
  인성: { label: "도움·배움의 해", line: "나를 돕는 사람과 배움의 흐름이 들어오는 해로 봐요." },
};

export interface GoodYear {
  year: number;
  ganzhiKor: string;
  ganzhiHanja: string;
  label: string;
  line: string;
}

/** 올해(KST)부터 span년 안에서 좋은 기운이 들어오는 해를 가까운 순으로 최대 limit개. */
export function getGoodYears(result: SajuResult, fromYear: number, span = 5, limit = 2): GoodYear[] {
  const me = result.dayPillar.ganWuxing;
  const out: GoodYear[] = [];
  for (let y = fromYear; y < fromYear + span && out.length < limit; y++) {
    const p = getYearGanzhi(y);
    const g = GOOD[groupOf(me, CHEONGAN_WUXING[p.ganHanja])];
    if (g) out.push({ year: y, ganzhiKor: p.ganZhiKor, ganzhiHanja: p.ganZhiHanja, ...g });
  }
  return out;
}

/** KST 기준 올해. 연말 며칠 차이로 서버·브라우저가 다른 해를 보지 않게 한국 시간으로 고정한다. */
export function currentYearKst(now: Date = new Date()): number {
  return new Date(now.getTime() + 9 * 3600 * 1000).getUTCFullYear();
}
