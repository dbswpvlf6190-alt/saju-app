import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";
import { calculateSaju, type SajuInput } from "@/lib/saju";
import { generateFreeContent, getPremiumSections } from "@/lib/saju/content";
import { getPremiumReport, getNewYearReport } from "@/lib/reports/generate";
import { PRODUCT_CATALOG, type ProductType } from "@/lib/payment/config";
import { PillarCard } from "@/components/saju/PillarCard";
import { WuxingBar } from "@/components/saju/WuxingBar";
import { WuxingMascot } from "@/components/saju/WuxingMascot";

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

  const productName = PRODUCT_CATALOG[order.productType as ProductType]?.name ?? order.productType;

  if (order.productType === "compatibility_report") {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-3 px-5 py-16 text-center">
        <h1 className="font-serif text-xl text-accent-gold-soft">{productName}</h1>
        <p className="text-sm text-foreground-muted">
          궁합 리포트 다시보기는 아직 준비 중이에요. 곧 지원할게요.
        </p>
      </div>
    );
  }

  const birthInput = JSON.parse(order.birthInputJson) as SajuInput;
  const result = calculateSaju(birthInput);
  const free = generateFreeContent(result);

  if (order.productType === "new_year_report") {
    const res = await getNewYearReport(order.paymentId, order.birthInputJson, order.aiResultJson);
    const data = await res.json();
    const text: string | undefined = data.sections?.newYear;
    return (
      <div className="flex w-full max-w-md flex-col gap-6 px-5 py-10">
        <ReportHeader productName={productName} free={free} result={result} />
        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
          <h3 className="text-sm font-medium text-foreground-muted">{productName}</h3>
          <p className="whitespace-pre-line leading-relaxed text-foreground">
            {text ?? "리포트를 준비 중이에요. 잠시 후 다시 확인해 주세요."}
          </p>
        </div>
      </div>
    );
  }

  // premium_report
  const premiumSections = getPremiumSections(result);
  const res = await getPremiumReport(order.paymentId, order.birthInputJson, order.aiResultJson);
  const data = await res.json();
  const sections: Record<string, string> = data.sections ?? {};

  return (
    <div className="flex w-full max-w-md flex-col gap-6 px-5 py-10">
      <ReportHeader productName={productName} free={free} result={result} />

      <div className="grid grid-cols-4 gap-2">
        <PillarCard label="년주" pillar={result.yearPillar} />
        <PillarCard label="월주" pillar={result.monthPillar} />
        <PillarCard label="일주" pillar={result.dayPillar} />
        <PillarCard label="시주" pillar={result.timePillar} />
      </div>

      <WuxingBar percent={result.wuxingPercent} />

      <div className="flex flex-col gap-3">
        {premiumSections.map((section) => (
          <div key={section.key} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
            <h4 className="font-medium text-accent-gold-soft">{section.title}</h4>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">
              {sections[section.key] ?? "리포트를 준비 중이에요. 잠시 후 다시 확인해 주세요."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportHeader({
  productName,
  free,
  result,
}: {
  productName: string;
  free: ReturnType<typeof generateFreeContent>;
  result: ReturnType<typeof calculateSaju>;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-xs text-foreground-muted">{productName}</span>
      <WuxingMascot wuxing={result.dayPillar.ganWuxing} size={88} />
      <h1 className="font-serif text-xl text-accent-gold-soft">{free.dayMasterLabel}</h1>
      <p className="text-sm text-foreground-muted">{free.dayMasterMetaphor}</p>
    </div>
  );
}
