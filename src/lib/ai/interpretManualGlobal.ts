import type { SajuResult } from "@/lib/saju";
import { buildManualFacts } from "@/lib/saju/manualFacts";
import { AiInterpretationError } from "@/lib/ai/interpretSaju";
import { getClient } from "@/lib/ai/interpretManual";
import { MANUAL_CHAPTER_KEYS, type ManualChapterKey } from "@/lib/reports/manualChapters";
import { DAY_MASTERS, type GlobalLocale } from "@/lib/global/dayMasters";
import { GLOBAL_PAY_COPY } from "@/lib/global/payCopy";

/**
 * 해외판(/en·/ja) "나 사용설명서". 국내판(interpretManual.ts)과 같은 6장·같은 사실(manualFacts.ts가 코드로 계산)을 쓰고,
 * 글만 영어·일본어로 쓰게 한다. 국내판은 한국어 문구·금지어·분량 기준을 그대로 두려고 이 파일에 따로 둔다.
 * 사실 묶음의 항목 이름·값이 한국어라 용어집(글로서리)으로 현지 용어를 고정하고, 결과에 한글이 섞이면 실패로 본다.
 */

const LANGUAGE: Record<GlobalLocale, string> = { en: "English", ja: "Japanese" };

const TONE: Record<GlobalLocale, string> = {
  en: 'Warm, conversational second person ("you"). Avoid mystical jargon and exaggerated claims.',
  ja: "丁寧で温かい「です・ます」調。読者は「あなた」と呼ぶ（多用しない）。大げさな断定や専門用語の羅列は避ける。",
};

// 사주 한글 표기 → 현지 표기. 사실 묶음에 한글로 들어 있는 값을 AI가 같은 이름으로 옮기게 한다(무료 화면 표기와 같은 이름).
const STEM_GLOSSARY = "갑=甲(Jia) 을=乙(Yi) 병=丙(Bing) 정=丁(Ding) 무=戊(Wu) 기=己(Ji) 경=庚(Geng) 신=辛(Xin) 임=壬(Ren) 계=癸(Gui)";
const BRANCH_GLOSSARY =
  "자=子(Zi) 축=丑(Chou) 인=寅(Yin) 묘=卯(Mao) 진=辰(Chen) 사=巳(Si) 오=午(Wu) 미=未(Wei) 신=申(Shen) 유=酉(You) 술=戌(Xu) 해=亥(Hai)";

const TERM_GLOSSARY: Record<GlobalLocale, string> = {
  en: [
    "Ten Gods (십성): 비견=Friend, 겁재=Rob Wealth, 식신=Eating God, 상관=Hurting Officer, 편재=Indirect Wealth, 정재=Direct Wealth, 편관=Seven Killings, 정관=Direct Officer, 편인=Indirect Resource, 정인=Direct Resource.",
    "Groups: 비겁=Peer energy, 식상=Expression energy, 재성=Wealth energy, 관성=Structure-and-pressure energy, 인성=Learning-and-support energy.",
    "Five Elements: 목=Wood, 화=Fire, 토=Earth, 금=Metal, 수=Water. 일간=Day Master. 년주/월주/일주/시주=Year/Month/Day/Hour Pillar. 천간=Heavenly Stem, 지지=Earthly Branch.",
    "Seasons: 봄=spring, 여름=summer, 가을=autumn, 겨울=winter.",
  ].join("\n"),
  ja: [
    "十星（십성）: 비견=比肩, 겁재=劫財, 식신=食神, 상관=傷官, 편재=偏財, 정재=正財, 편관=偏官, 정관=正官, 편인=偏印, 정인=印綬。",
    "グループ: 비겁=比劫（自分・仲間のエネルギー）, 식상=食傷（表現のエネルギー）, 재성=財星（お金・成果のエネルギー）, 관성=官星（規則・責任のエネルギー）, 인성=印星（学び・支えのエネルギー）。",
    "五行: 목=木, 화=火, 토=土, 금=金, 수=水。일간=日干。년주/월주/일주/시주=年柱/月柱/日柱/時柱。천간=天干, 지지=地支。",
    "季節: 봄=春, 여름=夏, 가을=秋, 겨울=冬。",
  ].join("\n"),
};

