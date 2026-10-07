import { MANUAL_CHAPTER_META } from "@/lib/reports/manualChapters";

export type FocusKind = "wealth" | "love";

// 선택한 관심사가 6장 "나 사용설명서"의 어느 장에서 다뤄지는지.
const FOCUS_CHAPTER_KEY = { wealth: "workmoney", love: "people" } as const;

/**
 * 입력 화면 상단 배너 문구. 6장 방식에서는 결제 전 소개에 주제별 미리보기가 없으므로(1장 연결 카드가 첫 카드),
 * "먼저 보여드린다"고 약속하지 않고 어느 장에서 풀어주는지를 말한다. 옛 방식(주제 5개)으로 롤백하면 그 방식에서
 * 실제로 맞는 문구(미리보기가 맨 앞)를 쓴다.
 */
export function focusBannerParts(focus: FocusKind, label: string, v2: boolean): { head: string; label: string; tail: string } {
  if (!v2) return { head: "🔮 풀이가 끝나면 ", label, tail: " 미리보기를 가장 먼저 보여드릴게요" };
  const chapter = MANUAL_CHAPTER_META.find((c) => c.key === FOCUS_CHAPTER_KEY[focus])?.title ?? "";
  return { head: "🔮 ", label, tail: `은 풀이 후 '${chapter}' 장에서 풀어드려요` };
}
