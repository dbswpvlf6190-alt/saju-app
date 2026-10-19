import type { PortOnePayment } from "@/lib/payment/verify";

/** 알림에 쓸 실패 사유 한 줄. */
export function describeFailure(payment: PortOnePayment, isAmountValid: boolean): string {
  if (!isAmountValid) return `금액 불일치(결제 ${payment.amount.total.toLocaleString()}원)`;
  const f = payment.failure;
  const parts = [f?.pgCode, f?.pgMessage ?? f?.reason].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : `상태 ${payment.status}`;
}
