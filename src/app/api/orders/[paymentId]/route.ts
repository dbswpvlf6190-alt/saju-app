import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, type PremiumSectionKey, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { AiInterpretationError, interpretSajuSection } from "@/lib/ai/interpretSaju";

const SECTION_KEYS: PremiumSectionKey[] = ["love", "wealth", "career", "relationship", "yearly"];

/**
 * 결제 완료된 주문의 상세 리포트를 조회한다. AI 해석은 결제 검증(complete)과 분리해
 * 여기서 지연 생성(lazy) 및 캐싱한다 — 결제 성공 여부는 AI 호출 성공 여부에 영향받지 않아야 하고,
 * AI 호출이 실패해도 재결제 없이 다시 시도할 수 있어야 하기 때문이다.
 *
 * 5개 항목을 Promise.all로 한꺼번에 묶으면 한 항목만 실패해도 이미 성공한 나머지 항목까지
 * 통째로 날아가 버린다(비용 낭비 + 결제 고객이 매번 처음부터 다시 기다려야 함). 그래서
 * Promise.allSettled로 항목별 성공/실패를 분리하고, 성공한 항목만 캐시에 누적 저장한 뒤
 * 다음 조회 때는 실패했던 항목만 다시 시도한다.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  try {
    const order = await prisma.order.findUnique({ where: { paymentId } });
    if (!order) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json({ status: order.status });
    }

    const cached = (order.aiResultJson
      ? JSON.parse(order.aiResultJson)
      : {}) as Partial<Record<PremiumSectionKey, string>>;

    const missingKeys = SECTION_KEYS.filter((key) => !cached[key]);
    if (missingKeys.length === 0) {
      return NextResponse.json({ status: "PAID", sections: cached });
    }

    let birthInput: SajuInput;
    try {
      birthInput = JSON.parse(order.birthInputJson) as SajuInput;
    } catch {
      console.error("주문의 생년월일 데이터가 손상되었습니다:", paymentId);
      return NextResponse.json({ status: "PAID", error: "리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
    const result = calculateSaju(birthInput);

    const settled = await Promise.allSettled(
      missingKeys.map(async (key) => [key, await interpretSajuSection(result, key)] as const),
    );

    const sections: Partial<Record<PremiumSectionKey, string>> = { ...cached };
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        const [key, text] = outcome.value;
        sections[key] = text;
      }
    }

    const stillMissing = SECTION_KEYS.filter((key) => !sections[key]);

    // 부분적으로라도 성공한 항목은 저장해서, 다음 조회 때 이미 완료된 항목을 또 호출하지 않는다.
    if (Object.keys(sections).length > Object.keys(cached).length) {
      await prisma.order.update({
        where: { paymentId },
        data: { aiResultJson: JSON.stringify(sections) },
      });
    }

    if (stillMissing.length > 0) {
      const firstFailure = settled.find((o) => o.status === "rejected") as PromiseRejectedResult | undefined;
      const reason = firstFailure?.reason;
      const message =
        reason instanceof AiInterpretationError
          ? reason.message
          : "일부 항목 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
      return NextResponse.json(
        { status: "PAID", sections, missingSections: stillMissing, error: message },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "PAID", sections });
  } catch (e) {
    console.error(`리포트 조회 중 예상하지 못한 오류 (paymentId=${paymentId}):`, e);
    return NextResponse.json({ error: "리포트를 불러오지 못했습니다." }, { status: 500 });
  }
}
