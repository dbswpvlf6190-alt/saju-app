import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { readBrowserKey } from "@/lib/compatInvite/server";
import type { MyCompatInvite } from "@/lib/compatInvite/shared";

/** 이 브라우저가 보낸, 아직 만료되지 않은 궁합 링크들(최신순). 궁합 메뉴에 다시 들어왔을 때
 * 기다리는 중인지, 상대가 입력해서 결과가 열렸는지 보여주는 데 쓴다. */
export async function GET(req: NextRequest) {
  const key = await readBrowserKey(req);
  if (!key) return NextResponse.json({ invites: [] });

  try {
    const rows = await prisma.compatInvite.findMany({
      where: { inviterKey: key, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { code: true, completedAt: true, partnerName: true, expiresAt: true, pushEndpoint: true },
    });
    const invites: MyCompatInvite[] = rows.map((r) => ({
      code: r.code,
      status: r.completedAt ? "completed" : "pending",
      partnerName: r.partnerName ?? "",
      expiresAt: r.expiresAt.toISOString(),
      notifyRequested: r.pushEndpoint !== null,
    }));
    return NextResponse.json({ invites });
  } catch (e) {
    console.error("내 궁합 링크 조회 중 오류:", e);
    return NextResponse.json({ invites: [] });
  }
}
