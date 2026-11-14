import { randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/prisma";
import type { SajuInput } from "@/lib/saju";
import { CONSULT_PLANS, UNLIMITED_DAILY_CAP, isConsultProductType, type ConsultProductType } from "./plans";

type OrderLike = { paymentId: string; productType: string; birthInputJson: string; amount: number };

export interface FamilyProfile {
  key: string;
  rel: string;
  name?: string;
  input: SajuInput;
}

/** 결제 완료된 상담 상품 주문에 상담권을 발급한다(멱등: 같은 주문으로 두 번 부르면 처음 것을 돌려준다).
 * 묶음에 든 리포트는 기존 생성기를 그대로 쓰도록 0원 내부 주문(`{paymentId}-ny`, `-pr`)으로 만든다. */
export async function ensureConsultPass(order: OrderLike) {
  if (!isConsultProductType(order.productType)) return null;
  const existing = await prisma.consultPass.findUnique({ where: { orderPaymentId: order.paymentId } });
  if (existing) return existing;

  const plan = CONSULT_PLANS[order.productType as ConsultProductType];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let ownerInputJson: string | null = order.birthInputJson;
  let ownerName: string | null = null;
  let giftFrom: string | null = null;
  try {
    const parsed = JSON.parse(order.birthInputJson) as { input?: SajuInput; name?: string; giftFrom?: string } & SajuInput;
    if (parsed && typeof parsed === "object" && "input" in parsed && parsed.input) {
      ownerInputJson = JSON.stringify(parsed.input);
      ownerName = parsed.name ?? null;
      giftFrom = parsed.giftFrom ?? null;
    }
  } catch {
    /* 형식이 단순 SajuInput이면 그대로 쓴다 */
  }

  const pass = await prisma.consultPass.upsert({
    where: { orderPaymentId: order.paymentId },
    update: {},
    create: {
      token: randomBytes(18).toString("base64url"),
      orderPaymentId: order.paymentId,
      productType: order.productType,
      ownerInputJson,
      ownerName,
      giftFrom,
      familyMax: plan.familyMax,
      creditsLeft: plan.credits,
      unlimitedUntil: plan.unlimitedDays ? new Date(now + plan.unlimitedDays * day) : null,
      dailyCap: plan.unlimitedDays ? UNLIMITED_DAILY_CAP : 20,
      costCapKrw: plan.costCapKrw,
      expiresAt: new Date(now + plan.validDays * day),
    },
  });

  for (const report of plan.includes) {
    const suffix = report === "new_year_report" ? "ny" : "pr";
    const paymentId = `${order.paymentId}-${suffix}`;
    await prisma.order.upsert({
      where: { paymentId },
      update: {},
      create: {
        paymentId,
        amount: 0,
        productType: report,
        birthInputJson: ownerInputJson ?? order.birthInputJson,
        status: "PAID",
        paidAt: new Date(now),
        parentPaymentId: order.paymentId,
      },
    });
  }
  return pass;
}

export function tokenMatches(expected: string, given: string | null | undefined): boolean {
  if (!given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type QuotaState =
  | { ok: true; remainingLabel: string }
  | { ok: false; reason: "expired" | "no_credits" | "daily_cap" | "cost_cap"; message: string };

const KST_OFFSET = 9 * 60 * 60 * 1000;
function startOfKstDay(now: Date): Date {
  const kst = new Date(now.getTime() + KST_OFFSET);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - KST_OFFSET);
}

/** 질문을 하나 더 받을 수 있는지(만료·횟수·하루 상한·AI 비용 상한). */
export async function checkQuota(pass: {
  id: string;
  expiresAt: Date;
  creditsLeft: number | null;
  unlimitedUntil: Date | null;
  dailyCap: number;
  costCapKrw: number;
  costUsedKrw: number;
}, now: Date = new Date()): Promise<QuotaState> {
  if (pass.expiresAt <= now) return { ok: false, reason: "expired", message: "상담권 기간이 끝났어요." };
  if (pass.creditsLeft !== null && pass.creditsLeft <= 0) {
    return { ok: false, reason: "no_credits", message: "질문 횟수를 모두 쓰셨어요." };
  }
  const todayCount = await prisma.consultMessage.count({
    where: { passId: pass.id, role: "user", createdAt: { gte: startOfKstDay(now) } },
  });
  if (todayCount >= pass.dailyCap) {
    return { ok: false, reason: "daily_cap", message: `오늘은 ${pass.dailyCap}개까지 물어볼 수 있어요. 내일 다시 이어서 물어봐 주세요.` };
  }
  if (pass.costUsedKrw >= pass.costCapKrw) {
    return { ok: false, reason: "cost_cap", message: "오늘은 상담이 많아 잠시 쉬어 가요. 내일 다시 이어서 물어봐 주세요." };
  }
  const remainingLabel =
    pass.creditsLeft !== null ? `남은 질문 ${pass.creditsLeft}개` : `오늘 남은 질문 ${pass.dailyCap - todayCount}개`;
  return { ok: true, remainingLabel };
}
