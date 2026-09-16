import { NextResponse } from "next/server";
import { calculateSaju, type PremiumSectionKey, type SajuInput } from "@/lib/saju";
import {
  calculateCompatibilityScores,
  isCompatibilityReportComplete,
  COMPATIBILITY_SECTION_KEYS,
  type CompatibilityReportCache,
} from "@/lib/saju/compatibility";
import { prisma } from "@/lib/db/prisma";
import { AiInterpretationError, interpretNewYearFortune, interpretSajuSection } from "@/lib/ai/interpretSaju";
import { interpretCompatibilitySection } from "@/lib/ai/interpretCompatibility";
import { NEW_YEAR_REPORT_TARGET_YEAR } from "@/lib/payment/config";

/**
 * 결제(또는 쿠폰) 완료된 주문의 상세 리포트를 생성·캐싱한다. GET /api/orders/[paymentId]의
 * 지연 생성(클라이언트가 화면을 열 때) 경로와, 결제/쿠폰 승인 직후 서버가 미리 채워두는
 * 웜업 경로(warmReportCache.ts)가 이 함수들을 그대로 공유한다 — 결과가 어느 경로로
 * 생성됐든 같은 캐시(Order.aiResultJson)에 쌓이므로 동작이 갈라지지 않는다.
 */

export const PREMIUM_SECTION_KEYS: PremiumSectionKey[] = ["love", "wealth", "career", "relationship", "yearly"];

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

/** premium_report 리포트 생성. sectionKeys로 범위를 좁힐 수 있다(기본은 5개 전체) —
 * ?section= 단일 요청과, 결제 완료 직후의 전체 웜업 호출이 이 함수 하나를 공유한다. */
export async function getPremiumReport(
  paymentId: string,
  birthInputJson: string,
  aiResultJson: string | null,
  sectionKeys: PremiumSectionKey[] = PREMIUM_SECTION_KEYS,
) {
  const cached = (aiResultJson ? JSON.parse(aiResultJson) : {}) as Record<string, string>;
  const missingKeys = sectionKeys.filter((key) => !cached[key]);
  if (missingKeys.length === 0) {
    const sections = Object.fromEntries(sectionKeys.map((key) => [key, cached[key]]));
    return NextResponse.json({ status: "PAID", sections });
  }

  let birthInput: SajuInput;
  try {
    birthInput = JSON.parse(birthInputJson) as SajuInput;
  } catch {
    console.error("주문의 생년월일 데이터가 손상되었습니다:", paymentId);
    return NextResponse.json({ status: "PAID", error: "리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
  const result = calculateSaju(birthInput);

  const settled = await Promise.allSettled(
    missingKeys.map(async (key) => [key, await interpretSajuSection(result, key)] as const),
  );
  const response = await finalizeSections(paymentId, cached, settled, sectionKeys);

  // finalizeSections는 캐시 전체를 기준으로 응답을 만들기 때문에, 이번 요청이 ?section=으로
  // 범위를 좁혔어도 sections에는 이전에 캐시된 다른 항목까지 섞여 나온다. 요청한 항목으로만
  // 좁혀서 돌려줘야 클라이언트가 "이번 요청분만 도착했다"고 정확히 판단할 수 있다.
  const data = await response.json();
  if (data.sections) {
    data.sections = Object.fromEntries(
      Object.entries(data.sections).filter(([key]) => sectionKeys.includes(key as PremiumSectionKey)),
    );
  }
  return NextResponse.json(data, { status: response.status });
}

/**
 * 궁합 리포트는 premium_report와 달리 점수(scores)를 매번 원본 생년월일에서 재계산해왔다.
 * 이 함수는 sections와 scores를 함께 캐싱해서, 생성이 완전히 끝난 뒤에는 원본 생년월일
 * (birthInputJson, 특히 상대방=제3자 데이터)을 전혀 다시 읽지 않아도 되게 한다 — 이게 있어야
 * 보관기간 경과 후 상대방 원본을 파기해도 재열람이 깨지지 않는다(PRIVACY_DB_API_AUDIT.md 4번).
 */
export async function getCompatibilityReport(paymentId: string, birthInputJson: string, aiResultJson: string | null) {
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

/** 결제 완료 화면 하단 업셀 상품("N년 신년운세")의 리포트. 섹션이 1개뿐이라는 점만 빼면
 * premium_report와 동일한 지연 생성·캐싱·부분 실패 재시도 패턴(finalizeSections)을 그대로 쓴다. */
export async function getNewYearReport(paymentId: string, birthInputJson: string, aiResultJson: string | null) {
  const cached = (aiResultJson ? JSON.parse(aiResultJson) : {}) as Record<string, string>;
  if (cached.newYear) {
    return NextResponse.json({ status: "PAID", sections: { newYear: cached.newYear } });
  }

  let birthInput: SajuInput;
  try {
    birthInput = JSON.parse(birthInputJson) as SajuInput;
  } catch {
    console.error("신년운세 주문의 생년월일 데이터가 손상되었습니다:", paymentId);
    return NextResponse.json({ status: "PAID", error: "리포트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
  const result = calculateSaju(birthInput);

  const settled = await Promise.allSettled([
    (async () => ["newYear", await interpretNewYearFortune(result, NEW_YEAR_REPORT_TARGET_YEAR)] as const)(),
  ]);
  return await finalizeSections(paymentId, cached, settled, ["newYear"]);
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
