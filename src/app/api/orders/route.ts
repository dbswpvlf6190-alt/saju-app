import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { PRODUCT_CATALOG, isProductType, type ProductType } from "@/lib/payment/config";
import { rateLimit } from "@/lib/security/rateLimit";
import { orderAccessCookieName, signOrderAccessToken } from "@/lib/payment/orderAccess";

interface CreateOrderBody {
  productType?: ProductType;
  birthInput?: SajuInput;
  selfInput?: SajuInput;
  partnerInput?: SajuInput;
}

// 주문에 저장할 생년월일 데이터의 모양은 상품 타입에 따라 다르다(단일 사주 vs 본인+상대방).
// 가격/상품명은 절대 body에서 받지 않고 PRODUCT_CATALOG(서버)에서만 결정한다 —
// 클라이언트가 금액을 조작해도 카탈로그에 없는 금액으로는 주문 자체가 생성되지 않는다.
type BirthInputPayload = SajuInput | { self: SajuInput; partner: SajuInput };

function validateAndBuildPayload(body: CreateOrderBody, productType: ProductType): BirthInputPayload {
  if (productType === "premium_report") {
    if (!body.birthInput) throw new SajuInputError("생년월일 정보가 필요합니다.");
    calculateSaju(body.birthInput);
    return body.birthInput;
  }
  if (!body.selfInput || !body.partnerInput) {
    throw new SajuInputError("본인과 상대방의 생년월일 정보가 모두 필요합니다.");
  }
  calculateSaju(body.selfInput);
  calculateSaju(body.partnerInput);
  return { self: body.selfInput, partner: body.partnerInput };
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

  const productType: ProductType = isProductType(body.productType) ? body.productType : "premium_report";
  const product = PRODUCT_CATALOG[productType];

  let payload: BirthInputPayload;
  try {
    // 입력값이 유효한 사주 데이터인지 미리 검증(결제만 되고 리포트를 못 만드는 상황 방지)
    payload = validateAndBuildPayload(body, productType);
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("주문 생성 전 사주 검증 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }

  // 일부 PG(예: KG이니시스 INIStdPay)는 주문번호(oid) 길이를 최대 40자로 제한하므로
  // 접두사 없이 UUID(36자) 그대로 사용한다.
  const paymentId = randomUUID();
  try {
    const order = await prisma.order.create({
      data: {
        paymentId,
        amount: product.amount,
        productType,
        birthInputJson: JSON.stringify(payload),
      },
    });

    const response = NextResponse.json({
      paymentId: order.paymentId,
      amount: order.amount,
      orderName: product.name,
    });

    // 이 주문을 실제로 생성한 브라우저만 나중에 리포트를 조회할 수 있도록, paymentId와
    // 묶인 서명 토큰을 httpOnly 쿠키로 심어둔다(GET /api/orders/[paymentId]에서 검증).
    response.cookies.set(orderAccessCookieName(order.paymentId), await signOrderAccessToken(order.paymentId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (e) {
    console.error("주문 생성 DB 오류:", e);
    return NextResponse.json({ error: "주문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
