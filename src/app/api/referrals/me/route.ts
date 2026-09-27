import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";
import { getSessionUserId } from "@/lib/auth/session";
import {
  REFERRER_COOKIE_MAX_AGE,
  REFERRER_COOKIE_NAME,
  birthKeyOf,
  createReferrer,
  getReferralStatus,
  signReferrerCookie,
  verifyReferrerCookie,
} from "@/lib/referral/server";

interface MeBody {
  birthInput?: SajuInput;
}

/** 이 브라우저(또는 로그인 계정)의 초대 진행 상황을 돌려준다. 아직 초대 코드가 없으면
 * 지금 보고 있는 사주(birthInput)로 새로 만든다 — 본인 링크로 본인이 들어와 세는 걸 막기
 * 위해 본인 생년월일 해시가 필요하다. 목표 인원을 채웠으면 이 시점에 쿠폰이 발급된다. */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "referrals:me", { limit: 30, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: MeBody;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const sessionUserId = await getSessionUserId(req);

    let referrerId = await verifyReferrerCookie(req.cookies.get(REFERRER_COOKIE_NAME)?.value);
    if (referrerId) {
      const exists = await prisma.referrer.findUnique({ where: { id: referrerId }, select: { id: true } });
      if (!exists) referrerId = null;
    }
    if (!referrerId && sessionUserId) {
      const owned = await prisma.referrer.findFirst({
        where: { userId: sessionUserId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      referrerId = owned?.id ?? null;
    }

    if (!referrerId) {
      if (!body.birthInput) {
        return NextResponse.json({ status: null });
      }
      try {
        calculateSaju(body.birthInput);
      } catch (e) {
        if (e instanceof SajuInputError) {
          return NextResponse.json({ error: e.message }, { status: 400 });
        }
        throw e;
      }
      const created = await createReferrer(await birthKeyOf(body.birthInput), sessionUserId);
      referrerId = created.id;
    } else if (sessionUserId) {
      await prisma.referrer.updateMany({
        where: { id: referrerId, userId: null },
        data: { userId: sessionUserId },
      });
    }

    const status = await getReferralStatus(referrerId);
    const response = NextResponse.json({ status });
    response.cookies.set(REFERRER_COOKIE_NAME, await signReferrerCookie(referrerId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRER_COOKIE_MAX_AGE,
    });
    return response;
  } catch (e) {
    console.error("초대 진행 상황 조회 중 오류:", e);
    return NextResponse.json({ error: "초대 정보를 불러오지 못했어요." }, { status: 500 });
  }
}
