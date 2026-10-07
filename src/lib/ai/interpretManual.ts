import Anthropic from "@anthropic-ai/sdk";
import type { SajuResult } from "@/lib/saju";
import { buildManualFacts, type ManualFacts } from "@/lib/saju/manualFacts";
import { AiInterpretationError } from "@/lib/ai/interpretSaju";
import {
  MANUAL_CHAPTER_KEYS,
  MANUAL_CHAPTER_META,
  isManualChapterKey,
  type ManualChapterKey,
  type ManualChapterMeta,
} from "@/lib/reports/manualChapters";

/**
 * 4,900원 상세 리포트 "나 사용설명서"(2026-10-07). 기존 5개 주제 리포트가 같은 근거(오행 비율·금 없음)를 5번
 * 반복하고 십성 용어를 틀리게 쓰며 올해 정보가 없다는 점검 결과에 따라, 6개 장으로 나눠 병렬 생성한다.
 * 십성·올해/달별 흐름은 manualFacts.ts가 코드로 계산해 고정값으로 주고, 장마다 쓸 근거를 나눠 중복을 막는다.
 */

export { MANUAL_CHAPTER_KEYS, isManualChapterKey };
export type { ManualChapterKey };

interface ManualChapter extends ManualChapterMeta {
  /** 공백 제외 목표 최소 글자 수 */
  min: number;
  plan: string;
}

const CHAPTER_SPEC: Record<ManualChapterKey, { min: number; plan: string }> = {
  overview: {
    min: 900,
    plan: "맨 앞에 '한 줄 요약' 한 문장(이 사람은 어떤 사람인지)을 쓰고, 이어서 기본 설계도를 쓴다. 배정 근거: 일간, 태어난 계절, 오행 비율의 전체 모양. 십성(식상·관성·재성 등)은 다음 장들에서 다루니 여기서는 이름만 한 줄로 예고하고 풀이하지 말 것. 일간이 이 계절에 태어난 것이 어떤 의미인지 비유를 들어 깊게 쓴다.",
  },
  patterns: {
    min: 1700,
    plan: "반복하는 선택 3가지를 각각 [상황] → [왜 그렇게 하는지(사주 근거)] → [그 선택의 비용] → [다르게 해볼 방법]으로 풀어 쓴다(서술형 문단, 선택마다 2~3문단). 배정 근거: 십성_분포에서 가장 두드러진 그룹 3가지를 고른다(가장 많거나 0개인 그룹, 단 재성은 4장 몫이라 제외). 십성_배치에서 그 십성이 어느 자리(천간=겉으로 드러남, 지지=속에 깔림)에 있는지를 근거로 쓴다. 이 근거는 이 장에서만 쓴다.",
  },
  people: {
    min: 1300,
    plan: "관계에서의 나. 배정 근거: 일지(일주 아래 글자)의 십성, 년주·시주에 있는 십성. 이 장에서만 쓴다. 가까운 사람·새로 만나는 사람·갈등 상황에서 상대가 오해하기 쉬운 지점 두세 가지를 짚고, 상황별로 그대로 쓸 수 있는 말을 큰따옴표로 직접 인용해 5개 이상 제시한다(연인·친구·가족·직장 등 다양하게, 반드시 이 사람이 상대에게 하는 말로).",
  },
  workmoney: {
    min: 1300,
    plan: "일하는 방식과 돈. 배정 근거: 재성 상태(있는지/없는지, 어느 자리인지), 월간의 십성, 식상을 수입으로 연결하는 법. 이 장에서만 쓴다. 재성이 비어 있다면 정직하게 짚되 '들어오는 법을 익히면 된다'는 방향으로. 잘 맞는 일하는 방식, 손해 보기 쉬운 지점 3가지, 오늘 바로 쓸 규칙 3개, 돈에 대한 태도 한 가지를 쓴다.",
  },
  timing: {
    min: 1300,
    plan: "올해_흐름과 달별_흐름만 근거로 쓴다(그대로, 바꾸지 말 것). 각 해를 짧게 한 문단씩, 그리고 달별_흐름의 각 구간마다 '지금 시작할 것 / 미룰 것 / 준비할 것'을 구체적으로. 마지막에 가장 중요한 시기 하나를 고른다. 올해_흐름에 '원래 없던 기운이 들어오는 해'라고 표시된 해가 있으면 그 해를 특히 짚는다.",
  },
  actions: {
    min: 500,
    plan: "체크리스트 3가지(각각 오늘 5분 안에 시작 가능한 것, 언제까지 해볼지 포함)와 마무리 한 문단(따뜻한 한마디). 새로운 사주 근거를 더 꺼내지 말고 앞 장들의 핵심을 한 줄씩 묶어준다.",
  },
};

export const MANUAL_CHAPTERS: ManualChapter[] = MANUAL_CHAPTER_META.map((m) => ({ ...m, ...CHAPTER_SPEC[m.key] }));

