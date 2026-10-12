import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";
import { prisma } from "@/lib/db/prisma";

/** 결제 오픈 알림 대기자. 안내 메일을 보낸 뒤에는 "보냄 처리"로 지운다(개인정보처리방침: 안내 1회 후 지체 없이 삭제).
 * proxy.ts가 /api/admin/* 를 이미 인증하지만, 여기서도 한 번 더 확인한다. */
async function authorized(req: NextRequest): Promise<boolean> {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  const rows = await prisma.waitlistSignup.findMany({ orderBy: { createdAt: "asc" }, take: 2000 });
  return NextResponse.json({ count: rows.length, emails: [...new Set(rows.map((r) => r.email))] });
}

/** 안내 메일을 보낸 대기자(전체)를 삭제한다. */
export async function DELETE(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  const result = await prisma.waitlistSignup.deleteMany({});
  return NextResponse.json({ deleted: result.count });
}
