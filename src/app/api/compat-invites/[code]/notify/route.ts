import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/security/rateLimit";
import { readBrowserKey } from "@/lib/compatInvite/server";

interface NotifyBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/** 보낸 사람의 "결과 나오면 알림 받기". 구독 정보는 이 링크에만 붙여두고 결과 알림을 한 번
 * 보낸 뒤 지운다 — 매일 운세 알림(PushSubscription)에는 등록하지 않는다. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { ok } = rateLimit(req, "compat-invites:notify", { limit: 10, windowMs: 60_000 });
  if (!ok) return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const key = await readBrowserKey(req);
  const invite = key ? await prisma.compatInvite.findUnique({ where: { code } }) : null;
  if (!invite || invite.inviterKey !== key || invite.expiresAt <= new Date()) {
    return NextResponse.json({ error: "알림을 신청할 수 없는 링크예요." }, { status: 403 });
  }
  if (invite.completedAt) {
    return NextResponse.json({ completed: true });
  }

  await prisma.compatInvite.update({
    where: { code },
    data: { pushEndpoint: endpoint, pushP256dh: keys.p256dh, pushAuth: keys.auth },
  });
  return NextResponse.json({ ok: true });
}
