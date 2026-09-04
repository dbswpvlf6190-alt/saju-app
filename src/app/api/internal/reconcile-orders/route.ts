import { NextRequest, NextResponse } from "next/server";
import { reconcileStalePendingOrders } from "@/lib/payment/reconcile";

/**
 * Vercel Cron이 주기적으로 호출한다(vercel.json 참고). CRON_SECRET으로만 실행되는
 * 내부 전용 엔드포인트라 공개 API가 아니다. 결제창 이탈로 클라이언트가 완료 처리를
 * 못 부른 채 PENDING으로 남은 주문을 PortOne에 재조회해 복구한다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await reconcileStalePendingOrders();
  return NextResponse.json({ ok: true, ...result });
}
