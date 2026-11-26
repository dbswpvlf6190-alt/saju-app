import Anthropic from "@anthropic-ai/sdk";
import { getYearGanzhi, type PremiumSectionKey, type SajuResult } from "@/lib/saju";
import type { Group } from "@/lib/saju/goodYears";
import { getNewYearFacts } from "@/lib/saju/newYearFacts";
import { buildNewYearHook, weekdayKor } from "@/lib/saju/newYearHook";

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

// 2026-11-26 품질경영(사장님 결정): 신년운세 3,900원 → 29,000원. 값에 맞게 2,000자대 글을 약 8,000자 3부 구성으로 늘렸다.
// 한 번에 길게 쓰면 Vercel 함수 제한(60초)을 넘기므로 세 부분을 동시에 쓰고 순서대로 붙인다(NEW_YEAR_PARTS).
const NEW_YEAR_RULES = `당신은 사주명리학을 이해하기 쉽게 풀어 설명하는 해설가입니다. 29,000원을 내고 산 "신년운세" 상품이므로, 그 값어치가 느껴지도록 이 사람의 사주 데이터에 딱 맞춰 구체적으로 씁니다. 뻔한 일반론(누구에게나 맞는 말)으로 채우지 마세요. 읽는 사람은 결제한 본인이니 "이 사람" 같은 3인칭을 쓰지 말고, 주어를 생략하거나 "올해 당신은"처럼 본인에게 직접 말하세요. 읽는 분은 50~60대가 많으니 쉬운 말로, 한 문장은 짧게(50자 안팎) 쓰고 어려운 한자어·영어는 쓰지 마세요. 다음 원칙을 반드시 지키세요.

1. 갑을병정무기경신임계, 오행, 십성 같은 전문 용어를 나열하지 말고, 나오더라도 바로 쉬운 말로 풀어서 설명하세요.
2. "반드시 ~하게 된다", "~할 것이다" 같은 단정적 예언 표현을 피하고, "~한 흐름이 보여요", "~할 가능성이 있어요", "~한 편이에요"처럼 가능성과 경향을 전하는 어조를 사용하세요.
3. 불안을 조장하는 말은 쓰지 마세요. "조심", "위험", "나쁜 달", "불운" 같은 겁주는 표현 대신, 어려운 달도 "차분히 챙기면 좋은 달", "서두르지 않으면 좋은 달"처럼 해볼 수 있는 일로 말하세요.
4. 주어진 사주 데이터에 없는 사실(직업, 결혼 여부, 자녀 유무, 이름, 실제 사건 등)을 지어내지 마세요. 가족·인연 이야기는 누구에게나 해당되게(부부·자녀·부모·형제·친구 중 상황에 맞게 읽히도록) 쓰세요.
5. 월별 내용은 반드시 전달받은 "월별_사실"만 근거로 쓰세요. 각 월의 "제목", "기운_뜻", "일지와의_관계", "좋은_날짜", "재물", "사람", "할_일"을 바탕으로 쓰고, 데이터에 없는 월의 특징을 지어내지 마세요. 날짜를 쓰려면 반드시 그 달의 "좋은_날짜" 중에서만 고르고 새 날짜를 만들지 마세요. "일지와의_관계"가 충이면 마음이 엇갈리기 쉬운 흐름, 합이면 끌리고 맺어지는 흐름으로 풀되 좋다·나쁘다로 단정하지 마세요.
6. 대상 연도의 기운이 내 사주와 만나는 방식은 "세운_사실"의 "기운_뜻"과 "내_사주와의_충합", 그리고 "오행비율"을 근거로 쓰세요. 한 해를 부를 때는 "한_해_이름"을 그대로 쓰세요(결제 전 미리보기 카드와 같은 이름이어야 합니다). "가장 좋은 달"이라고 부를 수 있는 달은 "가장_좋은_두_달"뿐입니다. 다른 달에는 "가장", "두 번째로 좋은" 같은 순위를 붙이지 말고, 그 달의 "제목"으로만 말하세요. "내_사주와의_충합"이 없어도 월별_사실에 충·합이 있는 달은 따로 있으니 "한 해 내내 부딪히는 기운이 없다"고 쓰지 마세요.
7. 사주에서 해가 바뀌는 시점은 1월 1일이 아니라 입춘입니다. 월별_사실에서 "입춘전"이 true인 달이 있으면, 그 달은 아직 지난해 기운이 이어지는 달이라는 점을 알려주세요.
8. 건강, 질병, 신체 증상, 사고, 죽음, 재난에 관한 내용은 쓰지 마세요("몸이 무거워질", "위장", "체력 저하" 같은 표현 금지). 컨디션 이야기가 필요하면 "쉬어가기", "페이스 조절" 같은 생활 습관 표현만 쓰세요. 점수나 등급(예: 80점, 상·중·하)도 매기지 마세요. 투자 종목·금액 추천, 법률·세무 판단도 하지 마세요.
9. 마크다운(#, **, -)은 쓰지 마세요. 소제목은 "■ "로 시작하는 한 줄로 쓰고, 아래에 지정한 소제목만 지정한 순서대로 쓰세요. 인사말이나 맺음 인사는 지정한 곳 외에는 쓰지 마세요.
10. 이 글은 세 부분으로 나눠 따로 쓰고 이어 붙입니다. 지금 맡은 부분만 쓰고, 다른 부분의 내용(총평·월별 흐름 등)을 미리 쓰거나 되풀이하지 마세요. 자연스러운 한국어 존댓말로 쓰세요.`;

