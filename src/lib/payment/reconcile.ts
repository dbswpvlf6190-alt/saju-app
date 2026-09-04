import { prisma } from "@/lib/db/prisma";
import { fetchPortOnePayment, PortOneVerificationError } from "@/lib/payment/verify";
import { finalizeOrderFromPortOnePayment } from "@/lib/payment/settle";

// 결제창 이탈(카카오페이 리디렉션 복귀 실패, 결제 도중 브라우저 종료 등)로 클라이언트가
// /complete를 끝까지 호출하지 못하면, 실제로는 결제가 끝났는데도 주문이 영원히 PENDING으로
// 남는다 — 이 경우 고객은 돈을 냈는데 리포트를 못 받는다(2026-09-04 발견, 원인은 완료 처리가
// 100% 클라이언트 주도였던 것). 이 배치가 PortOne을 재조회해 뒤늦게 복구한다.
//
// 방금 생성된 주문까지 건드리면 결제 진행 중인 정상 흐름을 오판할 수 있으므로, 유예시간이
// 지난 주문만 대상으로 한다.
const GRACE_PERIOD_MS = 15 * 60 * 1000;

export async function reconcileStalePendingOrders(): Promise<{
  checked: number;
  recovered: number;
  failed: number;
  skipped: number;
}> {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
  });

  let recovered = 0;
  let failed = 0;
  let skipped = 0;

  for (const order of stale) {
    let payment;
    try {
      payment = await fetchPortOnePayment(order.paymentId);
    } catch (e) {
      // PortOne 조회 자체가 실패(네트워크/설정 오류)하면 판단을 미루고 다음 주기에 재시도한다 —
      // 실제로 결제된 주문을 이 오류 때문에 FAILED로 오판하는 걸 막기 위함이다.
      if (e instanceof PortOneVerificationError) {
        console.error(`주문 재검증 실패, 다음 주기에 재시도 (paymentId=${order.paymentId}):`, e.message);
        skipped++;
        continue;
      }
      throw e;
    }

    const result = await finalizeOrderFromPortOnePayment(order, payment);
    if (result.status === "PAID") recovered++;
    else failed++;
  }

  return { checked: stale.length, recovered, failed, skipped };
}
