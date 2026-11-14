import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { tokenMatches } from "@/lib/consult/pass";
import { OrderReportView } from "@/components/report/OrderReportView";

export const dynamic = "force-dynamic";
// 리포트는 처음 열 때 생성된다(이후엔 저장본). 결제 리포트 API와 같은 상한.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "상담권 리포트 | 사주랩",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

type Params = Promise<{ passId: string; kind: string }>;
type SearchParams = Promise<{ k?: string }>;

/** 묶음 상담권에 든 리포트(신년운세 ny, 평생 사용설명서 pr). 상담권 토큰으로만 열고, 처음 연 시각을 남긴다(환불 기준). */
export default async function ConsultReportPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ passId, kind }, { k }] = await Promise.all([params, searchParams]);
  if (kind !== "ny" && kind !== "pr") notFound();

  const pass = await prisma.consultPass.findUnique({ where: { id: passId } });
  if (!pass || !tokenMatches(pass.token, k)) notFound();

  const order = await prisma.order.findUnique({ where: { paymentId: `${pass.orderPaymentId}-${kind}` } });
  if (!order || order.status !== "PAID") notFound();

  const opened = JSON.parse(pass.reportsOpenedJson) as Record<string, string>;
  if (!opened[kind] || !pass.openedAt) {
    const now = new Date().toISOString();
    await prisma.consultPass.update({
      where: { id: pass.id },
      data: {
        reportsOpenedJson: JSON.stringify({ ...opened, [kind]: opened[kind] ?? now }),
        ...(pass.openedAt ? {} : { openedAt: new Date(now) }),
      },
    });
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-md px-5 pt-6">
        <Link href={`/consult/${pass.id}?k=${encodeURIComponent(k ?? "")}`} className="text-sm text-accent-gold-soft underline underline-offset-4">
          ← 상담방으로 돌아가기
        </Link>
      </div>
      <OrderReportView order={order} />
    </div>
  );
}
