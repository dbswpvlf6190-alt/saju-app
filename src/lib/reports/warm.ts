import { prisma } from "@/lib/db/prisma";
import { getCompatibilityReport, getNewYearReport, getPremiumReport } from "./generate";

type OrderRow = NonNullable<Awaited<ReturnType<typeof prisma.order.findUnique>>>;

/**
 * 결제(또는 쿠폰) 승인 직후, 클라이언트가 리포트 화면을 열기도 전에 AI 해석을 미리
 * 생성해서 캐싱해둔다. 원래는 사용자가 리포트 화면을 여는 시점에야 생성을 시작해서,
 * 5개 항목이 다 끝날 때까지 화면이 비어 있는 체감 대기시간이 길었다 — 결제 확인/결제창
 * 종료 애니메이션 등으로 화면 전환에 몇 초는 걸리므로, 그 사이에 미리 만들어두면 실제
 * 리포트 화면을 열었을 때 이미 캐시가 채워져 있을 가능성이 높다.
 *
 * 호출부(complete/coupons redeem 라우트)의 응답을 막지 않도록 반드시 `after()`로만
 * 부른다 — 실패해도 여기서 던지지 않고 삼켜서, 실패 시엔 기존처럼 화면을 열 때
 * 지연 생성으로 자연히 재시도된다(사용자에게 아무 영향 없음).
 */
export async function warmReportCache(order: OrderRow): Promise<void> {
  try {
    if (order.productType === "compatibility_report") {
      await getCompatibilityReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    } else if (order.productType === "new_year_report") {
      await getNewYearReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    } else {
      await getPremiumReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    }
  } catch (e) {
    console.error(`리포트 웜업 생성 중 오류 (paymentId=${order.paymentId}):`, e);
  }
}
