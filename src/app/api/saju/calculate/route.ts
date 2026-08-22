import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";

interface CalculateBody {
  birthInput?: SajuInput;
}

/**
 * 사주 계산은 lunar-typescript(수백 KB 규모의 절기·음력 데이터 포함)에 의존한다.
 * 이 무거운 계산을 브라우저 번들에 포함시키지 않기 위해 서버에서만 수행하고,
 * 클라이언트는 이 라우트를 통해 결과만 받아 쓴다.
 */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "saju:calculate", {
    limit: 30,
    windowMs: 60_000,
  });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CalculateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body.birthInput) {
    return NextResponse.json({ error: "생년월일 정보가 필요합니다." }, { status: 400 });
  }

  try {
    const result = calculateSaju(body.birthInput);
    return NextResponse.json({ result });
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
