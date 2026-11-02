// 띠(연지) 궁합 정적 페이지 데이터(2026-11-02). 검색 입구용 78개 조합(같은 띠 12 + 서로 다른 띠 66).
// 관계는 전통 명리학의 지지 관계(육합·삼합·충·형·파·해·원진)로 코드가 정하고, 문장은 단정하지 않는 말투로 쓴다.
// 띠 궁합은 여덟 글자 중 태어난 해 한 글자만 본 것이라, 페이지마다 두 사람 사주 전체 궁합(/compatibility)으로 안내한다.

export type Element = "목" | "화" | "토" | "금" | "수";

export interface Tti {
  branch: string;
  branchKor: string;
  animal: string;
  slug: string;
  element: Element;
  keywords: string[];
  nature: string;
}

export const TTI: Tti[] = [
  { branch: "子", branchKor: "자", animal: "쥐", slug: "jwi", element: "수", keywords: ["눈치", "준비성", "영리함"], nature: "상황을 빨리 읽고 미리 준비하는 편이에요. 조용히 실속을 챙기고, 위기에서 길을 찾는 감각이 좋아요." },
  { branch: "丑", branchKor: "축", animal: "소", slug: "so", element: "토", keywords: ["성실", "끈기", "신중"], nature: "한번 맡은 일은 끝까지 해내는 편이에요. 속도는 느려도 꾸준해서 시간이 지날수록 믿음을 얻어요." },
  { branch: "寅", branchKor: "인", animal: "호랑이", slug: "horangi", element: "목", keywords: ["추진력", "의리", "자존심"], nature: "앞장서서 밀고 나가는 힘이 있어요. 내 사람은 끝까지 챙기지만 자존심이 상하면 쉽게 물러서지 않아요." },
  { branch: "卯", branchKor: "묘", animal: "토끼", slug: "tokki", element: "목", keywords: ["섬세", "온화", "감각"], nature: "분위기를 부드럽게 만들고 작은 변화도 잘 알아차려요. 갈등보다 조율을 먼저 찾는 편이에요." },
  { branch: "辰", branchKor: "진", animal: "용", slug: "yong", element: "토", keywords: ["포부", "자신감", "리더십"], nature: "큰 그림을 그리고 사람을 모으는 힘이 있어요. 목표가 크고 스스로에게 거는 기대도 높은 편이에요." },
  { branch: "巳", branchKor: "사", animal: "뱀", slug: "baem", element: "화", keywords: ["통찰", "집중", "신중"], nature: "겉으로는 차분하지만 속으로 깊게 계산하는 편이에요. 한번 정한 방향은 조용히 끝까지 밀고 가요." },
  { branch: "午", branchKor: "오", animal: "말", slug: "mal", element: "화", keywords: ["활동", "솔직", "자유"], nature: "에너지가 밖으로 드러나고 표현이 솔직해요. 묶여 있는 것보다 스스로 움직일 때 힘이 나요." },
  { branch: "未", branchKor: "미", animal: "양", slug: "yang", element: "토", keywords: ["다정", "배려", "평화"], nature: "주변 사람 마음을 먼저 살피는 편이에요. 다투기보다 맞춰 주지만 속으로 서운함을 담아 두기도 해요." },
  { branch: "申", branchKor: "신", animal: "원숭이", slug: "wonsungi", element: "금", keywords: ["재치", "순발력", "호기심"], nature: "머리 회전이 빠르고 새로운 걸 금방 익혀요. 지루한 반복보다 변화가 있는 환경에서 빛나요." },
  { branch: "酉", branchKor: "유", animal: "닭", slug: "dak", element: "금", keywords: ["꼼꼼", "원칙", "표현"], nature: "기준이 분명하고 디테일을 잘 챙겨요. 할 말은 하는 편이라 정확하지만 날카롭게 들릴 때도 있어요." },
  { branch: "戌", branchKor: "술", animal: "개", slug: "gae", element: "토", keywords: ["충직", "책임", "정의"], nature: "믿는 사람에게 끝까지 충실하고 옳고 그름에 민감해요. 책임감이 커서 혼자 짐을 지기도 해요." },
  { branch: "亥", branchKor: "해", animal: "돼지", slug: "dwaeji", element: "수", keywords: ["너그러움", "솔직", "여유"], nature: "마음이 넓고 사람을 잘 믿어요. 여유 있게 즐길 줄 알지만 거절을 어려워할 때가 있어요." },
];

