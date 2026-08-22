export class PortOneVerificationError extends Error {}

interface PortOnePaymentAmount {
  total: number;
}

export interface PortOnePayment {
  status: string;
  amount: PortOnePaymentAmount;
  id: string;
}

/**
 * PortOne 결제 단건 조회 API로 실제 결제 상태/금액을 서버에서 직접 확인한다.
 * 클라이언트가 보낸 "결제 성공" 신호를 그대로 믿지 않고, 반드시 이 검증을 거친 뒤에만
 * 주문을 PAID로 확정해야 한다(금액 위변조·재생 공격 방지).
 */
export async function fetchPortOnePayment(paymentId: string): Promise<PortOnePayment> {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new PortOneVerificationError("PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.");
  }

  const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new PortOneVerificationError(`PortOne 결제 조회 실패 (status ${res.status})`);
  }

  return (await res.json()) as PortOnePayment;
}
