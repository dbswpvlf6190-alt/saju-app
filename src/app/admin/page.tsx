import { prisma } from "@/lib/db/prisma";
import { AdminReviewToggle } from "@/components/admin/AdminReviewToggle";
import { reconcileStalePendingOrders } from "@/lib/payment/reconcile";
import { getFunnelSummary } from "@/lib/analytics/funnelSummary";
import type { AnalyticsEventName } from "@/lib/analytics/events";

// 매출/주문 데이터는 요청마다 최신 상태여야 하므로 빌드 시점 정적 캐싱을 막는다.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  FAILED: "실패",
  CANCELED: "취소",
};

// 30DAY_FINAL_PLAN.md의 퍼널 순서(랜딩→시작→완료→CTA→결제)를 그대로 따른 표시 순서·라벨.
const EVENT_LABEL: Record<AnalyticsEventName, string> = {
  landing_view: "랜딩 조회",
  saju_start: "무료 사주 시작",
  saju_complete: "사주 계산 완료",
  free_result_view: "무료 결과 조회",
  premium_preview_view: "상세분석 미리보기 노출",
  premium_cta_click: "상세분석 CTA 클릭",
  checkout_start: "결제 시작",
  payment_success: "결제 성공",
  payment_fail: "결제 실패",
  compatibility_start: "궁합 입력 시작",
  compatibility_complete: "궁합 계산 완료",
  compatibility_premium_click: "궁합 상세분석 CTA 클릭",
  daily_fortune_view: "오늘의 운세 조회",
  share_click: "공유 클릭",
  review_submit: "후기 작성",
};

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function AdminPage() {
  // Vercel Cron(vercel.json)이 매시간 재검증하지만, Hobby 플랜은 실제로는 하루 1회로
  // 제한될 수 있다. 그 안전망과 별개로, 관리자가 대시보드를 열 때마다도 정체된 PENDING
  // 주문을 즉시 재검증해서 화면에 최신 상태가 보이게 한다.
  await reconcileStalePendingOrders();

  const [orders, paidAgg, statusCounts, reviews, funnel] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
    prisma.review.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    getFunnelSummary(7),
  ]);

  const totalRevenue = paidAgg._sum.amount ?? 0;
  const paidCount = paidAgg._count;

  return (
    <div className="flex flex-1 flex-col gap-8 bg-background px-6 py-10 text-foreground">
      <h1 className="font-serif text-2xl text-accent-gold-soft">관리자 대시보드</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="총 매출" value={`${totalRevenue.toLocaleString()}원`} />
        <StatCard label="결제완료 건수" value={`${paidCount}건`} />
        {statusCounts.map((s) => (
          <StatCard key={s.status} label={STATUS_LABEL[s.status] ?? s.status} value={`${s._count}건`} />
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-background-elevated text-foreground-muted">
            <tr>
              <th className="px-4 py-3">결제 ID</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">금액</th>
              <th className="px-4 py-3">생성 시각</th>
              <th className="px-4 py-3">결제 완료 시각</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-border-subtle">
                <td className="px-4 py-3 font-mono text-xs">{order.paymentId}</td>
                <td className="px-4 py-3">{STATUS_LABEL[order.status] ?? order.status}</td>
                <td className="px-4 py-3">{order.amount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-foreground-muted">
                  {order.createdAt.toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {order.paidAt ? order.paidAt.toLocaleString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-foreground-muted">
                  아직 주문이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="font-serif text-xl text-accent-gold-soft">퍼널 요약 (최근 {funnel.windowDays}일)</h2>
      <p className="-mt-4 text-xs text-foreground-muted">
        MARKETING_KPI.md의 ④~⑩번 지표. ①~③(조회수·도달·프로필방문)은 Instagram Insights에서 직접 확인해야 해요.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="CTA 클릭율 (⑦÷⑥)" value={pct(funnel.counts.premium_cta_click, funnel.counts.saju_complete)} />
        <StatCard label="결제 시작율 (⑧÷⑦)" value={pct(funnel.counts.checkout_start, funnel.counts.premium_cta_click)} />
        <StatCard label="결제 성공율 (⑨÷⑧)" value={pct(funnel.counts.payment_success, funnel.counts.checkout_start)} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.keys(EVENT_LABEL) as AnalyticsEventName[]).map((name) => (
          <StatCard key={name} label={EVENT_LABEL[name]} value={`${funnel.counts[name]}건`} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BreakdownTable title="랜딩 유입 경로 (ref)" rows={funnel.landingRefBreakdown} />
        <BreakdownTable title="공유 버튼 위치 (source)" rows={funnel.shareSourceBreakdown} />
      </div>

      <h2 className="font-serif text-xl text-accent-gold-soft">후기 관리</h2>
      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-background-elevated text-foreground-muted">
            <tr>
              <th className="px-4 py-3">별점</th>
              <th className="px-4 py-3">내용</th>
              <th className="px-4 py-3">상품</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">작성일</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className="border-t border-border-subtle">
                <td className="px-4 py-3">{"★".repeat(review.rating)}</td>
                <td className="max-w-xs truncate px-4 py-3">{review.content}</td>
                <td className="px-4 py-3 text-foreground-muted">{review.productType}</td>
                <td className="px-4 py-3 text-foreground-muted">{review.visible ? "노출" : "숨김"}</td>
                <td className="px-4 py-3 text-foreground-muted">{review.createdAt.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3">
                  <AdminReviewToggle id={review.id} visible={review.visible} />
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-foreground-muted">
                  아직 후기가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { key: string; count: number }[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle">
      <div className="bg-background-elevated px-4 py-2 text-sm font-medium text-foreground-muted">{title}</div>
      <table className="w-full text-left text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border-subtle">
              <td className="px-4 py-2 font-mono text-xs">{row.key}</td>
              <td className="px-4 py-2 text-right">{row.count}건</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-3 text-center text-foreground-muted">데이터 없음</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
