import { prisma } from "@/lib/db/prisma";
import type { PortOnePayment } from "@/lib/payment/verify";
import { sendPaymentKakaoNotification } from "@/lib/kakao/notify";

type OrderRow = Awaited<ReturnType<typeof prisma.order.findUnique>>;

/**
 * PortOne에서 조회한 결제 상태를 주문에 반영한다(PAID/FAILED 판정 + DB 반영 + 카카오 알림).
 * complete 라우트(결제 직후 클라이언트 호출)와 reconcile 배치(뒤늦은 재검증) 양쪽에서
 * 이 함수 하나로 판정 로직을 공유해, 두 경로의 PAID/FAILED 기준이 갈라지지 않게 한다.
 */
export async function finalizeOrderFromPortOnePayment(
  order: NonNullable<OrderRow>,
  payment: PortOnePayment,
): Promise<{ status: "PAID" | "FAILED"; amountValid: boolean }> {
  const isAmountValid = payment.amount.total === order.amount;
  const isPaid = payment.status === "PAID";

  if (!isPaid || !isAmountValid) {
    await prisma.order.update({ where: { paymentId: order.paymentId }, data: { status: "FAILED" } });
    return { status: "FAILED", amountValid: isAmountValid };
  }

  const updated = await prisma.order.update({
    where: { paymentId: order.paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });

  // 카카오톡 알림은 결제 완료 자체와 무관한 부가 기능이므로, 실패해도 판정 결과에는 영향을 주지 않는다.
  try {
    await sendPaymentKakaoNotification(updated);
  } catch (e) {
    console.error(`카카오 결제 알림 전송 실패 (paymentId=${order.paymentId}):`, e);
  }

  return { status: "PAID", amountValid: true };
}
