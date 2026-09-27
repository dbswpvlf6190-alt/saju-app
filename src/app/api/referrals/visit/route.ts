import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";
import { REFERRER_COOKIE_NAME, birthKeyOf, ipHashOf, verifyReferrerCookie } from "@/lib/referral/server";

interface VisitBody {
  code?: string;
  birthInput?: SajuInput;
}

/** 초대 링크로 들어온 친구가 무료 결과까지 봤을 때 1명으로 기록한다. 본인 브라우저, 본인
 * 생년월일, 이미 센 친구(같은 생년월일), 같은 기기·네트워크(같은 IP)에서의 반복은 세지 않는다.
 * 세지 않은 이유는 응답에 드러내지 않는다. */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "referrals:visit", { limit: 10, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: VisitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 32 || !body.birthInput) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  try {
    calculateSaju(body.birthInput);
  } catch (e) {
    if (e instanceof SajuInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("초대 방문 기록 전 사주 검증 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }

  try {
    const referrer = await prisma.referrer.findUnique({ where: { code } });
    if (!referrer) return NextResponse.json({ counted: false });

    const ownerId = await verifyReferrerCookie(req.cookies.get(REFERRER_COOKIE_NAME)?.value);
    if (ownerId === referrer.id) return NextResponse.json({ counted: false });

    const birthKey = await birthKeyOf(body.birthInput);
    if (birthKey === referrer.birthKey) return NextResponse.json({ counted: false });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await ipHashOf(ip);
    const sameNetwork = await prisma.referralVisit.findFirst({
      where: { referrerId: referrer.id, ipHash },
      select: { id: true },
    });
    if (sameNetwork) return NextResponse.json({ counted: false });

    try {
      await prisma.referralVisit.create({ data: { referrerId: referrer.id, birthKey, ipHash } });
    } catch {
      // 같은 친구가 동시에 두 번 보낸 경우 unique 제약에 걸린다 — 이미 센 것이므로 무시한다.
      return NextResponse.json({ counted: false });
    }
    return NextResponse.json({ counted: true });
  } catch (e) {
    console.error("초대 방문 기록 중 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }
}
