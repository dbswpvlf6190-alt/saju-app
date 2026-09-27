import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";
import {
  daysFromNow,
  ensureBrowserKey,
  generateInviteCode,
  sanitizeName,
  setBrowserKeyCookie,
} from "@/lib/compatInvite/server";
import { INVITE_TTL_DAYS } from "@/lib/compatInvite/shared";

interface CreateBody {
  inviterName?: string;
  inviterInput?: SajuInput;
}

/** 보낸 사람 정보만으로 궁합 링크를 만든다. 받은 사람이 입력하기 전까지 7일 유효하다. */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "compat-invites:create", { limit: 10, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (!body.inviterInput) {
    return NextResponse.json({ error: "내 생년월일 정보가 필요합니다." }, { status: 400 });
  }
  try {
    calculateSaju(body.inviterInput);
  } catch (e) {
    if (e instanceof SajuInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("궁합 링크 생성 전 사주 검증 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }

  try {
    const { key } = await ensureBrowserKey(req);
    let invite = null;
    for (let attempt = 0; !invite; attempt++) {
      try {
        invite = await prisma.compatInvite.create({
          data: {
            code: generateInviteCode(),
            inviterKey: key,
            inviterName: sanitizeName(body.inviterName),
            inviterInputJson: JSON.stringify(body.inviterInput),
            expiresAt: daysFromNow(INVITE_TTL_DAYS),
          },
        });
      } catch (e) {
        if (attempt >= 4) throw e;
      }
    }

    const res = NextResponse.json({ code: invite.code, expiresAt: invite.expiresAt.toISOString() });
    await setBrowserKeyCookie(res, key);
    return res;
  } catch (e) {
    console.error("궁합 링크 생성 중 오류:", e);
    return NextResponse.json({ error: "링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
