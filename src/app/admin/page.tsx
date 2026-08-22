import { prisma } from "@/lib/db/prisma";

// 매출/주문 데이터는 요청마다 최신 상태여야 하므로 빌드 시점 정적 캐싱을 막는다.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "결제대기",
  PAID: "결제완료",
  FAILED: "실패",
  CANCELED: "취소",
};

export default async function AdminPage() {
  const [orders, paidAgg, statusCounts] = await Promise.all([
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.order.aggregate({ where: { status: "PAID" }, _sum: { amount: true }, _count: true }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
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
