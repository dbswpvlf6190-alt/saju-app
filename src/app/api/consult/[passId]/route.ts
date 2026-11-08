import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { calculateSaju, type SajuInput } from "@/lib/saju";
import { generateFreeContent } from "@/lib/saju/content";
import { CONSULT_PLANS, isConsultProductType } from "@/lib/consult/plans";
import { checkQuota, tokenMatches, type FamilyProfile } from "@/lib/consult/pass";
import { rateLimit } from "@/lib/security/rateLimit";
import { AI_NOTICE } from "@/lib/consult/safety";

/** 상담권 화면 첫 로딩: 주인·가족 요약, 남은 횟수, 대화 기록, 함께 열린 리포트. 링크 토큰(k)으로만 연다. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ passId: string }> }) {
  const { ok } = rateLimit(req, "consult:get", { limit: 60, windowMs: 60_000 });
  if (!ok) return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });

  const { passId } = await params;
  const k = req.nextUrl.searchParams.get("k");
  const pass = await prisma.consultPass.findUnique({ where: { id: passId } });
  if (!pass || !tokenMatches(pass.token, k)) {
    return NextResponse.json({ error: "상담권을 찾을 수 없어요. 받은 링크를 다시 확인해 주세요." }, { status: 404 });
  }

  // 사용 시작 기록(환불 기준). 선물을 산 사람이 결제 직후 보는 화면(?new=1)은 받는 분이 연 것으로 치지 않는다.
  const buyerPreview = Boolean(pass.giftFrom) && req.nextUrl.searchParams.get("new") === "1";
  if (!pass.openedAt && !buyerPreview) {
    await prisma.consultPass.update({ where: { id: pass.id }, data: { openedAt: new Date() } });
  }

  const owner = pass.ownerInputJson ? summarize(JSON.parse(pass.ownerInputJson) as SajuInput) : null;
  const family = (JSON.parse(pass.familyJson) as FamilyProfile[]).map((f) => ({
    key: f.key,
    rel: f.rel,
    name: f.name ?? null,
    summary: summarize(f.input),
  }));
  const messages = await prisma.consultMessage.findMany({
    where: { passId: pass.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, role: true, content: true, profileKey: true, createdAt: true },
  });
  const quota = await checkQuota(pass);
  const plan = isConsultProductType(pass.productType) ? CONSULT_PLANS[pass.productType] : null;

  return NextResponse.json({
    id: pass.id,
    productName: plan?.name ?? "AI 사주 상담",
    ownerName: pass.ownerName,
    giftFrom: pass.giftFrom,
    owner,
    family,
    familyMax: pass.familyMax,
    creditsLeft: pass.creditsLeft,
    unlimitedUntil: pass.unlimitedUntil,
    expiresAt: pass.expiresAt,
    quota,
    orderPaymentId: pass.orderPaymentId,
    reports: (plan?.includes ?? []).map((r) => ({
      kind: r === "new_year_report" ? "ny" : "pr",
      title: r === "new_year_report" ? "2027 신년운세" : "평생 사용설명서 6장",
    })),
    messages,
    notice: AI_NOTICE,
  });
}

function summarize(input: SajuInput) {
  const result = calculateSaju(input);
  const free = generateFreeContent(result);
  return {
    label: free.dayMasterLabel,
    metaphor: free.dayMasterMetaphor,
    birth: `${input.year}.${input.month}.${input.day}${input.calendarType === "lunar" ? " (음력)" : ""}`,
  };
}
