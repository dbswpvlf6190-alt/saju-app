import { Solar } from "lunar-typescript";
import { generateFreeContent } from "./content";
import { WUXING_PERSONA } from "./persona";
import type { SajuResult } from "./types";

/**
 * "나 사용설명서" 리포트가 AI에게 넘기는 사실 묶음. 십성·올해/달별 흐름을 AI가 직접 계산하면 틀리므로
 * (예: 병화 일간의 재성을 수로 잘못 말함, 2026-10-07 샘플 점검) 전부 여기서 코드로 계산해 고정값으로 준다.
 */

export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

const STEM: Record<string, { element: string; yang: boolean }> = {
  갑: { element: "목", yang: true },
  을: { element: "목", yang: false },
  병: { element: "화", yang: true },
  정: { element: "화", yang: false },
  무: { element: "토", yang: true },
  기: { element: "토", yang: false },
  경: { element: "금", yang: true },
  신: { element: "금", yang: false },
  임: { element: "수", yang: true },
  계: { element: "수", yang: false },
};

// 지지에 숨은 기운 중 본기(가장 주된 천간).
const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병", 오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
};

const GENERATES: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
// 상극: 키가 값을 극한다(목극토·화극금·토극수·금극목·수극화).
const CONTROLS: Record<string, string> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };

const HANJA_TO_KOR: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};

export function tenGodOf(dayGan: string, otherGan: string): TenGod {
  const me = STEM[dayGan];
  const other = STEM[otherGan];
  const samePolarity = me.yang === other.yang;
  if (me.element === other.element) return samePolarity ? "비견" : "겁재";
  if (GENERATES[me.element] === other.element) return samePolarity ? "식신" : "상관";
  if (CONTROLS[me.element] === other.element) return samePolarity ? "편재" : "정재";
  if (CONTROLS[other.element] === me.element) return samePolarity ? "편관" : "정관";
  return samePolarity ? "편인" : "정인";
}

export function groupOfTenGod(god: TenGod): TenGodGroup {
  if (god === "비견" || god === "겁재") return "비겁";
  if (god === "식신" || god === "상관") return "식상";
  if (god === "편재" || god === "정재") return "재성";
  if (god === "편관" || god === "정관") return "관성";
  return "인성";
}

const ZHI_KOR: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

const GROUP_MEANING: Record<TenGodGroup, string> = {
  비겁: "자기 에너지·경쟁심·지출이 커지는 기운",
  식상: "표현·아이디어·만들어내는 기운",
  재성: "결과를 거두는 기운(돈·성과)",
  관성: "규칙·책임·평가의 기운",
  인성: "배움·정리·문서·도움받는 기운",
};

function seasonOf(monthZhiKor: string): string {
  if ("인묘진".includes(monthZhiKor)) return "봄";
  if ("사오미".includes(monthZhiKor)) return "여름";
  if ("신유술".includes(monthZhiKor)) return "가을";
  return "겨울";
}

function ageBand(birthYear: number, now: Date): string {
  const age = now.getFullYear() - birthYear;
  if (age < 20) return "10대";
  const decade = Math.floor(age / 10) * 10;
  const unit = age % 10;
  return `${decade}대 ${unit <= 3 ? "초반" : unit <= 6 ? "중반" : "후반"}`;
}

function groupOfStem(dayGan: string, stemKor: string): TenGodGroup {
  return groupOfTenGod(tenGodOf(dayGan, stemKor));
}

function yearTrack(dayGan: string, now: Date) {
  const out: { year: number; ganzhi: string; group: TenGodGroup }[] = [];
  for (let y = now.getFullYear(); y <= now.getFullYear() + 4; y++) {
    const ec = Solar.fromYmdHms(y, 7, 1, 12, 0, 0).getLunar().getEightChar();
    const gan = HANJA_TO_KOR[ec.getYearGan()];
    out.push({ year: y, ganzhi: `${gan}${ZHI_KOR[ec.getYearZhi()]}`, group: groupOfStem(dayGan, gan) });
  }
  return out;
}

function monthTrack(dayGan: string, now: Date) {
  const raw: { ym: string; group: TenGodGroup }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 15);
    const ec = Solar.fromYmdHms(d.getFullYear(), d.getMonth() + 1, 15, 12, 0, 0).getLunar().getEightChar();
    raw.push({
      ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      group: groupOfStem(dayGan, HANJA_TO_KOR[ec.getMonthGan()]),
    });
  }
  // 이어지는 같은 기운은 한 구간으로 묶는다.
  const spans: { from: string; to: string; group: TenGodGroup }[] = [];
  for (const m of raw) {
    const last = spans[spans.length - 1];
    if (last && last.group === m.group) last.to = m.ym;
    else spans.push({ from: m.ym, to: m.ym, group: m.group });
  }
  return spans;
}

export interface ManualFacts {
  성별: string;
  나이대: string;
  사주: { 년주: string; 월주: string; 일주: string; 시주: string };
  일간: string;
  태어난_계절: string;
  오행비율: Record<string, number>;
  십성_배치: Record<string, string>;
  십성_분포: Record<TenGodGroup, number>;
  십성_요약: string;
  올해_흐름: Record<string, string>;
  달별_흐름: string;
  /** 사주에 하나도 없는 십성 그룹(없으면 빈 배열) */
  없는_기운: TenGodGroup[];
  /** 일간 바로 곁(월간·일지·시간)의 기운이 일간을 돕는지 힘들게 하는지. 무료 화면 캐릭터가 예고한 궁금증의 답. */
  곁의_기운: { 항목: string[]; 요약: string };
  /** 무료 화면에서 캐릭터가 건 궁금증(1장이 이어서 답한다) */
  무료_화면에서_예고한_궁금증: string;
}

