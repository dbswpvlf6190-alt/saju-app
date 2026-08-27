import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ANALYTICS_EVENT_NAMES, sanitizeAnalyticsMeta } from "@/lib/analytics/events";
import { rateLimit } from "@/lib/security/rateLimit";

interface EventBody {
  name?: string;
  meta?: unknown;
}

/** 정해진 이벤트 이름만 허용하고, meta는 서버에서도 한 번 더 개인정보 필드를 걸러낸다
 * (클라이언트 sanitize를 신뢰하지 않는다 — 요청은 누구나 직접 보낼 수 있다). 실패해도
 * UI 흐름에 영향을 주면 안 되는 로깅용 엔드포인트라 항상 200에 가까운 응답을 유지한다. */
export async function POST(req: NextRequest) {
  const { ok } = rateLimit(req, "analytics:event", { limit: 60, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: EventBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!ANALYTICS_EVENT_NAMES.includes(body.name as (typeof ANALYTICS_EVENT_NAMES)[number])) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const meta = sanitizeAnalyticsMeta(body.meta);

  try {
    await prisma.analyticsEvent.create({
      data: { name: body.name!, metaJson: meta ? JSON.stringify(meta) : null },
    });
  } catch (e) {
    console.error("이벤트 기록 중 오류:", e);
  }

  return NextResponse.json({ ok: true });
}
