import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimit";
import { corsHeaders } from "@/lib/toss/iap";

/**
 * 미니앱 결제 진단 기록(진단용). 결제 흐름의 단계별 시각·오류를 서버 로그에 남겨, 토스 화면에서만 보이는 오류의 원인을 찾는다.
 * 개인정보는 받지 않는다(단계 이름·경과 시간·오류 문구만, 길이 제한).
 */
export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));
  const { ok } = rateLimit(req, "toss:trace", { limit: 60, windowMs: 60_000 });
  if (!ok) return new NextResponse(null, { status: 204, headers });
  try {
    const raw = (await req.text()).slice(0, 1000);
    console.log("[toss-trace]", raw);
  } catch {
    /* 기록 실패는 무시 */
  }
  return new NextResponse(null, { status: 204, headers });
}
