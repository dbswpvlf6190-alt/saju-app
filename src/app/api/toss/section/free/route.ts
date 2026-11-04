import { createHash } from "node:crypto";
import { NextRequest, NextResponse, after } from "next/server";
import { calculateSaju, SajuInputError, type SajuInput } from "@/lib/saju";
import { prisma } from "@/lib/db/prisma";
import { signOrderAccessToken } from "@/lib/payment/orderAccess";
import { rateLimit } from "@/lib/security/rateLimit";
import { warmReportCache } from "@/lib/reports/warm";
import { isPremiumTopicKey } from "@/lib/reports/layout";
import { corsHeaders } from "@/lib/toss/iap";

// 생성은 응답 뒤(after)에서 시작한다(유료 지급과 같은 방식).
export const maxDuration = 60;

/** 하루 무료 풀이 상한(AI 비용 보호). 넘으면 그날은 유료 구매만 안내한다. */
const DEFAULT_DAILY_CAP = 300;

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

function json(req: NextRequest, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...corsHeaders(req.headers.get("origin")), ...extra } });
}

interface FreeBody {
  /** 토스 getAnonymousKey()의 hash. 원문은 저장하지 않고 해시의 해시만 주문 번호에 쓴다. */
  anonKey?: string;
  birthInput?: SajuInput;
  sectionKey?: string;
}

/**
 * 토스 미니앱 "궁금한 것 하나 풀이"의 첫 질문 무료(해외 상위 서비스의 첫 상담 무료를 AI 풀이로 옮긴 것, v13).
 * 토스 사용자 식별키(anon key)당 한 번만 0원 주문(single_section)을 만들어 접근 토큰을 준다. 같은 키로 다시 오면
 * 처음 받은 주문을 그대로 돌려준다(다른 주제로 바꿔 받을 수 없다). 식별키는 기기에서 오므로 위조를 완전히 막지 못해
 * IP 속도 제한과 하루 상한을 함께 둔다.
 */
export async function POST(req: NextRequest) {
  const { ok, retryAfterSeconds } = rateLimit(req, "toss:free-section", { limit: 5, windowMs: 60 * 60_000 });
  if (!ok) return json(req, { error: "요청이 너무 많습니다." }, 429, { "Retry-After": String(retryAfterSeconds) });

  let body: FreeBody;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "잘못된 요청 형식입니다." }, 400);
  }

  const anonKey = typeof body.anonKey === "string" ? body.anonKey.trim() : "";
  if (!/^[A-Za-z0-9._:=+/-]{16,256}$/.test(anonKey)) return json(req, { error: "사용자 확인에 실패했습니다." }, 400);
  if (!isPremiumTopicKey(body.sectionKey)) return json(req, { error: "풀이 주제가 올바르지 않습니다." }, 400);

  let birthInputJson: string;
  try {
    if (!body.birthInput) throw new SajuInputError("생년월일 정보가 필요합니다.");
    calculateSaju(body.birthInput);
    birthInputJson = JSON.stringify(body.birthInput);
  } catch (e) {
    if (e instanceof SajuInputError) return json(req, { error: e.message }, 400);
    throw e;
  }

  const paymentId = `tfree-${createHash("sha256").update(anonKey).digest("hex").slice(0, 32)}`;

  try {
    const existing = await prisma.order.findUnique({ where: { paymentId } });
    if (existing) {
      return json(req, { paymentId, token: await signOrderAccessToken(paymentId), sectionKey: existing.sectionKey, already: true });
    }

    const cap = Number(process.env.TOSS_FREE_SECTION_DAILY_CAP) || DEFAULT_DAILY_CAP;
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const today = await prisma.order.count({ where: { paymentId: { startsWith: "tfree-" }, createdAt: { gte: since } } });
    if (today >= cap) return json(req, { error: "오늘 무료 풀이가 모두 나갔어요. 내일 다시 받아 주세요." }, 429);

    let order;
    try {
      order = await prisma.order.create({
        data: { paymentId, status: "PAID", amount: 0, productType: "single_section", sectionKey: body.sectionKey, birthInputJson, paidAt: new Date() },
      });
    } catch (e) {
      // 같은 키로 동시에 두 번 들어온 경우: 먼저 만든 주문을 쓴다.
      if ((e as { code?: string }).code === "P2002") {
        return json(req, { paymentId, token: await signOrderAccessToken(paymentId), already: true });
      }
      throw e;
    }

    after(() => warmReportCache(order));
    return json(req, { paymentId, token: await signOrderAccessToken(paymentId), sectionKey: order.sectionKey });
  } catch (e) {
    console.error("토스 무료 풀이 발급 중 오류:", e);
    return json(req, { error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }
}
