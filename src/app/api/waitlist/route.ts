import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isProductType } from "@/lib/payment/config";
import { rateLimit } from "@/lib/security/rateLimit";

/** 결제 일시 중단 기간의 "결제 오픈 알림" 신청. 이메일만 받고(동의 필수), 같은 이메일·상품은 한 번만 저장한다. */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "waitlist:create", { limit: 5, windowMs: 60_000 });
  if (!ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }
  let body: { email?: unknown; productType?: unknown; consent?: unknown; src?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "이메일 주소를 정확히 입력해 주세요." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "알림 발송을 위한 이메일 수집에 동의해 주세요." }, { status: 400 });
  }
  const productType = isProductType(body.productType) ? body.productType : "premium_report";
  const src = typeof body.src === "string" ? body.src.slice(0, 40) : null;
  try {
    await prisma.waitlistSignup.upsert({
      where: { email_productType: { email, productType } },
      create: { email, productType, src },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("결제 오픈 알림 신청 저장 실패:", e);
    return NextResponse.json({ error: "신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
