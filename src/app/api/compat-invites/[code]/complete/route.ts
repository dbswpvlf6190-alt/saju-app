import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { rateLimit } from "@/lib/security/rateLimit";
import { sendPushTo } from "@/lib/push/send";
import {
  buildInviteResult,
  daysFromNow,
  ensureBrowserKey,
  sanitizeName,
  setBrowserKeyCookie,
} from "@/lib/compatInvite/server";
import { RESULT_TTL_DAYS, type CompatInviteView } from "@/lib/compatInvite/shared";

interface CompleteBody {
  partnerName?: string;
  partnerInput?: SajuInput;
}

/** 받은 사람이 자기 정보를 넣어 궁합을 완성한다. 링크 하나에 한 명만 넣을 수 있고, 넣은 순간부터
 * 결과를 다시 볼 수 있게 7일 보관한다. 보낸 사람이 알림을 신청해뒀으면 그때 한 번 보낸다. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { ok, retryAfterSeconds } = rateLimit(req, "compat-invites:complete", { limit: 10, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  let body: CompleteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  if (!body.partnerInput) {
    return NextResponse.json({ error: "내 생년월일 정보가 필요합니다." }, { status: 400 });
  }
  try {
    calculateSaju(body.partnerInput);
  } catch (e) {
    if (e instanceof SajuInputError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("궁합 링크 완성 전 사주 검증 중 예상하지 못한 오류:", e);
    return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
  }

  try {
    const { key } = await ensureBrowserKey(req);
    const invite = await prisma.compatInvite.findUnique({ where: { code } });
    if (!invite || invite.expiresAt <= new Date()) {
      return NextResponse.json({ error: "만료된 링크예요. 보낸 분에게 새 링크를 요청해 주세요." }, { status: 410 });
    }
    if (invite.inviterKey === key) {
      return NextResponse.json({ error: "링크를 보낸 본인은 상대 정보를 넣을 수 없어요." }, { status: 400 });
    }

    // 두 사람이 동시에 넣어도 한 명만 들어가도록 "아직 아무도 안 넣음" 조건으로 원자적으로 선점한다.
    const claimed = await prisma.compatInvite.updateMany({
      where: { code, completedAt: null, expiresAt: { gt: new Date() } },
      data: {
        partnerKey: key,
        partnerName: sanitizeName(body.partnerName),
        partnerInputJson: JSON.stringify(body.partnerInput),
        completedAt: new Date(),
        expiresAt: daysFromNow(RESULT_TTL_DAYS),
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ error: "이미 다른 분이 입력한 링크예요." }, { status: 409 });
    }

    const completed = (await prisma.compatInvite.findUnique({ where: { code } }))!;

    if (completed.pushEndpoint && completed.pushP256dh && completed.pushAuth) {
      const subscription = { endpoint: completed.pushEndpoint, p256dh: completed.pushP256dh, auth: completed.pushAuth };
      const who = completed.partnerName ? `${completed.partnerName}님이` : "상대가";
      after(async () => {
        await sendPushTo(subscription, {
          title: "사주랩 궁합",
          body: `${who} 입력했어요! 두 사람 궁합 결과가 열렸어요 💌`,
          url: `/compatibility?pair=${code}`,
        });
        await prisma.compatInvite
          .update({ where: { code }, data: { pushEndpoint: null, pushP256dh: null, pushAuth: null } })
          .catch(() => {});
      });
    }

    const res = NextResponse.json({
      status: "completed",
      role: "partner",
      result: buildInviteResult({ ...completed, partnerInputJson: completed.partnerInputJson! }),
      expiresAt: completed.expiresAt.toISOString(),
    } satisfies CompatInviteView);
    await setBrowserKeyCookie(res, key);
    return res;
  } catch (e) {
    console.error("궁합 링크 완성 중 오류:", e);
    return NextResponse.json({ error: "궁합을 계산하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
