import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { PREMIUM_REPORT_NAME, PREMIUM_REPORT_PRICE_KRW } from "@/lib/payment/config";
import { rateLimit } from "@/lib/security/rateLimit";

interface CreateOrderBody {
  birthInput?: SajuInput;
}

// 결제창을 열기 전에 먼저 PENDING 상태의 주문을 만들어 paymentId를 발급한다.
// 이 paymentId를 결제창 호출과 이후 검증(완료 처리) 단계에서 동일하게 사용해
// "이 결제가 실제로 우리가 발급한 주문인지"를 추적할 수 있게 한다.
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "orders:create", {
    limit: 10,
    windowMs: 60_000,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body.birthInput) {
    return NextResponse.json({ error: "생년월일 정보가 필요합니다." }, { status: 400 });
  }

  try {
    // 입력값이 유효한 사주 데이터인지 미리 검증(결제만 되고 리포트를 못 만드는 상황 방지)
    calculateSaju(body.birthInput);
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  // 일부 PG(예: KG이니시스 INIStdPay)는 주문번호(oid) 길이를 최대 40자로 제한하므로
  // 접두사 없이 UUID(36자) 그대로 사용한다.
  const paymentId = randomUUID();
  const order = await prisma.order.create({
    data: {
      paymentId,
      amount: PREMIUM_REPORT_PRICE_KRW,
      birthInputJson: JSON.stringify(body.birthInput),
    },
  });

  return NextResponse.json({
    paymentId: order.paymentId,
    amount: order.amount,
    orderName: PREMIUM_REPORT_NAME,
  });
}
