import Anthropic from "@anthropic-ai/sdk";
import { getYearGanzhi, type PremiumSectionKey, type SajuResult } from "@/lib/saju";

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
3. 사용자가 실제로 참고할 수 있는 구체적인 조언을 2~3가지 포함하세요.
4. 지나치게 부정적이거나 불안을 조장하는 표현은 쓰지 마세요. 어려움을 언급할 때도 함께 고려할 점을 같이 제시하세요.
5. 주어진 사주 데이터에 없는 사실(직업, 이름, 실제 사건 등)을 지어내지 마세요.
6. 전달받은 오행 비율, 일간, 각 기둥의 간지 같은 구체적인 데이터를 최소 한두 곳 이상 자연스럽게 근거로 활용해서, 이 사람만을 위한 해석처럼 느껴지게 쓰세요(뻔한 일반론으로 채우지 마세요).
7. 아주 중요: 일간이 무슨 오행인지, 오행 비율이 어떻게 분포하는지, 년/월/일/시주가 각각 무엇인지 같은 "사주 기본 정보 설명"은 이 리포트 맨 위에 이미 별도로 안내돼 있습니다. 그러니 답변 서두에서 "태어난 날의 기운이 ~"처럼 기본 정보를 처음부터 다시 요약·재설명하지 마세요. 인사말이나 사주 개요 없이, 첫 문장부터 곧바로 요청받은 주제에 대한 해석으로 시작하세요. 데이터를 근거로 짧게 인용하는 것(예: "일간이 화 기운이라")은 괜찮지만, 그 의미를 처음부터 다시 풀어서 설명하지는 마세요.
8. 결과는 7~9개 문단, 총 1,300~1,600자 분량으로 작성하세요. 1,300자는 반드시 지켜야 할 최소 기준이니, 다 썼다고 느껴져도 분량이 못 미치면 다른 각도(예: 시기별 흐름, 놓치기 쉬운 점, 실천 방법)를 더 추가해서 채우세요. 자연스러운 한국어 존댓말로, 유료 상세 리포트이므로 성급하게 요약하지 말고 충분히 풀어서 설명하세요. 소제목이나 목록 기호 없이 문단으로만 답하세요.`;

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
    max_tokens: 3000,
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

  // stop_reason이 "max_tokens"면 답변이 문장 중간에 그대로 잘린 것이다. 이걸 체크 안 하고
  // 그대로 반환하면, 끊긴 문장이 결제 완료된 정상 리포트인 것처럼 저장·캐싱돼버린다.
  // 여기서 실패로 처리해야 호출부(orders 라우트)의 기존 부분 실패 재시도 로직(missingSections)이
  // 자연스럽게 이 항목만 다시 생성하게 만든다.
  if (message.stop_reason === "max_tokens") {
    throw new AiInterpretationError(
      `AI 응답이 글자수 제한에 걸려 중간에 잘렸습니다 (section=${section}).`,
    );
  }

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
  }
  return textBlock.text.trim();
}

const NEW_YEAR_SYSTEM_PROMPT = `당신은 사주명리학을 이해하기 쉽게 풀어 설명하는 해설가입니다. 4,900원 기본 리포트에 이어 별도로 추가 결제한 "신년운세" 상품이므로, 그 값어치가 느껴지도록 기본 리포트보다 더 깊고 구체적으로 씁니다. 다음 원칙을 반드시 지키세요.

1. 갑을병정무기경신임계, 오행 같은 전문 용어를 나열하지 말고, 나오더라도 바로 쉬운 말로 풀어서 설명하세요.
2. "반드시 ~하게 된다", "~할 것이다" 같은 단정적 예언 표현을 피하고, "~한 흐름이 보여요", "~할 가능성이 있어요", "~한 편이에요"처럼 가능성과 경향을 전하는 어조를 사용하세요.
3. 지나치게 부정적이거나 불안을 조장하는 표현은 쓰지 마세요. 어려움을 언급할 때도 함께 고려할 점을 같이 제시하세요.
4. 주어진 사주 데이터에 없는 사실(직업, 이름, 실제 사건 등)을 지어내지 마세요.
5. 이 사람의 사주(일간 오행·오행 비율)와, 전달받은 "대상 연도 자체의 간지·오행"이 서로 어떻게 만나는지(돕는 관계인지 부딪히는 관계인지)를 최소 두 곳 이상 구체적 근거로 삼아서, 매년 재사용되는 뻔한 신년운세가 아니라 이 사람만을 위한 그 해 운세처럼 쓰세요.
6. 반드시 아래 6개 문단 구조를 소제목 없이(빈 줄로만 문단을 구분) 순서대로 지켜서 쓰세요:
   ① 세운 개요 — 대상 연도의 기운이 이 사람 사주와 만나 어떻게 작용하는지 총평
   ② 상반기(1~6월) 흐름
   ③ 하반기(7~12월) 흐름
   ④ 특히 조심하면 좋을 시기·주제
   ⑤ 특히 기회로 삼으면 좋을 시기·주제
   ⑥ 한 해를 관통하는 실천 조언 2~3가지
7. 전체 분량은 1,800~2,200자를 지키세요. 1,800자는 반드시 지켜야 할 최소 기준이니, 6개 문단을 각각 충분히 풀어서 채우세요. 자연스러운 한국어 존댓말로 쓰고, 목록 기호는 쓰지 마세요(⑥의 실천 조언도 문장으로 풀어서 이어 쓰세요).`;

/**
 * 시즌 한정 업셀 상품("N년 신년운세")을 생성한다. interpretSajuSection과 달리 대상 연도
 * 자체의 세운 간지(getYearGanzhi)를 함께 프롬프트에 넣어, 매년 재사용 가능한 고정 콘텐츠가
 * 아니라 "이 사람 사주 × 그 해 기운"의 조합으로 생성되게 한다.
 */
export async function interpretNewYearFortune(result: SajuResult, targetYear: number): Promise<string> {
  const anthropic = getClient();
  const yearGanzhi = getYearGanzhi(targetYear);

  const sajuSummary = {
    성별: result.input.gender === "male" ? "남성" : "여성",
    년주: result.yearPillar.ganZhiKor,
    월주: result.monthPillar.ganZhiKor,
    일주: result.dayPillar.ganZhiKor,
    시주: result.timePillar?.ganZhiKor ?? "모름",
    일간_오행: result.dayPillar.ganWuxing,
    오행비율: result.wuxingPercent,
    대상_연도: targetYear,
    대상_연도_간지: yearGanzhi.ganZhiKor,
    대상_연도_천간_오행: yearGanzhi.ganWuxing,
    대상_연도_지지_오행: yearGanzhi.zhiWuxing,
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    system: NEW_YEAR_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `다음 사주 정보를 바탕으로 ${targetYear}년 신년운세를 해석해 주세요.\n\n${JSON.stringify(
          sajuSummary,
          null,
          2,
        )}`,
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new AiInterpretationError("AI 응답이 글자수 제한에 걸려 중간에 잘렸습니다 (신년운세).");
  }

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
  }
  return textBlock.text.trim();
}