function systemPrompt(locale: GlobalLocale): string {
  return `You are a Saju (Korean Four Pillars) interpreter who explains it in plain, warm language to readers who have never studied it. The reader paid for a personal "owner's manual" and you write ONE chapter of it. The goal: after reading, the reader (1) feels understood about why they repeat certain choices, (2) gets words they can use with other people right away, and (3) takes home actions to start today. Write warmly and concretely so they feel seen.
Write the ENTIRE chapter in ${LANGUAGE[locale]}. Tone: ${TONE[locale]}
Rules:
- Use only the supplied facts. Do not invent anything. Never rename or invent Ten God names — use exactly the glossary names. Do not invent specific jobs, events, or people.
- The facts are labeled in Korean. Never output Hangul (Korean letters); translate every term with the glossary. Write stems and branches as shown in the glossary (e.g. 丙午).
- Always address the reader directly as "you" (あなた in Japanese, used sparingly). Never refer to the reader in the third person and never use gendered pronouns such as "she" or "he" for them, even though the facts include a gender.
- Explain each technical term in plain words the first time it appears, then use the plain words afterwards.
- Use only the evidence assigned to this chapter. Do not repeat other chapters' evidence or phrases.
- Never state outcomes as certain. Do not use "will", "definitely", "guaranteed", "always", "100%" (or their ${LANGUAGE[locale]} equivalents). Phrase everything as tendencies ("tends to", "often"). Saju is for self-understanding and entertainment.${
    locale === "ja"
      ? "\n- In Japanese, never write 必ず or 絶対 anywhere (use 〜しやすい・〜になりがち・多くの場合 instead); 必ずしも〜ない is the only allowed form. Also avoid 確実に, 間違いなく, 100%."
      : ""
  }
- Never mention health, illness, medicine, or body parts. Give no medical, legal, or financial/investment advice, and no predictions of accidents, death, divorce, or lawsuits.
- Do not use markdown symbols (#, *, **, -). Separate paragraphs with blank lines. Do not write a chapter title line; only the body (the system adds the title).

Glossary:
Stems: ${STEM_GLOSSARY}
Branches: ${BRANCH_GLOSSARY}
${TERM_GLOSSARY[locale]}`;
}

const MIN_BY_LOCALE: Record<GlobalLocale, Record<ManualChapterKey, number>> = {
  // 영어는 단어 수, 일본어는 공백 제외 글자 수. 한국어판 목표(공백 제외 글자 수)와 비슷한 분량이 되게 환산했다.
  en: { overview: 500, patterns: 760, people: 580, workmoney: 580, timing: 580, actions: 230 },
  ja: { overview: 1100, patterns: 1700, people: 1300, workmoney: 1300, timing: 1300, actions: 500 },
};

