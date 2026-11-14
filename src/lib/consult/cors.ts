import { NextResponse, type NextRequest } from "next/server";
import { corsHeaders } from "@/lib/toss/iap";

// 토스 미니앱(다른 출처)에서도 상담방을 쓰도록 응답에 허용 출처를 붙인다. 허용 목록은 토스 결제 API와 같다(miniAppOrigins).
export function withCors(req: NextRequest, res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(corsHeaders(req.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

export function corsPreflight(req: NextRequest): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
