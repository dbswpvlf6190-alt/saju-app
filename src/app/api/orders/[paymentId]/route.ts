import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, type PremiumSectionKey, type SajuInput } from "@/lib/saju";
import {
  calculateCompatibilityScores,
  isCompatibilityReportComplete,
  COMPATIBILITY_SECTION_KEYS,
  type CompatibilityReportCache,
} from "@/lib/saju/compatibility";
import { prisma } from "@/lib/db/prisma";
import { AiInterpretationError, interpretSajuSection } from "@/lib/ai/interpretSaju";
import { interpretCompatibilitySection } from "@/lib/ai/interpretCompatibility";
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/payment/orderAccess";

const PREMIUM_SECTION_KEYS: PremiumSectionKey[] = ["love", "wealth", "career", "relationship", "yearly"];

/** 궁합 상대방(제3자) 원본 생년월일이 보관기간 경과 후 파기되면 이 표시로 대체된다
 * (scripts/purge-partner-data 라우트 참고). 파기 이후에는 이 분기를 만날 일이 없어야
 * 정상이다 — 파기는 리포트 생성이 완전히 끝난 주문에 한해서만 이뤄지기 때문이다. */
interface PurgedPartnerMarker {
  purged: true;
  purgedAt: string;
}

function isPurgedPartner(value: unknown): value is PurgedPartnerMarker {
  return !!value && typeof value === "object" && (value as { purged?: unknown }).purged === true;
}

/**
 * 결제 완료된 주문의 상세 리포트를 조회한다. AI 해석은 결제 검증(complete)과 분리해
 * 여기서 지연 생성(lazy) 및 캐싱한다 — 결제 성공 여부는 AI 호출 성공 여부에 영향받지 않아야 하고,
 * AI 호출이 실패해도 재결제 없이 다시 시도할 수 있어야 하기 때문이다.
 *
 * 여러 항목을 Promise.all로 한꺼번에 묶으면 한 항목만 실패해도 이미 성공한 나머지 항목까지
 * 통째로 날아가 버린다(비용 낭비 + 결제 고객이 매번 처음부터 다시 기다려야 함). 그래서
 * Promise.allSettled로 항목별 성공/실패를 분리하고, 성공한 항목만 캐시에 누적 저장한 뒤
 * 다음 조회 때는 실패했던 항목만 다시 시도한다. premium_report/compatibility_report 둘 다
 * 이 로직을 공유하고, 항목별 AI 호출 함수만 상품 타입에 따라 다르게 쓴다.
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

    // premium_report
    const cached = (order.aiResultJson ? JSON.parse(order.aiResultJson) : {}) as Record<string, string>;
    const sectionKeys = PREMIUM_SECTION_KEYS;
    const missingKeys = sectionKeys.filter((key) => !cached[key]);
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
    return await finalizeSections(paymentId, cached, settled, sectionKeys);
  } catch (e) {
    console.error(`리포트 조회 중 예상하지 못한 오류 (paymentId=${paymentId}):`, e);
    return NextResponse.json({ error: "리포트를 불러오지 못했습니다." }, { status: 500 });
  }
}

/**
 * 궁합 리포트는 premium_report와 달리 점수(scores)를 매번 원본 생년월일에서 재계산해왔다.
 * 이 함수는 sections와 scores를 함께 캐싱해서, 생성이 완전히 끝난 뒤에는 원본 생년월일
 * (birthInputJson, 특히 상대방=제3자 데이터)을 전혀 다시 읽지 않아도 되게 한다 — 이게 있어야
 * 보관기간 경과 후 상대방 원본을 파기해도 재열람이 깨지지 않는다(PRIVACY_DB_API_AUDIT.md 4번).
 */
async function getCompatibilityReport(paymentId: string, birthInputJson: string, aiResultJson: string | null) {
  let cache: CompatibilityReportCache | null = null;
  if (aiResultJson) {
    try {
      const parsed = JSON.parse(aiResultJson);
      if (parsed && typeof parsed === "object" && parsed.sections && parsed.scores) {
        cache = parsed as CompatibilityReportCache;
      }
    } catch {
      // 손상된 캐시는 무시하고 아래에서 원본으로부터 다시 생성한다.
    }
  }

  // 생성이 이미 완전히 끝나 있으면(6개 섹션 + 점수 모두 캐시됨) 원본 생년월일을 아예 읽지
  // 않는다. 상대방 원본이 파기된 뒤에도 이 분기로만 응답이 나가야 정상이다.
  const completedCache = cache;
  if (completedCache && isCompatibilityReportComplete(completedCache)) {
    return NextResponse.json({ status: "PAID", sections: completedCache.sections, scores: completedCache.scores });
  }

  // 여기 도달했다는 건 아직 생성이 안 끝났다는 뜻이고, 파기는 생성 완료 후에만 이뤄지므로
  // 원본 생년월일(상대방 포함)이 아직 남아있어야 정상이다.
  let selfResult, partnerResult;
  try {
    const parsedInput = JSON.parse(birthInputJson) as { self: SajuInput; partner: SajuInput | PurgedPartnerMarker };
    if (isPurgedPartner(parsedInput.partner)) {
      // 정상적으로는 절대 일어나선 안 되는 상태(파기 로직이 생성 미완료 주문은 건드리지
      // 않기 때문) — 방어적으로만 처리하고 자세한 원인은 로그로 남긴다.
      console.error("파기된 상대방 데이터로 미완성 궁합 리포트를 재생성하려 했습니다:", paymentId);
      return NextResponse.json({ status: "PAID", error: "리포트를 다시 생성할 수 없습니다. 문의해 주세요." }, { status: 500 });
    }
    selfResult = calculateSaju(parsedInput.self);
    partnerResult = calculateSaju(parsedInput.partner);
  } catch {
    console.error("궁합 주문의 생년월일 데이터가 손상되었습니다:", paymentId);
    return NextResponse.json({ status: "PAID", error: "리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
  const scores = calculateCompatibilityScores(selfResult, partnerResult);
  const cachedSections = cache?.sections ?? {};
  const missingKeys = COMPATIBILITY_SECTION_KEYS.filter((key) => !cachedSections[key]);

  const settled = await Promise.allSettled(
    missingKeys.map(
      async (key) => [key, await interpretCompatibilitySection(selfResult, partnerResult, scores, key)] as const,
    ),
  );

  const sections = { ...cachedSections };
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      sections[outcome.value[0]] = outcome.value[1];
    }
  }
  const stillMissing = COMPATIBILITY_SECTION_KEYS.filter((key) => !sections[key]);

  await prisma.order.update({
    where: { paymentId },
    data: { aiResultJson: JSON.stringify({ sections, scores }) },
  });

  if (stillMissing.length > 0) {
    const firstFailure = settled.find((o) => o.status === "rejected") as PromiseRejectedResult | undefined;
    const reason = firstFailure?.reason;
    const message =
      reason instanceof AiInterpretationError ? reason.message : "일부 항목 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json(
      { status: "PAID", sections, missingSections: stillMissing, error: message, scores },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "PAID", sections, scores });
}

async function finalizeSections(
  paymentId: string,
  cached: Record<string, string>,
  settled: PromiseSettledResult<readonly [string, string]>[],
  allKeys: readonly string[],
) {
  const sections: Record<string, string> = { ...cached };
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const [key, text] = outcome.value;
      sections[key] = text;
    }
  }

  const stillMissing = allKeys.filter((key) => !sections[key]);

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
      reason instanceof AiInterpretationError ? reason.message : "일부 항목 생성에 실패했어요. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json(
      { status: "PAID", sections, missingSections: stillMissing, error: message },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "PAID", sections });
}
