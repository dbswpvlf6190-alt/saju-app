import type { PremiumSectionKey } from "@/lib/saju/content";
import {
  MANUAL_CHAPTER_KEYS,
  reportV2Enabled,
  type ManualChapterKey,
  type ReportLayout,
} from "@/lib/reports/manualChapters";

// DB·서버 전용 코드(generate.ts)와 분리해 단위 테스트할 수 있게 한 순수 로직.
export const PREMIUM_SECTION_KEYS: PremiumSectionKey[] = ["love", "wealth", "career", "relationship", "yearly"];

export type ReportSectionKey = PremiumSectionKey | ManualChapterKey;

export function isPremiumTopicKey(value: unknown): value is PremiumSectionKey {
  return typeof value === "string" && (PREMIUM_SECTION_KEYS as string[]).includes(value);
}

/**
 * 이 주문이 어떤 방식으로 열리는지. 이미 생성된 캐시가 있으면 그 방식을 그대로 유지한다(기존 결제 고객은 결제 당시
 * 방식 그대로, 생성 도중에 방식이 바뀌어 섞이지 않게). 캐시가 비어 있는 새 premium_report 주문만 플래그를 따른다.
 * single_section(산 1가지)과 section_upgrade(차액으로 나머지 4가지)는 항상 옛 주제 방식이다.
 */
export function getReportLayout(
  cached: Record<string, string>,
  productType: string,
  v2Enabled: boolean = reportV2Enabled(),
): { layout: ReportLayout; keys: ReportSectionKey[] } {
  if (productType !== "premium_report") return { layout: "topics", keys: PREMIUM_SECTION_KEYS };
  if (MANUAL_CHAPTER_KEYS.some((k) => cached[k])) return { layout: "manual", keys: MANUAL_CHAPTER_KEYS };
  if (PREMIUM_SECTION_KEYS.some((k) => cached[k])) return { layout: "topics", keys: PREMIUM_SECTION_KEYS };
  return v2Enabled
    ? { layout: "manual", keys: MANUAL_CHAPTER_KEYS }
    : { layout: "topics", keys: PREMIUM_SECTION_KEYS };
}
