import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { calculateFreeCompatibility } from "@/lib/saju/compatibility";
import { rateLimit } from "@/lib/security/rateLimit";

interface CompatibilityBody {
  selfInput?: SajuInput;
  partnerInput?: SajuInput;
}

/** 무료 궁합 결과는 결제 없이 즉시 제공한다(규칙 기반 계산이라 AI 비용도 없음).
 * calculateSaju가 lunar-typescript에 의존하므로 /api/saju/calculate와 동일한 이유로 서버에서만 실행한다. */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "saju:compatibility", {
    limit: 20,
    windowMs: 60_000,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CompatibilityBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body.selfInput || !body.partnerInput) {
    return NextResponse.json({ error: "본인과 상대방의 생년월일 정보가 모두 필요합니다." }, { status: 400 });
  }

  try {
    const selfResult = calculateSaju(body.selfInput);
    const partnerResult = calculateSaju(body.partnerInput);
    const free = calculateFreeCompatibility(selfResult, partnerResult);
    return NextResponse.json({ selfResult, partnerResult, free });
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("궁합 계산 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}
