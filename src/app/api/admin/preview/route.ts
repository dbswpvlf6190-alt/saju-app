import { NextRequest, NextResponse } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import type { PremiumSectionKey } from "@/lib/saju/content";
import { interpretNewYearFortune, interpretSajuSection } from "@/lib/ai/interpretSaju";
import { NEW_YEAR_REPORT_TARGET_YEAR } from "@/lib/payment/config";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";

type PreviewSection = PremiumSectionKey | "newYear";

function isPreviewSection(value: unknown): value is PreviewSection {
  return (
    value === "love" ||
    value === "wealth" ||
    value === "career" ||
    value === "relationship" ||
    value === "yearly" ||
    value === "newYear"
  );
}

/** 결제 없이 AI 해석 콘텐츠 품질을 확인하기 위한 관리자 전용 미리보기. Order를 만들지도,
 * DB에 아무것도 남기지도 않는다 — 순수하게 그 자리에서 생성해서 보여주기만 한다. */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  let body: { birthInput?: SajuInput; section?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body.birthInput) {
    return NextResponse.json({ error: "생년월일 정보가 필요합니다." }, { status: 400 });
  }
  if (!isPreviewSection(body.section)) {
    return NextResponse.json({ error: "잘못된 항목입니다." }, { status: 400 });
  }

  let result;
  try {
    result = calculateSaju(body.birthInput);
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }

  try {
    const text =
      body.section === "newYear"
        ? await interpretNewYearFortune(result, NEW_YEAR_REPORT_TARGET_YEAR)
        : await interpretSajuSection(result, body.section);
    return NextResponse.json({ text });
  } catch (e) {
    console.error("관리자 미리보기 생성 중 오류:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
