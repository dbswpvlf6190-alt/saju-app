import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildInviteResult, readBrowserKey } from "@/lib/compatInvite/server";
import type { CompatInviteView } from "@/lib/compatInvite/shared";

/** 링크를 연 사람에 따라 보여줄 내용을 정한다. 결과는 보낸 사람·받은 사람 브라우저에만 준다 —
 * 링크가 제3자에게 전달돼도 두 사람의 궁합 결과가 새어나가지 않게 하기 위함이다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  try {
    const invite = await prisma.compatInvite.findUnique({ where: { code } });
    if (!invite || invite.expiresAt <= new Date()) {
      return NextResponse.json({ status: "expired" } satisfies CompatInviteView);
    }

    const key = await readBrowserKey(req);
    const role = key === invite.inviterKey ? "inviter" : key && key === invite.partnerKey ? "partner" : "guest";
    const inviterName = invite.inviterName ?? "";

    if (!invite.completedAt || !invite.partnerInputJson) {
      return NextResponse.json({
        status: "pending",
        role,
        inviterName,
        expiresAt: invite.expiresAt.toISOString(),
      } satisfies CompatInviteView);
    }

    if (role === "guest") {
      return NextResponse.json({ status: "used", inviterName } satisfies CompatInviteView);
    }

    return NextResponse.json({
      status: "completed",
      role,
      result: buildInviteResult({ ...invite, partnerInputJson: invite.partnerInputJson }),
      expiresAt: invite.expiresAt.toISOString(),
    } satisfies CompatInviteView);
  } catch (e) {
    console.error("궁합 링크 조회 중 오류:", e);
    return NextResponse.json({ error: "링크 정보를 불러오지 못했어요." }, { status: 500 });
  }
}
