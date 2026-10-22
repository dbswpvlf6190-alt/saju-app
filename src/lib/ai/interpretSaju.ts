import Anthropic from "@anthropic-ai/sdk";
import { getYearGanzhi, type PremiumSectionKey, type SajuResult } from "@/lib/saju";
import type { Group } from "@/lib/saju/goodYears";
import { getNewYearFacts } from "@/lib/saju/newYearFacts";

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
    // 이 작업은 정해진 분량의 글을 쓰는 것뿐이라 사고 과정이 필요 없다. Sonnet 5는 기본적으로 적응형 사고가 켜져 있어서,
    // 끄지 않으면 사고 토큰이 max_tokens 예산을 먼저 써버려 글이 중간에 잘리고(실패로 처리돼 "리포트 준비 중"으로 남음) 만다.
    thinking: { type: "disabled" },
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

const NEW_YEAR_SYSTEM_PROMPT = `당신은 사주명리학을 이해하기 쉽게 풀어 설명하는 해설가입니다. 별도로 결제한 "신년운세" 상품이므로, 그 값어치가 느껴지도록 구체적으로 씁니다. 읽는 사람은 결제한 본인이니 "이 사람" 같은 3인칭을 쓰지 말고, 주어를 생략하거나 "올해 당신은"처럼 본인에게 직접 말하세요. 다음 원칙을 반드시 지키세요.

1. 갑을병정무기경신임계, 오행, 십성 같은 전문 용어를 나열하지 말고, 나오더라도 바로 쉬운 말로 풀어서 설명하세요.
2. "반드시 ~하게 된다", "~할 것이다" 같은 단정적 예언 표현을 피하고, "~한 흐름이 보여요", "~할 가능성이 있어요", "~한 편이에요"처럼 가능성과 경향을 전하는 어조를 사용하세요.
3. 지나치게 부정적이거나 불안을 조장하는 표현은 쓰지 마세요. 어려움을 언급할 때도 함께 고려할 점을 같이 제시하세요.
4. 주어진 사주 데이터에 없는 사실(직업, 이름, 실제 사건 등)을 지어내지 마세요.
5. 월별 내용은 반드시 전달받은 "월별_사실"만 근거로 쓰세요. 각 월의 "기운_뜻"과 "일지와의_관계"를 바탕으로 쓰고, 데이터에 없는 월의 특징을 지어내지 마세요. "일지와의_관계"가 충이면 부딪히거나 흔들리기 쉬운 흐름, 합이면 끌리고 맺어지는 흐름으로 풀되 좋다·나쁘다로 단정하지 마세요.
6. 대상 연도의 기운이 내 사주와 만나는 방식은 "세운_사실"의 "기운_뜻"과 "내_사주와의_충합"을 근거로 쓰세요.
7. 사주에서 해가 바뀌는 시점은 1월 1일이 아니라 입춘입니다. 월별_사실에서 "입춘전"이 true인 달이 있으면, 그 달은 아직 지난해 기운이 이어지는 달이라는 점을 해당 월 줄에 한마디로 알려주세요.
8. 건강, 질병, 신체 증상, 사고, 죽음, 재난에 관한 내용은 쓰지 마세요("몸이 무거워질", "위장", "체력 저하" 같은 표현 금지). 컨디션 이야기가 필요하면 "쉬어가기", "페이스 조절" 같은 생활 습관 표현만 쓰세요. 점수나 등급(예: 80점, 상·중·하)도 매기지 마세요.
9. 마크다운(#, **)은 쓰지 마세요. 아래 구조를 순서대로, 각 소제목은 "■ "로 시작하는 한 줄로 쓰세요:
   ■ 2027 총평 — 2~3문단. 세운과 내 사주가 만나는 방식
   ■ 분기별 키워드 — 1~3월, 4~6월, 7~9월, 10~12월을 각각 한 줄(키워드 + 이 시기에 쓰면 좋은 에너지). 분기 구분은 양력 기준
   ■ 월별 흐름 — 1월부터 12월까지 한 줄씩 "1월 — ..." 형식. 각 줄은 40~70자, 그 달의 흐름과 권장 행동 하나
   ■ 조심하면 좋은 달 — 1~2개 달을 월별_사실 근거와 함께
   ■ 기회로 삼으면 좋은 달 — 1~2개 달을 월별_사실 근거와 함께
   ■ 영역별 한 줄 — 일, 돈, 사람 세 가지를 각각 한 줄
   ■ 실천 조언 3가지 — 오늘부터 시작할 수 있는 구체적 행동 3개(번호 없이 줄바꿈)
10. 전체 분량은 공백 포함 1,900~2,600자를 지키세요. 1,900자는 최소 기준이니 총평과 조심·기회 달 설명을 충분히 풀어 쓰세요. 자연스러운 한국어 존댓말로 쓰세요.`;

/** 신년운세 프롬프트에 넣는 쉬운 뜻풀이. 십성 용어를 AI가 임의로 해석하지 않도록 코드에서 고정한다. */
const GROUP_PLAIN: Record<Group, string> = {
  비겁: "나와 같은 기운이 늘어나는 흐름(자기 힘, 동료, 경쟁, 내 뜻대로 하려는 마음)",
  식상: "표현하고 만들어내는 흐름(말과 재능, 아이디어, 활동량)",
  재성: "돈과 성과를 다루는 흐름(현실적인 결과, 관리, 실속)",
  관성: "책임과 자리, 규칙이 따라붙는 흐름(역할, 평가, 조직)",
  인성: "도움과 배움이 들어오는 흐름(조언, 공부, 보호, 쉬어갈 여유)",
};

/**
 * 시즌 한정 업셀 상품("N년 신년운세")을 생성한다. interpretSajuSection과 달리 대상 연도
 * 자체의 세운 간지(getYearGanzhi)를 함께 프롬프트에 넣어, 매년 재사용 가능한 고정 콘텐츠가
 * 아니라 "이 사람 사주 × 그 해 기운"의 조합으로 생성되게 한다.
 */
export async function interpretNewYearFortune(result: SajuResult, targetYear: number): Promise<string> {
  const anthropic = getClient();
  const yearGanzhi = getYearGanzhi(targetYear);
  const facts = getNewYearFacts(result, targetYear);

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
    세운_사실: {
      기운_뜻: GROUP_PLAIN[facts.yearStemGroup],
      내_사주와의_충합: facts.yearBranchRelations.length
        ? facts.yearBranchRelations.map((r) => `해의 지지가 내 ${r.pillar}와 ${r.relation}`)
        : ["내 사주 네 자리와 직접 부딪히거나 맺어지는 관계는 없음"],
      입춘: facts.ipchun,
    },
    월별_사실: facts.months.map((m) => ({
      월: `${m.month}월`,
      월간지: m.ganzhiKor,
      기운_뜻: GROUP_PLAIN[m.stemGroup],
      일지와의_관계: m.branchVsDay ?? "없음",
      입춘전: m.beforeIpchun,
    })),
  };

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8000,
    // 이 작업은 정해진 분량의 글을 쓰는 것뿐이라 사고 과정이 필요 없다. Sonnet 5는 기본적으로 적응형 사고가 켜져 있어서,
    // 끄지 않으면 사고 토큰이 max_tokens 예산을 먼저 써버려 글이 중간에 잘리고(실패로 처리돼 "리포트 준비 중"으로 남음) 만다.
    thinking: { type: "disabled" },
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
