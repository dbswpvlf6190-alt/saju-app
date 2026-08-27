import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminToken(token)) {
    return NextResponse.next();
  }

  // API 라우트는 fetch로 호출되므로 로그인 페이지로 리다이렉트하는 대신 401 JSON을 준다.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)", "/api/admin/:path*"],
};
