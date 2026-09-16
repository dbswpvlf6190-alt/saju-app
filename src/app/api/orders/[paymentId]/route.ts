import { NextRequest, NextResponse } from "next/server";
import type { PremiumSectionKey } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/payment/orderAccess";
import { PREMIUM_SECTION_KEYS, getCompatibilityReport, getNewYearReport, getPremiumReport } from "@/lib/reports/generate";

function isPremiumSectionKey(value: string | null): value is PremiumSectionKey {
  return !!value && (PREMIUM_SECTION_KEYS as string[]).includes(value);
}

/**
 * 결제 완료된 주문의 상세 리포트를 조회한다. AI 해석은 결제 검증(complete)과 분리해
 * lib/reports/generate.ts에서 지연 생성(lazy) 및 캐싱한다 — 결제 성공 여부는 AI 호출
 * 성공 여부에 영향받지 않아야 하고, AI 호출이 실패해도 재결제 없이 다시 시도할 수 있어야
 * 하기 때문이다. 결제/쿠폰 승인 직후에는 같은 생성 함수를 웜업 용도로도 먼저 호출해둔다
 * (warmReportCache.ts) — 여기서는 그 캐시가 이미 있으면 그대로 반환한다.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  try {
    const order = await prisma.order.findUnique({ where: { paymentId } });
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    // paymentId는 URL·브라우저 히스토리로 노출될 수 있어, 이것만으로는 리포트를 열람할 수
    // 없게 한다. 주문을 생성한 바로 그 브라우저에만 심어둔 서명 쿠키를 확인한다.
    const accessToken = req.cookies.get(orderAccessCookieName(paymentId))?.value;
    if (!(await verifyOrderAccessToken(paymentId, accessToken))) {
      return NextResponse.json({ error: "이 리포트에 접근할 권한이 없습니다." }, { status: 403 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json({ status: order.status });
    }

    if (order.productType === "compatibility_report") {
      return await getCompatibilityReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    }

    if (order.productType === "new_year_report") {
      return await getNewYearReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    }

    // premium_report. ?section=love 처럼 특정 항목 하나만 요청할 수도 있다 — 클라이언트가
    // 5개 항목을 한 번에 묶어 요청하면 제일 늦게 끝나는 항목만큼 화면이 계속 비어 있으므로,
    // 화면을 5개로 나눠 병렬 요청하고 먼저 끝난 항목부터 바로 보여주기 위함이다(PremiumUnlock.tsx).
    // section을 생략하면 기존처럼 5개 전체를 한 번에 처리한다(웜업 호출 등 내부 용도).
    const sectionParam = req.nextUrl.searchParams.get("section");
    const sectionKeys: PremiumSectionKey[] = isPremiumSectionKey(sectionParam)
      ? [sectionParam]
      : PREMIUM_SECTION_KEYS;
    return await getPremiumReport(order.paymentId, order.birthInputJson, order.aiResultJson, sectionKeys);
  } catch (e) {
    console.error(`리포트 조회 중 예상하지 못한 오류 (paymentId=${paymentId}):`, e);
    return NextResponse.json({ error: "리포트를 불러오지 못했습니다." }, { status: 500 });
  }
}
