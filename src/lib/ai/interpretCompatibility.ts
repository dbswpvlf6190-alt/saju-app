import Anthropic from "@anthropic-ai/sdk";
import type { SajuResult } from "@/lib/saju";
import type { CompatibilityScores, CompatibilitySectionKey } from "@/lib/saju/compatibility";

const SECTION_LABEL: Record<CompatibilitySectionKey, string> = {
  personality: "성격 궁합",
  romance: "연애 궁합",
  conversation: "대화 궁합",
  conflict: "갈등 가능성과 패턴",
  growth: "관계를 발전시키는 방법",
  overall: "종합 궁합 해석",
};

const SYSTEM_PROMPT = `당신은 사주명리학 기반 궁합을 이해하기 쉽게 풀어 설명하는 해설가입니다. 다음 원칙을 반드시 지키세요.

1. "무조건 잘 맞는다", "결국 헤어진다", "반드시 ~하게 된다"처럼 관계의 결말을 단정하는 확정적 표현을 절대 쓰지 마세요. "~한 흐름이 보여요", "~할 가능성이 있어요", "~한 편이에요"처럼 가능성과 경향을 전하는 어조를 사용하세요.
2. 두 사람의 오행 관계(상생/상극/비화)를 근거로 설명하되, 전문 용어가 나오면 바로 쉬운 말로 풀어주세요.
3. 갈등 가능성을 설명할 때도 그것이 관계의 끝을 의미하지 않는다는 점을 함께 전하고, 실제로 참고할 수 있는 구체적인 조언을 2~3가지 포함하세요.
4. 사주는 자기이해와 재미를 위한 콘텐츠라는 성격을 유지하고, 의학적·법률적·금융적 사실처럼 단정하지 마세요.
5. 주어진 데이터에 없는 사실(직업, 실제 이름, 실제 사건 등)을 지어내지 마세요.
6. 전달받은 두 사람의 오행 비율, 일간, 궁합 점수 같은 구체적인 데이터를 최소 한두 곳 이상 자연스럽게 근거로 활용해서, 이 두 사람만을 위한 해석처럼 느껴지게 쓰세요(뻔한 일반론으로 채우지 마세요).
7. 결과는 4~6개 문단, 총 650~800자 내외의 자연스러운 한국어 존댓말로 작성하세요. 유료 상세 리포트이므로 성급하게 요약하지 말고 충분히 풀어서 설명하세요. 소제목이나 목록 기호 없이 문단으로만 답하세요.`;

export class AiInterpretationError extends Error {}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiInterpretationError("ANTHROPIC_API_KEY 환경변수가 설정되지 않아 AI 해석을 생성할 수 없습니다.");
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

function summarize(result: SajuResult, label: "본인" | "상대방") {
  return {
    [`${label}_성별`]: result.input.gender === "male" ? "남성" : "여성",
    [`${label}_일간`]: result.dayPillar.ganZhiKor,
    [`${label}_년주`]: result.yearPillar.ganZhiKor,
    [`${label}_오행비율`]: result.wuxingPercent,
  };
}

/** 결제 완료 후 상세 궁합 리포트 화면에서만 호출되어야 하며, 호출부에서 결제 완료 여부를
 * 먼저 검증해야 한다(기존 interpretSajuSection과 동일한 책임 분리 원칙). */
export async function interpretCompatibilitySection(
  self: SajuResult,
  partner: SajuResult,
  scores: CompatibilityScores,
  section: CompatibilitySectionKey,
): Promise<string> {
  const anthropic = getClient();

  const payload = {
    ...summarize(self, "본인"),
    ...summarize(partner, "상대방"),
    점수: scores,
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 두 사람의 사주 정보와 궁합 점수를 바탕으로 "${SECTION_LABEL[section]}"을 해석해 주세요.\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
  }
  return textBlock.text.trim();
}