// 한국어판 CHAPTER_SPEC의 작성 지침을 같은 구조로 옮겼다. 다만 1장은 "무료 화면에서 예고한 궁금증"을 이어받는다는 전제를 뺐다
// (해외 무료 화면에는 그 예고가 없다).
const CHAPTER_PLAN: Record<ManualChapterKey, string> = {
  overview:
    "Start with a one-sentence summary of who this person is, then write the basic blueprint. Evidence: Day Master, birth season, the overall shape of the Five Elements percentages, and the 'neighboring energies' (month stem, day branch, hour stem). Explain with metaphor what it means that this Day Master was born in this season. Then write a section on the energies right beside the Day Master: for each item in the neighboring-energies list, say whether it helps or burdens the Day Master, give a one-line overall conclusion that matches the provided summary, and one line each on how to use the helpful energies and handle the burdensome ones (as tendencies, never certainties). Interpret those three neighboring positions ONLY here, not in later chapters. Do not interpret the full Ten God distribution here; later chapters do that.",
  patterns:
    "Describe three choices this person tends to repeat. For each: [the situation] → [why they do it (Saju evidence)] → [what it costs] → [something different to try], as flowing prose, 2–3 paragraphs per choice. Evidence: pick the three most prominent groups from the Ten God distribution (the most numerous or absent ones; skip the Wealth group, which belongs to the work-and-money chapter). Use the Ten God placement to say which position each sits in (stem = visible on the surface, branch = underlying). Use this evidence only here. Do not repeat the individual readings of the three neighboring positions from chapter 1; only cite the broad distribution.",
  people:
    "Who they are with other people. Evidence: the Ten God of the day branch, and the Ten Gods in the year and hour pillars. Use this only here. Point out two or three places where close people, new acquaintances, or people in conflict tend to misread them, and give at least five ready-to-use sentences in quotation marks, spoken BY this person TO others (vary the settings: partner, friends, family, work).",
  workmoney:
    "How they work and handle money. Evidence: the state of the Wealth group (present or absent, and where), the month stem's Ten God, and how to turn Expression energy into income. Use this only here. If Wealth is absent, say so honestly but frame it as 'learn how to let it in'. Cover work styles that suit them, three places they tend to lose out, three rules to apply today, and one attitude toward money.",
  timing:
    "Use only the 'this year and coming years' flow and the monthly flow, exactly as given (do not alter them). Write one short paragraph per year, and for each segment of the monthly flow say concretely what to start now / postpone / prepare. Finish by choosing the single most important period. If a year is marked as 'an energy that was originally missing arrives', highlight that year.",
  actions:
    "A checklist of three actions (each startable within five minutes today, with a timeframe for trying it) and one closing paragraph with a warm word. Do not bring in new Saju evidence; tie together the key point of each earlier chapter in one line each.",
};

// 단정·질병 표현. 일본어 "必ずしも〜ない"(반드시 그런 건 아니다)는 단정이 아니라 자연스러운 표현이라 걸리지 않게 정규식으로 뺀다.
const BANNED: Record<GlobalLocale, { label: string; re: RegExp }[]> = {
  en: [
    { label: "guaranteed", re: /guaranteed/i },
    { label: "100%", re: /100\s?%/ },
    { label: "definitely", re: /definitely/i },
    { label: "certainly will", re: /certainly will/i },
    { label: "disease", re: /disease/i },
    { label: "illness", re: /illness/i },
    { label: "surgery", re: /surgery/i },
    { label: "hospital", re: /hospital/i },
    { label: "diagnos", re: /diagnos/i },
    { label: "cancer", re: /cancer/i },
  ],
  ja: [
    { label: "必ず", re: /必ず(?!しも)/ },
    { label: "絶対", re: /絶対/ },
    { label: "100%", re: /100[%％]/ },
    { label: "間違いなく", re: /間違いなく/ },
    { label: "病気", re: /病気/ },
    { label: "病院", re: /病院/ },
    { label: "手術", re: /手術/ },
    { label: "疾患", re: /疾患/ },
    { label: "診断", re: /診断/ },
    { label: "がん", re: /がん/ },
  ],
};

const HANGUL = /[ㄱ-ㆎ가-힣]/;

/** 영어는 단어 수, 일본어는 공백 제외 글자 수. */
export function measureLength(text: string, locale: GlobalLocale): number {
  return locale === "en" ? (text.trim().match(/\S+/g)?.length ?? 0) : text.replace(/\s/g, "").length;
}

export function minLengthFor(locale: GlobalLocale, key: ManualChapterKey): number {
  return MIN_BY_LOCALE[locale][key];
}

/** 모델이 가끔 붙이는 마크다운 기호·장 제목 줄을 걷어낸다(제목은 화면이 붙인다). */
export function cleanGlobalText(text: string, title: string): string {
  let t = text.trim().replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "");
  const lines = t.split("\n");
  const first = lines[0]?.replace(/\s/g, "").toLowerCase();
  if (first && first.includes(title.replace(/\s/g, "").toLowerCase()) && lines[0].length < 80) {
    t = lines.slice(1).join("\n").trim();
  }
  return t;
}

