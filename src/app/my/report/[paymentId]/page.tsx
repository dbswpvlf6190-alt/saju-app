import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";
import { OrderReportView } from "@/components/report/OrderReportView";

export const dynamic = "force-dynamic";

/** 로그인 계정에 연결해둔 과거 주문의 리포트를 다시 보여준다. 결제 화면(PremiumUnlock 등)과
 * 달리 이미 로그인 인증을 통과한 서버 컴포넌트라, 쿠폰/결제 당시의 orderAccess 쿠키나
 * sessionStorage 없이도 DB에 저장된 birthInputJson만으로 그 자리에서 다시 계산해 보여준다. */
export default async function MyReportPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const cookieStore = await cookies();
  const userId = await verifySessionCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!userId) notFound();

  const order = await prisma.order.findUnique({ where: { paymentId } });
  if (!order || order.userId !== userId || order.status !== "PAID") notFound();

  return <OrderReportView order={order} />;
}
