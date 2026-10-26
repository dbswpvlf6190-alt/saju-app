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
