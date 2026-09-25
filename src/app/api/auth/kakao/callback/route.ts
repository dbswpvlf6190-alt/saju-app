import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveKakaoLogin, KakaoLoginError } from "@/lib/kakao/login";
import { SESSION_COOKIE_NAME, signSessionCookie } from "@/lib/auth/session";
import { orderAccessCookieName, verifyOrderAccessToken } from "@/lib/payment/orderAccess";

/**
 * 카카오 인가 코드를 받아 로그인을 완료한다. state에 paymentId가 실려 있으면(결제 완료
 * 화면의 "로그인하고 저장하기" 버튼에서 온 경우), 그 주문을 이번에 로그인한 계정에
 * 연결한다 — 단, state만으로는 아무나 남의 주문을 자기 계정에 연결할 수 있으므로
 * 반드시 그 주문의 orderAccess 쿠키(그 주문을 생성한 바로 그 브라우저에만 있음)까지
 * 함께 확인한다.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const redirectUri = `${req.nextUrl.origin}/api/auth/kakao/callback`;

  if (!code) {
    return NextResponse.json({ error: "카카오 로그인이 취소되었거나 코드가 없습니다." }, { status: 400 });
  }

  try {
    const profile = await resolveKakaoLogin(code, redirectUri);
    const user = await prisma.user.upsert({
      where: { kakaoId: profile.kakaoId },
      create: { kakaoId: profile.kakaoId, nickname: profile.nickname },
      update: { nickname: profile.nickname },
    });

    if (state) {
      const accessToken = req.cookies.get(orderAccessCookieName(state))?.value;
      if (await verifyOrderAccessToken(state, accessToken)) {
        await prisma.order.updateMany({ where: { paymentId: state }, data: { userId: user.id } });
      }
    }

    const response = NextResponse.redirect(new URL("/my", req.nextUrl.origin));
    response.cookies.set(SESSION_COOKIE_NAME, await signSessionCookie(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180, // 로그인 세션은 6개월 유지 — 재접근이 목적이라 짧게 끊길 필요가 없다.
    });
    return response;
  } catch (e) {
    if (e instanceof KakaoLoginError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    console.error("카카오 로그인 콜백 처리 중 오류:", e);
    return NextResponse.json({ error: "로그인 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
