import Anthropic from "@anthropic-ai/sdk";
import { calculateSaju, type SajuInput } from "@/lib/saju";
import { buildManualFacts } from "@/lib/saju/manualFacts";
import { getNewYearFacts } from "@/lib/saju/newYearFacts";
import { NEW_YEAR_REPORT_TARGET_YEAR } from "@/lib/payment/config";
import { findBannedOutput } from "./safety";

// AI 사주 상담 답변(2026-11-08). 리포트 생성과 같은 모델을 쓰고, 상담권별 비용 상한을 지키려고 출력 길이를 묶는다.
const MODEL = "claude-sonnet-5";
const MAX_OUTPUT_TOKENS = 900;
// 원/백만 토큰(환경변수로 조정). 비용 상한 계산용 추정치라 넉넉하게 잡는다.
const INPUT_KRW_PER_MTOK = Number(process.env.CONSULT_INPUT_KRW_PER_MTOK) || 4500;
const OUTPUT_KRW_PER_MTOK = Number(process.env.CONSULT_OUTPUT_KRW_PER_MTOK) || 22500;

const SYSTEM_PROMPT = `당신은 '사주랩'의 사주명리학 전문 AI 상담사입니다. 손님은 주로 50대 이상이고, 자기 사주(또는 가족 사주)로 궁금한 것을 묻습니다.

원칙:
1. 전달받은 사주 데이터(일간, 오행 비율, 십성, 올해·내년 흐름, 달별 흐름)를 근거로, 이 사람만을 위한 답을 하세요. 데이터에 없는 사실(직업, 실제 사건, 재산)을 지어내지 마세요.
2. 단정하지 마세요. "반드시", "100%", "~할 것이다" 대신 "~한 흐름이 보여요", "~할 가능성이 있어요"처럼 경향으로 말하세요.
3. 다음은 다루지 않습니다: 질병·건강 상태 판단, 수명·사망 시기, 특정 주식 종목·코인·로또 번호, 법률·의료 판단, 다른 사람 험담. 이런 질문에는 "그 부분은 사주로 말씀드리지 않아요"라고 짧게 밝히고, 대신 사주로 볼 수 있는 흐름(마음가짐, 시기, 관계)으로 이어 주세요.
4. 불안을 키우지 마세요. 조심할 점을 말할 때는 함께 할 수 있는 일을 같이 제시하세요.
5. 전문 용어는 쓰더라도 바로 쉬운 말로 풀어 주세요. 자연스러운 존댓말, 짧은 문장, 문단 3~5개, 총 400~700자. 소제목·목록 기호·이모지 없이 문단으로만 쓰세요.
6. 시기를 물으면 달별 흐름 데이터에서 근거가 되는 달을 짚어 주세요.
7. 마지막 줄에 "다음에 물어볼 만한 것:" 뒤에 이 사람에게 도움이 될 짧은 질문 2개를 " / "로 이어서 적으세요.`;

export class ConsultAiError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ConsultAiError("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export interface ConsultTurn {
  role: "user" | "assistant";
  content: string;
}

export function buildConsultFacts(input: SajuInput, now: Date = new Date()) {
  const result = calculateSaju(input);
  const manual = buildManualFacts(result, now);
  const ny = getNewYearFacts(result, NEW_YEAR_REPORT_TARGET_YEAR);
  return { 내_사주: manual, [`${NEW_YEAR_REPORT_TARGET_YEAR}년_흐름`]: ny };
}

export function estimateCostKrw(inputTokens: number, outputTokens: number): number {
  return Math.ceil((inputTokens * INPUT_KRW_PER_MTOK + outputTokens * OUTPUT_KRW_PER_MTOK) / 1_000_000);
}

/** 질문 하나에 답한다. 금지 표현이 섞이면 한 번 다시 쓰게 하고, 그래도 남으면 그 문장을 빼서 돌려준다. */
export async function answerConsultQuestion(opts: {
  facts: unknown;
  who: string;
  history: ConsultTurn[];
  question: string;
}): Promise<{ text: string; costKrw: number }> {
  const anthropic = getClient();
  const context = `상담 대상: ${opts.who}\n사주 데이터(JSON):\n${JSON.stringify(opts.facts)}`;
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: context },
    { role: "assistant", content: "네, 이 사주 데이터를 바탕으로 답해 드릴게요." },
    ...opts.history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user", content: opts.question },
  ];

  let costKrw = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      thinking: { type: "disabled" },
      system: attempt === 0 ? SYSTEM_PROMPT : `${SYSTEM_PROMPT}\n\n주의: 앞 답변에 다루지 않는 주제나 단정 표현이 섞였어요. 원칙 2·3을 지켜 다시 써 주세요.`,
      messages,
    });
    costKrw += estimateCostKrw(msg.usage.input_tokens, msg.usage.output_tokens);
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) continue;
    if (findBannedOutput(text).length === 0) return { text, costKrw };
    if (attempt === 1) {
      const safe = text
        .split(/(?<=[.!?요])\s+/)
        .filter((s) => findBannedOutput(s).length === 0)
        .join(" ");
      return { text: safe || "그 부분은 사주로 말씀드리지 않아요. 다른 궁금한 점을 물어봐 주세요.", costKrw };
    }
  }
  throw new ConsultAiError("답변을 만들지 못했습니다.");
}
