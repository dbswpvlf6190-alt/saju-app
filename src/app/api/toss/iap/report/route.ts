import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyOrderAccessToken } from "@/lib/payment/orderAccess";
import { getPremiumReport, getReportLayout, type ReportSectionKey } from "@/lib/reports/generate";
import { isManualChapterKey } from "@/lib/reports/manualChapters";
import { rateLimit } from "@/lib/security/rateLimit";
import { corsHeaders } from "@/lib/toss/iap";

// 장 하나 생성에 20~45초(재시도 포함) 걸린다.
export const maxDuration = 60;

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

function withCors(req: NextRequest, res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(corsHeaders(req.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

/**
 * 미니앱이 결제 후 받은 token(x-order-token)으로 리포트를 읽는다.
 *   ?paymentId=toss-...&layout=1            → { layout, keys }
 *   ?paymentId=toss-...&section=overview    → { sections: { overview: "..." } }
 * 웹의 GET /api/orders/[paymentId]와 같은 생성·캐시 함수를 쓰되, 쿠키 대신 헤더 토큰으로 확인한다.
 */
export async function GET(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "toss:report", { limit: 60, windowMs: 60_000 });
  if (!ok) {
    return withCors(req, NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }));
  }

  const paymentId = req.nextUrl.searchParams.get("paymentId") ?? "";
  if (!paymentId.startsWith("toss-")) {
    return withCors(req, NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 }));
  }

  try {
    if (!(await verifyOrderAccessToken(paymentId, req.headers.get("x-order-token")))) {
      return withCors(req, NextResponse.json({ error: "이 리포트에 접근할 권한이 없습니다." }, { status: 403 }));
    }
    const order = await prisma.order.findUnique({ where: { paymentId } });
    if (!order) return withCors(req, NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 }));
    if (order.status !== "PAID") return withCors(req, NextResponse.json({ status: order.status }));

    const cached = (order.aiResultJson ? JSON.parse(order.aiResultJson) : {}) as Record<string, string>;
    const layout = getReportLayout(cached, order.productType);
    if (req.nextUrl.searchParams.get("layout")) {
      return withCors(req, NextResponse.json({ status: "PAID", layout: layout.layout, keys: layout.keys }));
    }

    const section = req.nextUrl.searchParams.get("section");
    if (!isManualChapterKey(section) || !(layout.keys as string[]).includes(section)) {
      return withCors(req, NextResponse.json({ error: "열 수 없는 항목입니다." }, { status: 400 }));
    }
    const res = await getPremiumReport(order.paymentId, order.birthInputJson, order.aiResultJson, [section as ReportSectionKey], order.productType);
    return withCors(req, res as NextResponse);
  } catch (e) {
    console.error(`토스 리포트 조회 중 오류 (paymentId=${paymentId}):`, e);
    return withCors(req, NextResponse.json({ error: "리포트를 불러오지 못했습니다." }, { status: 500 }));
  }
}
