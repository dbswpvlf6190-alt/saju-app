import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { fetchPortOnePayment, PortOneVerificationError } from "@/lib/payment/verify";
import { rateLimit } from "@/lib/security/rateLimit";
import { sendPaymentKakaoNotification } from "@/lib/kakao/notify";
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/payment/orderAccess";

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

  // 결제 확인은 실제 돈이 걸린 경로라, 예상 못한 예외로 원인 불명의 500 페이지가 나가는 대신
  // 항상 일관된 JSON 에러로 응답하고 원인은 서버 로그에 남긴다.
  try {
    const order = await prisma.order.findUnique({ where: { paymentId } });
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    // paymentId는 URL·브라우저 히스토리로 노출될 수 있어, 이것만으로는 상태 조회나 결제
    // 재검증을 트리거할 수 없게 한다. 주문을 생성한 바로 그 브라우저에만 심어둔 서명
    // 쿠키를 확인한다(GET /api/orders/[paymentId]와 동일한 패턴, SECURITY_AUDIT_FINAL.md 1-2번).
    const accessToken = req.cookies.get(orderAccessCookieName(paymentId))?.value;
    if (!(await verifyOrderAccessToken(paymentId, accessToken))) {
      return NextResponse.json({ error: "이 주문에 접근할 권한이 없습니다." }, { status: 403 });
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

    // 카카오톡 알림은 결제 완료 자체와 무관한 부가 기능이므로, 실패해도 응답에는 영향을 주지 않는다.
    try {
      await sendPaymentKakaoNotification(updated);
    } catch (e) {
      console.error(`카카오 결제 알림 전송 실패 (paymentId=${paymentId}):`, e);
    }

    return NextResponse.json({ status: updated.status });
  } catch (e) {
    console.error(`결제 완료 처리 중 예상하지 못한 오류 (paymentId=${paymentId}):`, e);
    return NextResponse.json({ error: "결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
