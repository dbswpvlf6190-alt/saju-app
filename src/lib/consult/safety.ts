// AI 상담 안전 규칙(docs/ai-consult-design.md 4절). 토스 검수(건강·단정 예언 금지)와 AI 기본법 고지를 함께 지킨다.

export const MAX_QUESTION_CHARS = 300;

/** 자해·극단 선택 신호. 이런 질문에는 운세 대신 상담 전화를 먼저 안내한다. */
const CRISIS_PATTERNS = [/죽고\s*싶/, /자살/, /목숨을\s*끊/, /사라지고\s*싶/, /살기\s*싫/, /극단(적)?\s*선택/, /해치고\s*싶/];

export const CRISIS_REPLY =
  "지금 많이 힘드신 마음이 느껴져요. 이런 때에는 사주 풀이보다 사람과 이야기 나누는 것이 먼저예요.\n\n" +
  "· 자살예방상담전화 109 (24시간)\n· 정신건강위기상담 1577-0199\n\n" +
  "혼자 견디지 않으셔도 돼요. 마음이 조금 편해지시면 그때 다시 이야기 나눠요.";

export function isCrisisQuestion(question: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(question));
}

/** 다루지 않는 주제: 건강·수명·사망, 투자 종목·코인·로또 번호. 답은 하되 이 부분은 정중히 빼도록 지시와 검사를 함께 둔다. */
const BANNED_OUTPUT_PATTERNS = [
  /수명/, /사망/, /죽(는|을)\s*(해|때|나이)/, /(암|당뇨|치매|뇌졸중|심장병)에?\s*(걸|조심)/, /병에\s*걸/,
  /반드시\s*(돈|성공|이혼|결혼|합격)/, /100\s*%/, /로또\s*번호/, /(종목|코인)\s*(추천|사세요|매수)/,
];

// "수명은 사주로 말씀드리지 않아요"처럼 거절하는 문장은 금지어가 들어 있어도 괜찮다. 전에는 이 문장까지 걸려
// 다시 쓰기(비용 2배)와 문장 빼기가 일어났다(11/9 품질 점검 Q9).
const REFUSAL = /(말씀드리지|다루지|답하지|알려\s*드리지|봐\s*드리지)\s*않/;

export function findBannedOutput(text: string): string[] {
  const checked = text
    .split(/(?<=[.!?요])\s+|\n+/)
    .filter((s) => !REFUSAL.test(s))
    .join(" ");
  return BANNED_OUTPUT_PATTERNS.filter((re) => re.test(checked)).map((re) => re.source);
}

export const AI_NOTICE = "명리학 원리로 계산하고 AI가 정리한 풀이예요 · 참고용";
