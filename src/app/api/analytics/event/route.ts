import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ANALYTICS_EVENT_NAMES, sanitizeAnalyticsMeta } from "@/lib/analytics/events";
import { rateLimit } from "@/lib/security/rateLimit";
import { classifyUserAgent } from "@/lib/analytics/userAgent";

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

  // 링크 미리보기·검색 로봇은 기록하지 않는다(사람 방문 수가 부풀려지던 문제, userAgent.ts 참고).
  // 사람이면 큰 분류(threads·instagram·kakao·mobile 등)만 서버가 붙인다 — 클라이언트가 보낸 ua 값은 쓰지 않는다.
  const ua = classifyUserAgent(req.headers.get("user-agent"));
  if (ua === "bot") {
    return NextResponse.json({ ok: true });
  }
  const meta = { ...sanitizeAnalyticsMeta(body.meta), ua };

  try {
    await prisma.analyticsEvent.create({
      data: { name: body.name!, metaJson: JSON.stringify(meta) },
    });
  } catch (e) {
    console.error("이벤트 기록 중 오류:", e);
  }

  return NextResponse.json({ ok: true });
}