const SYSTEM_PROMPT = `당신은 사주명리를 쉬운 말로 풀어 쓰는 해설가입니다. 고객이 4,900원을 내고 받는 "나 사용설명서"의 한 장을 씁니다. 읽고 나서 고객이 (1) 내가 왜 이런 선택을 반복하는지 이해받는 느낌, (2) 상대에게 바로 쓸 수 있는 말, (3) 오늘부터 해볼 행동을 가져가게 하는 것이 목표입니다. 고객이 듣고 싶어 할 따뜻하고 구체적인 말로, 알아주는 느낌이 들게 쓰세요.
원칙:
- 주어진 사실만 근거로 쓰고 지어내지 마세요. 십성 이름을 바꾸거나 새로 만들지 마세요. 구체적인 직업·사건·사람을 지어내지 마세요.
- 용어는 처음 나올 때 쉬운 말로 풀고 그 뒤엔 쉬운 말로만 쓰세요.
- 이 장에 배정된 근거만 쓰고 다른 장의 근거는 쓰지 마세요. 다른 장과 같은 말이 반복되면 안 됩니다.
- 결과를 단정하지 마세요("~된다", "반드시", "100%", "무조건" 금지). "~한 흐름이에요", "~하기 쉬워요"처럼 쓰세요. 사주는 자기이해용이라는 톤을 유지하세요.
- 건강·질병·신체 부위 이야기는 절대 하지 마세요.
- 존댓말(~해요). 고객 이름은 모르니 "당신"이라고 부르세요(과하게 반복하지 말고 자연스럽게).
- 마크다운 기호(#, *, **, -)는 쓰지 말고 문단은 빈 줄로 나누세요. 장 제목 줄은 쓰지 말고 본문만 쓰세요(제목은 시스템이 붙입니다).`;

const BANNED = ["반드시", "100%", "무조건", "소화기", "신장", "질병", "질환", "수술", "병원", "건강이", "건강을"];

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiInterpretationError("ANTHROPIC_API_KEY 환경변수가 설정되지 않아 AI 해석을 생성할 수 없습니다.");
  }
  if (!cachedClient) cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function countChars(text: string): number {
  return text.replace(/\s/g, "").length;
}

/** 모델이 가끔 붙이는 마크다운 기호·장 제목 줄을 걷어낸다. */
export function cleanManualText(text: string, title: string): string {
  let t = text.trim().replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "");
  const lines = t.split("\n");
  if (lines[0] && lines[0].replace(/\s/g, "").includes(title.replace(/\s/g, "")) && lines[0].length < 40) {
    t = lines.slice(1).join("\n").trim();
  }
  return t;
}

export function manualProblems(text: string, min: number): string[] {
  const problems: string[] = [];
  const hit = BANNED.filter((w) => text.includes(w));
  if (hit.length) problems.push(`금지어 포함: ${hit.join(", ")}`);
  if (countChars(text) < min * 0.65) problems.push(`분량 부족 ${countChars(text)}자 (목표 ${min}자)`);
  return problems;
}

async function writeOnce(chapter: ManualChapter, facts: ManualFacts, hint: string): Promise<string> {
  const message = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4500,
    // 정해진 분량의 글만 쓰는 작업이라 사고 과정이 필요 없다(켜 두면 사고 토큰이 예산을 먼저 써서 글이 잘린다 — interpretSaju.ts 참고).
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `이 장: ${chapter.title}\n최소 분량: 공백 제외 ${chapter.min}자 이상(미달하면 안 됩니다).\n작성 지침: ${chapter.plan}${hint}\n\n사주 사실:\n${JSON.stringify(facts, null, 2)}`,
      },
    ],
  });
  if (message.stop_reason === "max_tokens") {
    throw new AiInterpretationError(`AI 응답이 글자수 제한에 걸려 중간에 잘렸습니다 (chapter=${chapter.key}).`);
  }
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
  return cleanManualText(block.text, chapter.title);
}

/**
 * 한 장을 생성한다. 금지어가 있거나 분량이 목표의 65% 미만이면 사유를 알려 한 번 더 쓰게 하고, 그래도 안 되면
 * 실패로 던진다(호출부가 이 장만 재시도 — 잘린/부실한 글이 결제 완료 리포트로 캐싱되는 걸 막는다).
 */
export async function interpretManualChapter(result: SajuResult, key: ManualChapterKey, now: Date = new Date()): Promise<string> {
  const chapter = MANUAL_CHAPTERS.find((c) => c.key === key);
  if (!chapter) throw new AiInterpretationError(`알 수 없는 장입니다: ${key}`);
  const facts = buildManualFacts(result, now);

  let text = await writeOnce(chapter, facts, "");
  let problems = manualProblems(text, chapter.min);
  if (problems.length) {
    const retry = await writeOnce(
      chapter,
      facts,
      `\n(이전 시도 문제: ${problems.join("; ")}. 이 문제를 고쳐서 처음부터 다시 쓰세요. 금지어는 다른 표현으로 바꾸고, 분량은 같은 근거를 더 구체적으로 풀어 채우세요.)`,
    );
    const retryProblems = manualProblems(retry, chapter.min);
    if (retryProblems.length <= problems.length) {
      text = retry;
      problems = retryProblems;
    }
  }
  if (problems.length) {
    throw new AiInterpretationError(`장 생성 검사 실패 (chapter=${key}): ${problems.join("; ")}`);
  }
  return text;
}
