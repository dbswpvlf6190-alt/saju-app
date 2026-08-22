import Anthropic from "@anthropic-ai/sdk";
import type { PremiumSectionKey, SajuResult } from "@/lib/saju";

const SECTION_LABEL: Record<PremiumSectionKey, string> = {
  love: "연애운",
  wealth: "재물운",
  career: "직업운",
  relationship: "인간관계운",
  yearly: "올해의 흐름",
};

const SYSTEM_PROMPT = `당신은 사주명리학을 이해하기 쉽게 풀어 설명하는 해설가입니다. 다음 원칙을 반드시 지키세요.

1. 갑을병정무기경신임계, 오행 같은 전문 용어를 나열하지 말고, 나오더라도 바로 쉬운 말로 풀어서 설명하세요.
2. "반드시 ~하게 된다", "~할 것이다" 같은 단정적 예언 표현을 피하고, "~한 흐름이 보여요", "~할 가능성이 있어요", "~한 편이에요"처럼 가능성과 경향을 전하는 어조를 사용하세요.
3. 사용자가 실제로 참고할 수 있는 구체적인 조언을 1~2가지 포함하세요.
4. 지나치게 부정적이거나 불안을 조장하는 표현은 쓰지 마세요. 어려움을 언급할 때도 함께 고려할 점을 같이 제시하세요.
5. 주어진 사주 데이터에 없는 사실(직업, 이름, 실제 사건 등)을 지어내지 마세요.
6. 결과는 3~4개 문단, 총 400자 내외의 자연스러운 한국어 존댓말로 작성하세요. 소제목이나 목록 기호 없이 문단으로만 답하세요.`;

export class AiInterpretationError extends Error {}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiInterpretationError(
      "ANTHROPIC_API_KEY 환경변수가 설정되지 않아 AI 해석을 생성할 수 없습니다.",
    );
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

/**
 * 사주 계산 결과를 바탕으로 특정 운세 항목(연애운/재물운/직업운/인간관계운/올해의 흐름)을
 * Claude API로 자연어 해석한다. 결제 후 상세 분석 화면에서만 호출되어야 하며,
 * 호출부(API 라우트)에서 결제 완료 여부를 먼저 검증해야 한다.
 */
export async function interpretSajuSection(
  result: SajuResult,
  section: PremiumSectionKey,
): Promise<string> {
  const anthropic = getClient();

  const sajuSummary = {
    성별: result.input.gender === "male" ? "남성" : "여성",
    년주: result.yearPillar.ganZhiKor,
    월주: result.monthPillar.ganZhiKor,
    일주: result.dayPillar.ganZhiKor,
    시주: result.timePillar?.ganZhiKor ?? "모름",
    일간_오행: result.dayPillar.ganWuxing,
    오행비율: result.wuxingPercent,
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 사주 정보를 바탕으로 "${SECTION_LABEL[section]}"을 해석해 주세요.\n\n${JSON.stringify(
          sajuSummary,
          null,
          2,
        )}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
  }
  return textBlock.text.trim();
}
