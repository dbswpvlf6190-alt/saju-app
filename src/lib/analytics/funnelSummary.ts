import { prisma } from "@/lib/db/prisma";
import { ANALYTICS_EVENT_NAMES, type AnalyticsEventName } from "@/lib/analytics/events";

export interface FunnelSummary {
  windowDays: number;
  counts: Record<AnalyticsEventName, number>;
  landingRefBreakdown: { key: string; count: number }[];
  shareSourceBreakdown: { key: string; count: number }[];
}

/**
 * MARKETING_KPI.md 1번의 SQL을 직접 돌리는 대신 /admin에서 바로 보이게 한다 — 30DAY_FINAL_PLAN.md
 * 3-1 "데이터 취합"에서 매주 반복하기로 되어 있던 걸 여기서 상시 확인 가능하게 만든 것.
 * ①~③(조회수·도달·프로필방문)은 Instagram Insights에서만 확인 가능해 여기 포함하지 않는다.
 */
export async function getFunnelSummary(windowDays = 7): Promise<FunnelSummary> {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [grouped, landingEvents, shareEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: cutoff } },
      _count: true,
    }),
    prisma.analyticsEvent.findMany({
      where: { name: "landing_view", createdAt: { gte: cutoff } },
      select: { metaJson: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { name: "share_click", createdAt: { gte: cutoff } },
      select: { metaJson: true },
    }),
  ]);

  const counts = Object.fromEntries(ANALYTICS_EVENT_NAMES.map((n) => [n, 0])) as Record<
    AnalyticsEventName,
    number
  >;
  for (const g of grouped) {
    if ((ANALYTICS_EVENT_NAMES as readonly string[]).includes(g.name)) {
      counts[g.name as AnalyticsEventName] = g._count;
    }
  }

  return {
    windowDays,
    counts,
    // landing_view의 ref(유입경로: ig_profile/ig_r{릴스ID}/share_* 등)별 집계
    landingRefBreakdown: tallyMetaField(landingEvents, "ref"),
    // share_click의 source(공유 버튼이 놓인 화면: free_result/compat_free/premium_unlocked)별 집계
    shareSourceBreakdown: tallyMetaField(shareEvents, "source"),
  };
}

function tallyMetaField(rows: { metaJson: string | null }[], field: string): { key: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const row of rows) {
    let key = "(없음)";
    if (row.metaJson) {
      try {
        const parsed = JSON.parse(row.metaJson) as Record<string, unknown>;
        const value = parsed[field];
        if (typeof value === "string" || typeof value === "number") key = String(value);
      } catch {
        // 손상된 meta는 "(없음)"으로 묶는다.
      }
    }
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}
