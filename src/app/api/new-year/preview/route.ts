import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";
import { buildNewYearTeaser } from "@/lib/newYear/preview";
import { NEW_YEAR_REPORT_TARGET_YEAR } from "@/lib/payment/config";

/**
 * /new-year 결제 전 미리보기. 사주 계산(서버 전용, lunar-typescript)과 신년 미리보기 계산을 한 번에 돌려준다.
 * 미리보기에는 결제 전에 공개하는 값만 들어 있다(preview.ts).
 */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "newyear:preview", { limit: 30, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: { birthInput?: SajuInput };
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
    return NextResponse.json({ result, teaser: buildNewYearTeaser(result, NEW_YEAR_REPORT_TARGET_YEAR) });
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("신년운세 미리보기 계산 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}
