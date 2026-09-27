import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { PRODUCT_CATALOG, isProductType, type ProductType } from "@/lib/payment/config";
import { rateLimit } from "@/lib/security/rateLimit";
import { orderAccessCookieName, signOrderAccessToken, verifyOrderAccessToken } from "@/lib/payment/orderAccess";
import { PREMIUM_SECTION_KEYS } from "@/lib/reports/generate";

interface CreateOrderBody {
  productType?: ProductType;
  birthInput?: SajuInput;
  selfInput?: SajuInput;
  partnerInput?: SajuInput;
  // single_section: 살 항목 하나 / section_upgrade: 이어받을 원래 1가지 주문
  sectionKey?: string;
  parentPaymentId?: string;
}

class OrderRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// 주문에 저장할 생년월일 데이터의 모양은 상품 타입에 따라 다르다(단일 사주 vs 본인+상대방).
// 가격/상품명은 절대 body에서 받지 않고 PRODUCT_CATALOG(서버)에서만 결정한다 —
// 클라이언트가 금액을 조작해도 카탈로그에 없는 금액으로는 주문 자체가 생성되지 않는다.
type BirthInputPayload = SajuInput | { self: SajuInput; partner: SajuInput };

function validateAndBuildPayload(body: CreateOrderBody, productType: ProductType): BirthInputPayload {
  if (productType === "premium_report" || productType === "new_year_report" || productType === "single_section") {
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

  let birthInputJson: string;
  let sectionKey: string | null = null;
  let parentPaymentId: string | null = null;
  let inheritedAiResultJson: string | null = null;
  try {
    if (productType === "section_upgrade") {
      // 차액 결제: 생년월일은 클라이언트가 아니라 원래 주문에서 그대로 가져온다. 원래 주문을 만든 그
      // 브라우저(접근 쿠키)만, 결제 완료된 1가지 주문에 대해서만 차액 주문을 만들 수 있다.
      const parentId = String(body.parentPaymentId ?? "");
      const parent = parentId ? await prisma.order.findUnique({ where: { paymentId: parentId } }) : null;
      if (!parent || parent.productType !== "single_section" || parent.status !== "PAID") {
        throw new OrderRequestError("차액 결제할 수 있는 주문이 아닙니다.", 400);
      }
      if (!(await verifyOrderAccessToken(parentId, req.cookies.get(orderAccessCookieName(parentId))?.value))) {
        throw new OrderRequestError("이 주문에 접근할 권한이 없습니다.", 403);
      }
      birthInputJson = parent.birthInputJson;
      parentPaymentId = parentId;
      // 이미 만들어둔 그 1가지 해석은 이어받아서 다시 생성하지 않는다(나머지 4가지만 새로 생성).
      inheritedAiResultJson = parent.aiResultJson;
    } else {
      // 입력값이 유효한 사주 데이터인지 미리 검증(결제만 되고 리포트를 못 만드는 상황 방지)
      birthInputJson = JSON.stringify(validateAndBuildPayload(body, productType));
      if (productType === "single_section") {
        if (!(PREMIUM_SECTION_KEYS as string[]).includes(String(body.sectionKey))) {
          throw new OrderRequestError("볼 항목을 선택해 주세요.", 400);
        }
        sectionKey = String(body.sectionKey);
      }
    }
  } catch (e) {
    if (e instanceof OrderRequestError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
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
        birthInputJson,
        sectionKey,
        parentPaymentId,
        aiResultJson: inheritedAiResultJson,
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
