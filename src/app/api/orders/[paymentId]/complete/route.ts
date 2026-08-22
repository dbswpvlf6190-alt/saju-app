import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchPortOnePayment, PortOneVerificationError } from "@/lib/payment/verify";
import { rateLimit } from "@/lib/security/rateLimit";

/**
 * 클라이언트가 PortOne 결제창에서 성공 응답을 받은 뒤 호출한다.
 * 클라이언트가 보낸 값은 신뢰하지 않고, 서버가 PortOne API를 직접 조회해
 * 결제 상태(PAID)와 금액이 우리가 발급한 주문과 정확히 일치하는지 재검증한다.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { ok, retryAfterSeconds } = rateLimit(req, "orders:complete", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const { paymentId } = await params;

  const order = await prisma.order.findUnique({ where: { paymentId } });
  if (!order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  // 이미 처리된 주문이면 중복 결제 검증/처리 없이 현재 상태를 그대로 반환한다(멱등 처리).
  if (order.status !== "PENDING") {
    return NextResponse.json({ status: order.status });
  }

  let payment;
  try {
    payment = await fetchPortOnePayment(paymentId);
  } catch (e) {
    if (e instanceof PortOneVerificationError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    throw e;
  }

  const isAmountValid = payment.amount.total === order.amount;
  const isPaid = payment.status === "PAID";

  if (!isPaid || !isAmountValid) {
    await prisma.order.update({ where: { paymentId }, data: { status: "FAILED" } });
    return NextResponse.json(
      { error: isAmountValid ? "결제가 완료되지 않았습니다." : "결제 금액이 일치하지 않습니다." },
      { status: 400 },
    );
  }

  const updated = await prisma.order.update({
    where: { paymentId },
    data: { status: "PAID", paidAt: new Date() },
  });

  return NextResponse.json({ status: updated.status });
}