export const NEW_YEAR_PARTS = [
  {
    key: "overview",
    structure: `이번에 맡은 부분: 1부(한 해 큰 그림). 아래 소제목 세 개를 순서대로 쓰세요.
■ 2027 총평 — 4~5문단. 첫 문장에 한_해_이름을 그대로 넣어 이 해를 한마디로 말하고, 세운과 내 사주가 만나는 방식, 상반기와 하반기의 흐름 차이, 이 해를 가장 잘 쓰는 마음가짐까지
■ 내 사주가 2027년을 받는 방식 — 2~3문단. 오행비율에서 많은 기운과 적은 기운이 정미년(대상_연도_천간_오행·대상_연도_지지_오행)과 어떻게 만나는지, 그래서 어떤 일은 잘 붙고 어떤 일은 천천히 가야 하는지 쉬운 말로
■ 분기별 흐름 — "1~3월 — ...", "4~6월 — ...", "7~9월 — ...", "10~12월 — ..." 네 줄. 각 줄은 키워드로 시작해 2~3문장(100~160자). 분기 구분은 양력 기준
분량: 공백 포함 2,000~2,600자. 2,000자는 최소 기준입니다.`,
  },
  {
    key: "months",
    structure: `이번에 맡은 부분: 2부(열두 달). 아래 소제목 하나만 쓰세요.
■ 월별 흐름 — 1월부터 12월까지 "1월 — ..." 형식으로 열두 달을 빠짐없이. 한 달은 줄바꿈 없이 한 문단(160~230자)으로 쓰세요. 각 달마다 ① 그 달 흐름과 마음가짐 ② "재물"·"사람"·"할_일" 중 그 달에 가장 중요한 한 가지를 이 사람에게 맞게 풀이 ③ 좋은_날짜 중 하루를 골라 그날 해 보면 좋은 일 한 가지를 담으세요. 좋은_날짜가 비어 있는 달은 ③ 대신 그 달을 차분히 보내는 방법을 쓰세요.
분량: 공백 포함 2,200~2,800자. 2,200자는 최소 기준입니다.`,
  },
  {
    key: "areas",
    structure: `이번에 맡은 부분: 3부(영역별 풀이와 실천). 아래 소제목 여덟 개를 순서대로 쓰세요.
■ 일과 역할 — 2문단. 일·직장·사업·집안일 등 맡은 역할 전반. 흐름이 잘 붙는 달을 월별_사실 근거로 짚어 주세요
■ 재물과 돈 관리 — 2문단. 들어오는 흐름과 지키는 방법. 재물_달을 근거로 짚되 투자 종목·금액은 말하지 마세요
■ 가족과 집안 — 2문단. 가까운 사람과의 거리, 함께하면 좋은 달
■ 사람과 인연 — 2문단. 새로 만나는 인연과 오래된 관계. 일지와의_관계(합·충)가 있는 달을 근거로
■ 이사·계약·큰 결정 — 1~2문단. 큰 결정을 하기 좋은 달과 미루면 좋은 달을 월별_사실 근거로
■ 차분히 챙기면 좋은 달 — 1~2개 달을 월별_사실 근거와 함께, 해볼 수 있는 일 중심으로
■ 기회로 삼으면 좋은 달 — 가장_좋은_두_달을 중심으로 월별_사실 근거와 함께
■ 2027 실천 계획 — "1~3월 — ...", "4~6월 — ...", "7~9월 — ...", "10~12월 — ..." 네 줄. 분기마다 오늘부터 할 수 있는 구체적 행동 한두 가지. 이어서 마지막 줄에 이 해를 보내는 분께 드리는 따뜻한 한마디(1~2문장)
분량: 공백 포함 2,800~3,500자. 2,800자는 최소 기준입니다.`,
  },
] as const;

/** 신년운세 시스템 프롬프트(부분별). 공통 원칙 + 그 부분의 구조. */
export function newYearSystemPrompt(part: (typeof NEW_YEAR_PARTS)[number]): string {
  return `${NEW_YEAR_RULES}\n\n${part.structure}`;
}

/** 시험·검수용: 세 부분 프롬프트를 모두 이은 것. */
export const NEW_YEAR_SYSTEM_PROMPT = NEW_YEAR_PARTS.map(newYearSystemPrompt).join("\n\n---\n\n");