export function buildManualFacts(result: SajuResult, now: Date = new Date()): ManualFacts {
  const dayGan = result.dayPillar.ganKor;
  const free = generateFreeContent(result);

  const pillars: [string, { ganKor: string; zhiKor: string; ganZhiKor: string }][] = [
    ["년주", result.yearPillar],
    ["월주", result.monthPillar],
    ["일주", result.dayPillar],
    ...(result.timePillar ? ([["시주", result.timePillar]] as [string, typeof result.timePillar][]) : []),
  ];

  const placement: Record<string, string> = {};
  const counts: Record<TenGodGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const stemSlots: string[] = [];
  const branchSlots: string[] = [];
  for (const [name, p] of pillars) {
    if (name !== "일주") {
      const god = tenGodOf(dayGan, p.ganKor);
      placement[`${name}_천간(${p.ganKor})`] = god;
      counts[groupOfTenGod(god)] += 1;
      stemSlots.push(`${god}(${name})`);
    }
    const branchGod = tenGodOf(dayGan, BRANCH_MAIN_STEM[p.zhiKor]);
    placement[`${name}_지지(${p.zhiKor})`] = branchGod;
    counts[groupOfTenGod(branchGod)] += 1;
    branchSlots.push(`${branchGod}(${name})`);
  }

  const groups = Object.keys(counts) as TenGodGroup[];
  const missing = groups.filter((g) => counts[g] === 0);
  const summaryParts = groups.map((g) => `${g} ${counts[g]}개`);
  const summary =
    `${summaryParts.join(" / ")}` +
    (missing.length ? ` — 사주 안에 ${missing.join("·")}이(가) 하나도 없음` : "") +
    ` | 천간에 뜬 십성: ${stemSlots.join(", ") || "없음"} | 지지에 있는 십성: ${branchSlots.join(", ")}`;

  // 일간 곁의 기운: 월간·일지·시간. 인성·비겁은 일간을 돕고, 식상·재성은 힘을 쓰게 하며, 관성은 누른다(전통 신강·신약 개념을 단순화한 경향 분류).
  const neighbors: { 자리: string; god: TenGod }[] = [
    { 자리: "월간", god: tenGodOf(dayGan, result.monthPillar.ganKor) },
    { 자리: "일지", god: tenGodOf(dayGan, BRANCH_MAIN_STEM[result.dayPillar.zhiKor]) },
    ...(result.timePillar ? [{ 자리: "시간", god: tenGodOf(dayGan, result.timePillar.ganKor) }] : []),
  ];
  const role = (g: TenGodGroup) => (g === "인성" || g === "비겁" ? "일간을 돕는 기운" : g === "관성" ? "일간을 누르는(부담이 되는) 기운" : "일간의 힘을 쓰게 하는 기운");
  const helpCount = neighbors.filter((n) => ["인성", "비겁"].includes(groupOfTenGod(n.god))).length;
  const burdenCount = neighbors.length - helpCount;
  const neighborSummary =
    helpCount > burdenCount ? "돕는 쪽이 우세" : helpCount < burdenCount ? "힘을 쓰거나 부담이 되는 쪽이 우세" : "돕는 기운과 힘을 쓰는 기운이 팽팽";

  const track = yearTrack(dayGan, now);
  const yearly: Record<string, string> = {};
  for (const t of track) {
    const note =
      counts[t.group] === 0 ? " — 사주에 원래 없던 기운이 들어오는 해" : "";
    yearly[String(t.year)] = `${t.ganzhi}년, ${t.group}(${GROUP_MEANING[t.group]})${note}`;
  }

  const monthly = monthTrack(dayGan, now)
    .map((s) => `${s.from}${s.from === s.to ? "" : "~" + s.to.slice(5)} ${s.group}`)
    .join(" / ");

  return {
    성별: result.input.gender === "male" ? "남성" : "여성",
    나이대: ageBand(result.input.year, now),
    사주: {
      년주: result.yearPillar.ganZhiKor,
      월주: result.monthPillar.ganZhiKor,
      일주: result.dayPillar.ganZhiKor,
      시주: result.timePillar?.ganZhiKor ?? "모름(시주 없이 6글자로 해석)",
    },
    일간: `${free.dayMasterLabel}, ${free.dayMasterMetaphor}`,
    태어난_계절: `${seasonOf(result.monthPillar.zhiKor)}(${result.monthPillar.zhiKor}월)`,
    오행비율: result.wuxingPercent,
    십성_배치: placement,
    십성_분포: counts,
    십성_요약: summary,
    올해_흐름: yearly,
    달별_흐름: monthly,
    없는_기운: missing,
    곁의_기운: {
      항목: neighbors.map((n) => `${n.자리}: ${n.god}(${groupOfTenGod(n.god)}) — ${role(groupOfTenGod(n.god))}`),
      요약: `돕는 기운 ${helpCount}개 / 힘을 쓰거나 부담이 되는 기운 ${burdenCount}개 → ${neighborSummary}`,
    },
    무료_화면에서_예고한_궁금증: WUXING_PERSONA[result.dayPillar.ganWuxing].bridgeLine.replace(/ — 사용설명서 1장에서 이어서 풀어드려요\.$/, ""),
  };
}

