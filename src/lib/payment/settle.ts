import { prisma } from "@/lib/db/prisma";
import type { PortOnePayment } from "@/lib/payment/verify";
import { describeFailure } from "@/lib/payment/failure";
import { sendPaymentFailureKakaoNotification, sendPaymentKakaoNotification } from "@/lib/kakao/notify";
import { ensureConsultPass } from "@/lib/consult/pass";

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

    // 왜 실패했는지 DB에 남긴다(11/12 첫 신년운세 손님 결제 실패 때 사유를 알 길이 없었다). 개인정보 없이 상태·PG 사유만.
    try {
      await prisma.analyticsEvent.create({
        data: {
          name: "payment_fail_detail",
          metaJson: JSON.stringify({
            productType: order.productType,
            status: payment.status,
            reason: describeFailure(payment, isAmountValid).slice(0, 160),
            order: order.paymentId.slice(-8),
          }),
        },
      });
    } catch (e) {
      console.error(`결제 실패 사유 기록 실패 (paymentId=${order.paymentId}):`, e);
    }

    // 알림은 "결제 시도가 실제로 실패했거나 금액이 맞지 않은 경우"만 보낸다. 결제창을 열었다가 닫은 이탈(READY·PENDING 등)은
    // 정상적으로 자주 일어나므로 알리지 않는다. 알림 실패는 주문 판정에 영향을 주지 않는다.
    if (payment.status === "FAILED" || (isPaid && !isAmountValid)) {
      try {
        await sendPaymentFailureKakaoNotification({
          amount: order.amount,
          productType: order.productType,
          paymentId: order.paymentId,
          reason: describeFailure(payment, isAmountValid),
        });
      } catch (e) {
        console.error(`카카오 결제 실패 알림 전송 실패 (paymentId=${order.paymentId}):`, e);
      }
    }
    return { status: "FAILED", amountValid: isAmountValid };
  }

  const updated = await prisma.order.update({
    where: { paymentId: order.paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });

  // AI 상담 상품이면 상담권(+묶음 리포트용 0원 내부 주문)을 발급한다. 멱등이라 reconcile에서 다시 불려도 안전하다.
  await ensureConsultPass(updated);

  // 카카오톡 알림은 결제 완료 자체와 무관한 부가 기능이므로, 실패해도 판정 결과에는 영향을 주지 않는다.
  try {
    await sendPaymentKakaoNotification(updated);
  } catch (e) {
    console.error(`카카오 결제 알림 전송 실패 (paymentId=${order.paymentId}):`, e);
  }

  return { status: "PAID", amountValid: true };
}
