import { NextRequest, NextResponse, after } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { signOrderAccessToken } from "@/lib/payment/orderAccess";
import { rateLimit } from "@/lib/security/rateLimit";
import { warmReportCache } from "@/lib/reports/warm";
import {
  TossIapError,
  corsHeaders,
  fetchTossOrderStatus,
  isPaidStatus,
  resolveTossProduct,
  tossIapConfigured,
} from "@/lib/toss/iap";

// 리포트 생성은 응답 뒤(after)에서 시작하지만, 같은 함수 안이라 넉넉히 둔다.
export const maxDuration = 60;

/** 미니앱(브라우저)은 쿠키를 믿을 수 없어, 주문 접근 토큰을 응답 본문으로 준다(이후 x-order-token 헤더로 조회). */
export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

interface GrantBody {
  orderId?: string;
  birthInput?: SajuInput;
}

function json(req: NextRequest, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(req.headers.get("origin")), ...extra } });
}

/**
 * 미니앱 processProductGrant 콜백에서 호출한다. 토스 서버에 주문 상태를 직접 확인한 뒤(mTLS),
 * 같은 orderId로는 한 번만 주문(Order)을 만들고 리포트 접근 토큰을 돌려준다(멱등).
 * 응답이 성공일 때만 미니앱이 true를 반환해 토스 쪽 주문이 "지급 완료"로 닫힌다.
 */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "toss:grant", { limit: 20, windowMs: 60_000 });
  if (!ok) return json(req, { error: "요청이 너무 많습니다." }, 429, { "Retry-After": String(retryAfterSeconds) });

  if (!tossIapConfigured()) return json(req, { error: "인앱 결제가 아직 준비되지 않았습니다." }, 503);

  let body: GrantBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "잘못된 요청 형식입니다." }, 400);
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!/^[A-Za-z0-9._:-]{8,100}$/.test(orderId)) return json(req, { error: "주문 번호가 올바르지 않습니다." }, 400);

  const paymentId = `toss-${orderId}`;

  try {
    // 응답 시간이 짧아야 한다(토스가 지급 응답을 기다리다 시간 초과로 오류를 띄운 사례, 2026-10-20). 그래서 기존 주문 조회와
    // 토스 주문 상태 확인을 동시에 시작한다. 이미 지급한 주문이면 토스 결과는 쓰지 않는다(미결 주문 복구 때 재호출돼도 안전).
    let birthInputJson: string;
    try {
      if (!body.birthInput) throw new SajuInputError("생년월일 정보가 필요합니다.");
      calculateSaju(body.birthInput);
      birthInputJson = JSON.stringify(body.birthInput);
    } catch (e) {
      if (e instanceof SajuInputError) return json(req, { error: e.message }, 400);
      throw e;
    }

    const [existing, tossResult] = await Promise.all([
      prisma.order.findUnique({ where: { paymentId } }),
      fetchTossOrderStatus(orderId).catch((e: unknown) => e),
    ]);

    if (existing) {
      if (existing.status !== "PAID") return json(req, { error: "이 주문은 사용할 수 없습니다." }, 409);
      return json(req, { paymentId, token: await signOrderAccessToken(paymentId) });
    }

    // 클라이언트가 보낸 값은 믿지 않고 토스 서버에서 상태와 상품(sku)을 직접 확인한다.
    if (tossResult instanceof Error) throw tossResult;
    const result = tossResult as Awaited<ReturnType<typeof fetchTossOrderStatus>>;
    if (!isPaidStatus(result.status)) {
      return json(req, { error: "결제가 완료되지 않은 주문입니다.", status: result.status }, 402);
    }
    const product = resolveTossProduct(result.sku);
    if (!product) {
      return json(req, { error: "알 수 없는 상품입니다." }, 400);
    }

    let order;
    try {
      order = await prisma.order.create({
        data: {
          paymentId,
          status: "PAID",
          amount: product.amount,
          productType: product.productType,
          birthInputJson,
          paidAt: new Date(),
        },
      });
    } catch (e) {
      // 같은 orderId가 동시에 두 번 들어온 경우: 먼저 만든 주문을 그대로 쓴다.
      if ((e as { code?: string }).code === "P2002") {
        return json(req, { paymentId, token: await signOrderAccessToken(paymentId) });
      }
      throw e;
    }

    after(() => warmReportCache(order));
    return json(req, { paymentId, token: await signOrderAccessToken(paymentId) });
  } catch (e) {
    if (e instanceof TossIapError) {
      console.error(`토스 주문 확인 실패 (orderId=${orderId}, ${e.kind}):`, e.message);
      return json(req, { error: "결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }
    console.error(`토스 인앱 결제 지급 중 오류 (orderId=${orderId}):`, e);
    return json(req, { error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }
}