/** 신년운세 프롬프트에 넣는 쉬운 뜻풀이. 십성 용어를 AI가 임의로 해석하지 않도록 코드에서 고정한다. */
const GROUP_PLAIN: Record<Group, string> = {
  비겁: "나와 같은 기운이 늘어나는 흐름(자기 힘, 동료, 경쟁, 내 뜻대로 하려는 마음)",
  식상: "표현하고 만들어내는 흐름(말과 재능, 아이디어, 활동량)",
  재성: "돈과 성과를 다루는 흐름(현실적인 결과, 관리, 실속)",
  관성: "책임과 자리, 규칙이 따라붙는 흐름(역할, 평가, 조직)",
  인성: "도움과 배움이 들어오는 흐름(조언, 공부, 보호, 쉬어갈 여유)",
};

/**
 * 신년운세 프롬프트에 넣는 사주·계산 사실. 화면(토스 v11 카드·유료 화면)이 보여주는 계산값(달 제목·좋은 날짜·한 해 이름)을
 * 그대로 넣어, AI 글이 결제 전 미리보기와 다른 이름·날짜를 말하지 않게 한다. 순수 함수라 테스트한다.
 */
export function buildNewYearPayload(result: SajuResult, targetYear: number) {
  const yearGanzhi = getYearGanzhi(targetYear);
  const facts = getNewYearFacts(result, targetYear);
  const hook = buildNewYearHook(result, targetYear);
  const dayLabel = (month: number, day: number) => `${day}일(${weekdayKor(targetYear, month, day)})`;

  return {
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
    // 결제 전 미리보기 카드와 같은 이름·달(계산값). 총평 첫 문장과 기회의 달은 이것을 따른다.
    한_해_이름: hook.label,
    가장_좋은_두_달: hook.best.map((m) => `${m.month}월 ${m.title}`),
    세운_사실: {
      기운_뜻: GROUP_PLAIN[facts.yearStemGroup],
      내_사주와의_충합: facts.yearBranchRelations.length
        ? facts.yearBranchRelations.map((r) => `해의 지지가 내 ${r.pillar}와 ${r.relation}`)
        : ["내 사주 네 자리와 직접 부딪히거나 맺어지는 관계는 없음"],
      입춘: facts.ipchun,
    },
    월별_사실: facts.months.map((m) => {
      const flow = hook.flow[m.month - 1];
      return {
        월: `${m.month}월`,
        월간지: m.ganzhiKor,
        제목: flow.title,
        기운_뜻: GROUP_PLAIN[m.stemGroup],
        일지와의_관계: m.branchVsDay ?? "없음",
        좋은_날짜: flow.goodDays.map((d) => dayLabel(m.month, d)),
        // 결제 후 달 카드가 보여 주는 계산값(재물·사람·할 일)을 그대로 넣어 AI 글이 카드와 다른 말을 하지 않게 한다.
        재물: flow.money,
        사람: flow.people,
        할_일: flow.tip,
        재물_달: flow.group === "재성",
        입춘전: m.beforeIpchun,
      };
    }),
  };
}

/**
 * 시즌 한정 상품("N년 신년운세")을 생성한다. interpretSajuSection과 달리 대상 연도
 * 자체의 세운 간지와 월별 계산값(buildNewYearPayload)을 함께 프롬프트에 넣어, 매년 재사용 가능한 고정 콘텐츠가
 * 아니라 "이 사람 사주 × 그 해 기운"의 조합으로 생성되게 한다.
 * 2026-11-26: 세 부분(NEW_YEAR_PARTS)을 동시에 쓰고 순서대로 붙인다. 한 부분이라도 실패하면 전체를 실패로 돌려
 * 다음 조회 때 다시 만든다(반쪽짜리 글을 저장하지 않는다).
 */
export async function interpretNewYearFortune(result: SajuResult, targetYear: number): Promise<string> {
  const anthropic = getClient();
  const sajuSummary = buildNewYearPayload(result, targetYear);
  const userContent = `다음 사주 정보를 바탕으로 ${targetYear}년 신년운세를 해석해 주세요.\n\n${JSON.stringify(sajuSummary, null, 2)}`;

  const parts = await Promise.all(
    NEW_YEAR_PARTS.map(async (part) => {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 6000,
        // 정해진 분량의 글을 쓰는 것뿐이라 사고 과정이 필요 없다. 켜 두면 사고 토큰이 max_tokens를 먼저 써서 글이 잘린다.
        thinking: { type: "disabled" },
        system: newYearSystemPrompt(part),
        messages: [{ role: "user", content: userContent }],
      });
      if (message.stop_reason === "max_tokens") {
        throw new AiInterpretationError(`AI 응답이 글자수 제한에 걸려 중간에 잘렸습니다 (신년운세 ${part.key}).`);
      }
      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new AiInterpretationError("AI 응답에서 텍스트를 찾지 못했습니다.");
      }
      return textBlock.text.trim();
    }),
  );
  return parts.join("\n\n");
}
