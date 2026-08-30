import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { SajuInput } from "@/lib/saju";
import { isCompatibilityReportComplete, type CompatibilityReportCache } from "@/lib/saju/compatibility";

// 유료 궁합 주문의 상대방(제3자) 원본 생년월일·출생시간·성별은 리포트 생성 목적이 끝나면
// 더 이상 필요하지 않다(PRIVACY_DB_API_AUDIT.md 4번). 다만 청약철회(7일)·리포트 재생성
// 문의 대응 여유를 두기 위해 결제일로부터 90일간은 유지한 뒤 파기한다.
const RETENTION_DAYS = 90;

interface CompatBirthInput {
  self: SajuInput;
  partner: unknown;
}

function parseCache(aiResultJson: string | null): CompatibilityReportCache | null {
  if (!aiResultJson) return null;
  try {
    const parsed = JSON.parse(aiResultJson);
    if (parsed && typeof parsed === "object" && parsed.sections && parsed.scores) {
      return parsed as CompatibilityReportCache;
    }
  } catch {
    // 손상된 캐시는 파기 대상에서 제외한다(아래에서 skip 처리).
  }
  return null;
}

/**
 * Vercel Cron이 매일 호출한다(vercel.json 참고). CRON_SECRET으로만 실행되는 내부 전용
 * 엔드포인트라 공개 API가 아니다. 결제·리포트 생성·조회 로직은 전혀 건드리지 않고,
 * "이미 생성이 완전히 끝난" 궁합 주문의 상대방 원본만 골라 파기한다.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.order.findMany({
    where: {
      productType: "compatibility_report",
      status: "PAID",
      partnerDataPurgedAt: null,
      paidAt: { lt: cutoff },
    },
    select: { id: true, paymentId: true, birthInputJson: true, aiResultJson: true },
  });

  let purged = 0;
  let skippedIncomplete = 0;
  let skippedCorrupt = 0;

  for (const order of candidates) {
    // 리포트 생성이 완전히 끝난 주문만 파기한다. 미완성 상태에서 지우면 실패한 섹션을
    // 다시 시도할 방법이 없어져 정상 리포트 조회 기능이 깨진다.
    if (!isCompatibilityReportComplete(parseCache(order.aiResultJson))) {
      skippedIncomplete++;
      continue;
    }

    let parsed: CompatBirthInput;
    try {
      parsed = JSON.parse(order.birthInputJson) as CompatBirthInput;
    } catch {
      skippedCorrupt++;
      continue;
    }

    const purgedAt = new Date();
    const newBirthInputJson = JSON.stringify({
      self: parsed.self,
      partner: { purged: true, purgedAt: purgedAt.toISOString() },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { birthInputJson: newBirthInputJson, partnerDataPurgedAt: purgedAt },
    });
    purged++;
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    purged,
    skippedIncomplete,
    skippedCorrupt,
  });
}
