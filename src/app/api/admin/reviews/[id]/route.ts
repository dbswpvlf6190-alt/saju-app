import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";

/** 후기 노출/숨김 전환. proxy.ts(미들웨어)가 /api/admin/* 전체를 이미 인증 검증하지만,
 * matcher 설정이 바뀌어도 이 라우트 혼자서는 뚫리지 않도록 여기서도 다시 검증한다. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json({ error: "후기를 찾을 수 없습니다." }, { status: 404 });
    }
    const updated = await prisma.review.update({
      where: { id },
      data: { visible: !review.visible },
    });
    return NextResponse.json({ id: updated.id, visible: updated.visible });
  } catch (e) {
    console.error("후기 노출 상태 변경 중 오류:", e);
    return NextResponse.json({ error: "처리에 실패했습니다." }, { status: 500 });
  }
}
