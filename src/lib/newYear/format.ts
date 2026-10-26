// 신년운세 본문(AI가 쓴 글)을 화면용 블록으로 나눈다(2026-10-22).
// v2 글은 "■ 소제목" 줄과 "1월 — ..." 월별 줄을 가진다. 이미 결제한 고객의 v1 글(소제목 없는 문단형)은
// 그대로 한 덩어리 문단으로 보여준다.

export type NewYearBlock =
  | { kind: "heading"; text: string }
  | { kind: "month"; month: number; text: string }
  | { kind: "para"; text: string };

const HEADING = /^■\s*(.+)$/;
const MONTH = /^(\d{1,2})월\s*[—–-]\s*(.+)$/;

export function parseNewYearText(text: string): NewYearBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (!trimmed.includes("■")) return [{ kind: "para", text: trimmed }];

  const blocks: NewYearBlock[] = [];
  for (const raw of trimmed.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const h = line.match(HEADING);
    if (h) {
      blocks.push({ kind: "heading", text: h[1].trim() });
      continue;
    }
    const m = line.match(MONTH);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12) {
      blocks.push({ kind: "month", month: Number(m[1]), text: m[2].trim() });
      continue;
    }
    blocks.push({ kind: "para", text: line });
  }
  return blocks;
}

export interface NewYearSection {
  heading: string;
  paras: string[];
  /** 이 소제목 아래 "N월 — ..." 줄(월별 흐름) */
  months: { month: number; text: string }[];
}

/**
 * 블록을 소제목별로 묶는다(토스 유료 화면용, 2026-10-26). 첫 소제목 앞의 글(v1 글 전체 포함)은 intro로 둔다.
 * 월별 줄은 어느 소제목 아래 있든 monthLines에도 모아, 달 카드에 한 줄 풀이를 붙일 때 쓴다.
 */
export function groupNewYearBlocks(blocks: NewYearBlock[]): {
  intro: string[];
  sections: NewYearSection[];
  monthLines: Record<number, string>;
} {
  const intro: string[] = [];
  const sections: NewYearSection[] = [];
  const monthLines: Record<number, string> = {};
  let current: NewYearSection | null = null;
  for (const b of blocks) {
    if (b.kind === "heading") {
      current = { heading: b.text, paras: [], months: [] };
      sections.push(current);
    } else if (b.kind === "month") {
      monthLines[b.month] = b.text;
      if (current) current.months.push({ month: b.month, text: b.text });
    } else if (current) {
      current.paras.push(b.text);
    } else {
      intro.push(b.text);
    }
  }
  return { intro, sections, monthLines };
}
