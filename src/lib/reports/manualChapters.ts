// 클라이언트 화면에서도 쓰는 가벼운 정보만 둔다(서버 전용 생성 코드는 lib/ai/interpretManual.ts).
export type ManualChapterKey = "overview" | "patterns" | "people" | "workmoney" | "timing" | "actions";

export interface ManualChapterMeta {
  key: ManualChapterKey;
  /** 고객 화면 장 제목 */
  title: string;
  /** 결제 전 소개에서 "읽고 나면 얻는 것" 한 줄 */
  promise: string;
}

export const MANUAL_CHAPTER_META: ManualChapterMeta[] = [
  { key: "overview", title: "나의 기본 설계도", promise: "내가 어떤 사람인지, 타고난 설계를 한눈에 이해해요" },
  { key: "patterns", title: "내가 반복하는 선택", promise: "왜 같은 선택을 반복하는지, 그 비용과 다르게 해볼 방법을 알아요" },
  { key: "people", title: "사람 앞에서의 나", promise: "상대가 나를 오해하는 지점과, 바로 쓸 수 있는 말을 가져가요" },
  { key: "workmoney", title: "일과 돈에서의 나", promise: "일하고 돈을 다루는 방식, 손해 보는 지점과 바로 쓸 규칙을 알아요" },
  { key: "timing", title: "지금 시기 사용법", promise: "올해와 앞으로의 흐름에서 시작할 것·미룰 것·준비할 것을 알아요" },
  { key: "actions", title: "오늘부터 해볼 3가지", promise: "읽은 내용을 오늘 5분 안에 시작할 행동으로 바꿔요" },
];

export const MANUAL_CHAPTER_KEYS: ManualChapterKey[] = MANUAL_CHAPTER_META.map((c) => c.key);

export function isManualChapterKey(value: unknown): value is ManualChapterKey {
  return typeof value === "string" && (MANUAL_CHAPTER_KEYS as string[]).includes(value);
}

export type ReportLayout = "manual" | "topics";

/** 6장짜리 "나 사용설명서"(2026-10-07)를 쓸지. 기본 켬 — 문제가 생기면 NEXT_PUBLIC_REPORT_V2=0으로 즉시 옛 방식(주제 5개)으로 되돌린다. */
export function reportV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_REPORT_V2 !== "0";
}