const BY_BRANCH: Record<string, Tti> = Object.fromEntries(TTI.map((t) => [t.branch, t]));
export const TTI_BY_SLUG: Record<string, Tti> = Object.fromEntries(TTI.map((t) => [t.slug, t]));

const ELEMENT_HANJA: Record<Element, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };
const ELEMENT_THING: Record<Element, string> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };
const GENERATES: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<Element, Element> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

/** 받침에 맞는 조사(이/가, 을/를, 와/과, 은/는). "물(水)"처럼 괄호가 붙은 말은 괄호 앞 글자로 본다. */
function josa(word: string, withBatchim: string, without: string): string {
  const base = word.replace(/['"]+$/, "").replace(/\(.*\)$/, "");
  const code = base.charCodeAt(base.length - 1) - 0xac00;
  const has = code >= 0 && code <= 11171 && code % 28 !== 0;
  return word + (has ? withBatchim : without);
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join("");
}
function pairs(list: string[]) {
  return new Set(list.map((p) => pairKey(p[0], p[1])));
}

const YUKHAP = pairs(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);
const CHUNG = pairs(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);
const HYEONG = pairs(["寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未", "子卯", "辰辰", "午午", "酉酉", "亥亥"]);
const PA = pairs(["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"]);
const HAE = pairs(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]);
const WONJIN = pairs(["子未", "丑午", "寅酉", "卯申", "辰亥", "巳戌"]);
const SAMHAP: { members: string; name: string; element: Element }[] = [
  { members: "申子辰", name: "수국", element: "수" },
  { members: "亥卯未", name: "목국", element: "목" },
  { members: "寅午戌", name: "화국", element: "화" },
  { members: "巳酉丑", name: "금국", element: "금" },
];

export type RelationKind = "육합" | "삼합" | "같은 띠" | "충" | "원진" | "형" | "해" | "파";

export interface RelationNote {
  kind: RelationKind;
  hanja: string;
  title: string;
  body: string;
  tone: "good" | "neutral" | "care";
}

export interface TtiPair {
  slug: string;
  a: Tti;
  b: Tti;
  relations: RelationNote[];
  headline: string;
  summary: string;
  elementNote: string;
  strengths: string[];
  tips: string[];
}

function relationNotes(a: Tti, b: Tti): RelationNote[] {
  const k = pairKey(a.branch, b.branch);
  const same = a.branch === b.branch;
  const out: RelationNote[] = [];
  if (YUKHAP.has(k)) {
    out.push({ kind: "육합", hanja: "六合", tone: "good", title: "서로 끌어당기는 짝(육합)",
      body: `${a.animal}띠와 ${b.animal}띠는 열두 띠 가운데 서로 짝을 이루는 육합 관계로 봐요. 처음 만났을 때 편안함을 느끼기 쉽고, 한쪽에 부족한 부분을 다른 쪽이 자연스럽게 채워 주는 흐름이에요.` });
  }
  const sam = SAMHAP.find((g) => !same && g.members.includes(a.branch) && g.members.includes(b.branch));
  if (sam) {
    const third = BY_BRANCH[[...sam.members].find((c) => c !== a.branch && c !== b.branch)!];
    out.push({ kind: "삼합", hanja: "三合", tone: "good", title: `같은 방향으로 모이는 짝(삼합·${sam.name})`,
      body: `${a.animal}띠·${b.animal}띠·${third.animal}띠는 함께 ${ELEMENT_THING[sam.element]}(${ELEMENT_HANJA[sam.element]}) 기운으로 모이는 삼합으로 봐요. 목표가 같을 때 손발이 잘 맞고, 같이 일을 벌이면 추진력이 붙는 조합이에요.` });
  }
  if (same) {
    out.push({ kind: "같은 띠", hanja: "同支", tone: "neutral", title: "같은 띠끼리",
      body: `같은 ${a.animal}띠끼리는 생각의 속도와 생활 리듬이 비슷해 말하지 않아도 통하는 부분이 많아요. 다만 단점도 닮아서 같은 지점에서 함께 막히기 쉬워요.` });
  }
  if (CHUNG.has(k)) {
    out.push({ kind: "충", hanja: "沖", tone: "care", title: "정반대 자리의 짝(충)",
      body: `${a.animal}띠와 ${b.animal}띠는 열두 띠 원에서 서로 마주 보는 충 관계예요. 끌림이 강한 대신 생활 방식과 속도가 달라 부딪히기 쉬워요. 다름을 '보완'으로 쓰면 서로의 시야를 넓혀 주는 관계가 되기도 해요.` });
  }
  if (WONJIN.has(k)) {
    out.push({ kind: "원진", hanja: "怨嗔", tone: "care", title: "서운함이 쌓이기 쉬운 짝(원진)",
      body: `원진은 큰 이유 없이 서운함이 쌓이기 쉬운 관계로 풀이돼요. "말 안 해도 알겠지"라는 기대를 줄이고, 고마운 것과 서운한 것을 그때그때 짧게 말하는 습관이 도움이 돼요.` });
  }
  if (HYEONG.has(k)) {
    out.push({ kind: "형", hanja: "刑", tone: "care", title: same ? "스스로를 다그치는 기운(자형)" : "서로를 다듬는 긴장(형)",
      body: same
        ? `같은 글자가 겹치는 자형(自刑)으로 봐요. 둘 다 스스로에게 엄격해지기 쉬워, 서로의 실수에 너그러워지는 연습이 관계를 편하게 해 줘요.`
        : `형은 서로를 다듬는 긴장감으로 풀이돼요. 잔소리나 지적이 오가기 쉬우니 집안일·돈 관리처럼 부딪히기 쉬운 부분은 역할을 미리 나눠 두면 좋아요.` });
  }
  if (HAE.has(k) && !WONJIN.has(k)) {
    out.push({ kind: "해", hanja: "害", tone: "care", title: "작은 오해가 생기기 쉬운 짝(해)",
      body: `해는 사소한 오해가 쌓이기 쉬운 관계로 봐요. 중요한 이야기는 메시지보다 얼굴 보고 하는 편이 오해를 줄여 줘요.` });
  }
  if (PA.has(k)) {
    out.push({ kind: "파", hanja: "破", tone: "care", title: "계획이 어긋나기 쉬운 짝(파)",
      body: `파는 함께 세운 계획이 중간에 틀어지기 쉬운 관계로 봐요. 약속이나 큰 결정은 한 번 더 확인하고 기록해 두는 습관이 도움이 돼요.` });
  }
  return out;
}

function elementNote(a: Tti, b: Tti): string {
  const ea = a.element, eb = b.element;
  const ta = `${ELEMENT_THING[ea]}(${ELEMENT_HANJA[ea]})`, tb = `${ELEMENT_THING[eb]}(${ELEMENT_HANJA[eb]})`;
  if (ea === eb) return `두 띠 모두 ${ta} 기운이라 중요하게 여기는 것이 비슷한 편이에요. 편하게 통하는 대신, 새로운 자극은 밖에서 함께 찾아보는 게 좋아요.`;
  if (GENERATES[ea] === eb) return `${a.animal}띠의 ${josa(ta, "이", "가")} ${b.animal}띠의 ${josa(tb, "을", "를")} 키워 주는 상생 관계예요. ${a.animal}띠 쪽이 챙겨 주고 받쳐 주는 역할을 맡기 쉬워요.`;
  if (GENERATES[eb] === ea) return `${b.animal}띠의 ${josa(tb, "이", "가")} ${a.animal}띠의 ${josa(ta, "을", "를")} 키워 주는 상생 관계예요. ${b.animal}띠 쪽이 챙겨 주고 받쳐 주는 역할을 맡기 쉬워요.`;
  if (CONTROLS[ea] === eb) return `${a.animal}띠의 ${josa(ta, "이", "가")} ${b.animal}띠의 ${josa(tb, "을", "를")} 누르는 상극 관계예요. ${a.animal}띠 쪽 의견이 앞서기 쉬우니, 결정할 때 상대의 속도를 한 번 기다려 주면 균형이 맞아요.`;
  return `${b.animal}띠의 ${josa(tb, "이", "가")} ${a.animal}띠의 ${josa(ta, "을", "를")} 누르는 상극 관계예요. ${b.animal}띠 쪽 의견이 앞서기 쉬우니, 결정할 때 상대의 속도를 한 번 기다려 주면 균형이 맞아요.`;
}

const PRIORITY: RelationKind[] = ["육합", "삼합", "같은 띠", "충", "원진", "형", "해", "파"];

function build(a: Tti, b: Tti): TtiPair {
  const relations = relationNotes(a, b).sort((x, y) => PRIORITY.indexOf(x.kind) - PRIORITY.indexOf(y.kind));
  const main = relations[0];
  const name = `${a.animal}띠 ${b.animal}띠`;
  const headline = main
    ? `${name} 궁합 — ${main.title}`
    : `${name} 궁합 — 띠보다 사람이 더 중요한 무난한 사이`;
  const hasGood = relations.some((r) => r.tone === "good");
  const hasCare = relations.some((r) => r.tone === "care");
  const summary = main
    ? hasGood && hasCare
      ? `${name}는 끌어당기는 기운과 부딪히는 기운이 함께 있는 조합이에요. 잘 맞는 부분은 살리고, 부딪히기 쉬운 지점은 미리 알고 대비하면 좋아요.`
      : hasGood
        ? `${name}는 띠로 보면 서로 힘이 되는 조합이에요. 다만 띠는 여덟 글자 중 한 글자일 뿐이라, 실제 궁합은 두 사람의 사주 전체를 함께 봐야 해요.`
        : main.kind === "같은 띠"
          ? `같은 ${a.animal}띠끼리는 공감이 빠른 조합이에요. 비슷해서 편한 만큼 서로의 단점도 비슷하다는 걸 알고 있으면 좋아요.`
          : `${name}는 띠로 보면 노력이 필요한 조합으로 풀이돼요. 다만 띠 하나로 관계가 정해지지는 않아요. 다른 글자에서 서로를 받쳐 주는 경우도 많아요.`
    : `${name}는 합이나 충으로 묶이지 않는 무난한 관계예요. 이런 경우엔 띠보다 두 사람의 일간(태어난 날의 글자)과 성향이 관계에 더 크게 작용해요.`;
  const strengths: string[] = [];
  if (relations.some((r) => r.kind === "육합" || r.kind === "삼합")) strengths.push("처음부터 편안함을 느끼기 쉬워 관계가 빨리 가까워져요.");
  if (a.element === b.element) strengths.push("가치관이 비슷해 큰 결정에서 의견이 잘 모여요.");
  if (GENERATES[a.element] === b.element || GENERATES[b.element] === a.element) strengths.push("한쪽이 다른 쪽을 자연스럽게 챙기는 흐름이 있어 돌봄이 오가요.");
  if (relations.some((r) => r.kind === "충")) strengths.push("서로 없는 것을 가진 사이라 함께 있으면 시야가 넓어져요.");
  strengths.push(
    a === b
      ? `둘 다 ${josa(a.keywords.join("·"), "이", "가")} 강점이라 같은 목표를 정하면 속도가 붙어요.`
      : `${a.animal}띠의 ${josa(a.keywords[0], "과", "와")} ${b.animal}띠의 ${josa(b.keywords[0], "이", "가")} 만나면 서로에게 없는 힘을 빌려줄 수 있어요.`,
  );
  const tips: string[] = [];
  if (relations.some((r) => r.kind === "충")) tips.push("생활 리듬(잠·식사·주말)이 다를 수 있으니 서로의 기본 리듬을 먼저 이야기해 보세요.");
  if (relations.some((r) => r.kind === "원진" || r.kind === "해")) tips.push("서운한 일은 쌓아 두지 말고 그날 짧게 말해 보세요.");
  if (relations.some((r) => r.kind === "형")) tips.push("부딪히기 쉬운 집안일·돈 관리는 역할을 미리 나눠 두세요.");
  if (relations.some((r) => r.kind === "파")) tips.push("함께 세운 계획은 한 번 더 확인하고 기록해 두세요.");
  if (CONTROLS[a.element] === b.element || CONTROLS[b.element] === a.element) tips.push("의견이 갈릴 때는 목소리가 큰 쪽이 한 번 기다려 주세요.");
  tips.push(
    a === b
      ? `비슷한 만큼 서로의 단점도 잘 보여요. 지적보다 "나도 그래"라는 공감부터 건네 보세요.`
      : `${a.animal}띠는 '${a.keywords[1]}', ${b.animal}띠는 ${josa(`'${b.keywords[1]}'`, "이", "가")} 강점이에요. 서로의 강점을 말로 인정해 주면 관계가 단단해져요.`,
  );
  return { slug: `${a.slug}-${b.slug}`, a, b, relations, headline, summary, elementNote: elementNote(a, b), strengths, tips };
}

export const TTI_PAIRS: TtiPair[] = TTI.flatMap((a, i) => TTI.slice(i).map((b) => build(a, b)));
export const TTI_PAIR_BY_SLUG: Record<string, TtiPair> = Object.fromEntries(TTI_PAIRS.map((p) => [p.slug, p]));

/** 순서와 상관없이 두 띠의 궁합 페이지 주소를 찾는다. */
export function ttiPairSlug(x: Tti, y: Tti): string {
  return TTI.indexOf(x) <= TTI.indexOf(y) ? `${x.slug}-${y.slug}` : `${y.slug}-${x.slug}`;
}
