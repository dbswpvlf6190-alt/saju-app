import { NextRequest, NextResponse } from "next/server";
import { buildKakaoAuthorizeUrl, KakaoLoginError } from "@/lib/kakao/login";

/** 로그인 시작점. ?state=<paymentId>로 들어오면 콜백에서 그 주문을 계정에 연결한다
 * (결제 완료 화면의 "로그인하고 저장하기" 버튼이 이 방식으로 호출한다). */
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state") ?? undefined;
  const redirectUri = `${req.nextUrl.origin}/api/auth/kakao/callback`;

  try {
    const authorizeUrl = buildKakaoAuthorizeUrl(redirectUri, state);
    return NextResponse.redirect(authorizeUrl);
  } catch (e) {
    if (e instanceof KakaoLoginError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    throw e;
  }
}