export function globalManualProblems(text: string, locale: GlobalLocale, key: ManualChapterKey): string[] {
  const problems: string[] = [];
  const hit = BANNED[locale].filter((b) => b.re.test(text)).map((b) => b.label);
  if (hit.length) problems.push(`banned words: ${hit.join(", ")}`);
  if (HANGUL.test(text)) problems.push("contains Hangul (Korean letters)");
  const min = minLengthFor(locale, key);
  const len = measureLength(text, locale);
  if (len < min * 0.65) problems.push(`too short: ${len} (target ${min})`);
  return problems;
}

async function writeOnce(
  locale: GlobalLocale,
  key: ManualChapterKey,
  result: SajuResult,
  facts: Record<string, unknown>,
  hint: string,
): Promise<string> {
  const title = GLOBAL_PAY_COPY[locale].chapters[key].title;
  const dm = DAY_MASTERS[result.dayPillar.ganHanja]?.[locale];
  const unit = locale === "en" ? "words" : "characters (excluding spaces)";
  const message = await getClient().messages.create(
    {
      model: "claude-sonnet-5",
      // 일본어는 글자당 토큰이 많아 4,500이면 긴 장(2,000자대)이 잘릴 수 있다. 쓴 만큼만 비용이 든다.
      max_tokens: locale === "ja" ? 7000 : 4500,
      // 정해진 분량의 글만 쓰는 작업이라 사고 과정이 필요 없다(켜 두면 사고 토큰이 예산을 먼저 써서 글이 잘린다 — interpretSaju.ts 참고).
      thinking: { type: "disabled" },
      system: systemPrompt(locale),
      messages: [
        {
          role: "user",
          content: `This chapter: ${title}\nMinimum length: at least ${minLengthFor(locale, key)} ${unit} (falling short is not acceptable).\nInstructions: ${CHAPTER_PLAN[key]}${hint}\nDay Master display name to use: ${dm ? `${dm.label} — ${dm.image}` : "(unknown)"}\n\nSaju facts (labels are in Korean; translate with the glossary):\n${JSON.stringify(facts, null, 2)}`,
        },
      ],
    },
    // 장 6개를 동시에 요청하므로 일시적인 과부하(429·529)가 가끔 난다. 기본 2번보다 더 재시도한다.
    { maxRetries: 4 },
  );
  if (message.stop_reason === "max_tokens") {
    throw new AiInterpretationError(`AI response was cut off by the length limit (chapter=${key}, locale=${locale}).`);
  }
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new AiInterpretationError("No text found in the AI response.");
  return cleanGlobalText(block.text, title);
}

/**
 * 해외판 한 장 생성. 금지어·한글 혼입·분량 미달이면 사유를 알려 한 번 더 쓰게 하고, 그래도 안 되면 실패로 던진다
 * (호출부가 이 장만 재시도 — 부실한 글이 결제 완료 리포트로 캐싱되는 걸 막는다).
 */
export async function interpretGlobalManualChapter(
  result: SajuResult,
  key: ManualChapterKey,
  locale: GlobalLocale,
  now: Date = new Date(),
): Promise<string> {
  if (!MANUAL_CHAPTER_KEYS.includes(key)) throw new AiInterpretationError(`Unknown chapter: ${key}`);
  const { 무료_화면에서_예고한_궁금증: _teaser, ...facts } = buildManualFacts(result, now);
  void _teaser;

  let text = await writeOnce(locale, key, result, facts, "");
  let problems = globalManualProblems(text, locale, key);
  if (problems.length) {
    const retry = await writeOnce(
      locale,
      key,
      result,
      facts,
      `\n(Problems with the previous attempt: ${problems.join("; ")}. Fix them and rewrite from scratch. Replace banned words with other expressions, never output Korean letters, and reach the length by explaining the same evidence more concretely.)`,
    );
    const retryProblems = globalManualProblems(retry, locale, key);
    if (retryProblems.length <= problems.length) {
      text = retry;
      problems = retryProblems;
    }
  }
  if (problems.length) {
    throw new AiInterpretationError(`Chapter check failed (chapter=${key}, locale=${locale}): ${problems.join("; ")}`);
  }
  return text;
}
