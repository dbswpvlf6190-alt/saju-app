import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { issueCoupon } from "@/lib/payment/coupon";
import { hmacHex, timingSafeEqualString } from "@/lib/security/hmac";
import type { SajuInput } from "@/lib/saju";
import { REFERRAL_TARGET, type ReferralStatus } from "./shared";

export const REFERRER_COOKIE_NAME = "saju_referrer";
export const REFERRER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

// 새 환경변수를 늘리지 않고, 이미 운영에 필수로 설정된 ORDER_ACCESS_SECRET을 쓰되 용도별
// 접두사를 붙여 서명·해시가 주문 접근 토큰과 절대 겹치지 않게 분리한다.
function getSecret(): string {
  const secret = process.env.ORDER_ACCESS_SECRET;
  if (!secret) {
    throw new Error("ORDER_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
}

/** 생년월일은 경우의 수가 적어 단순 해시는 전수 대입으로 되돌릴 수 있으므로, 반드시
 * 서버 비밀키로 HMAC해서 저장한다. */
export async function birthKeyOf(input: SajuInput): Promise<string> {
  const normalized = [
    input.calendarType,
    input.isLeapMonth ? 1 : 0,
    input.year,
    input.month,
    input.day,
    input.hour ?? "x",
    input.hour === undefined ? "x" : (input.minute ?? 0),
    input.gender,
  ].join("|");
  return hmacHex(getSecret(), `referral-birth:${normalized}`);
}

export async function ipHashOf(ip: string): Promise<string> {
  return hmacHex(getSecret(), `referral-ip:${ip}`);
}

export async function signReferrerCookie(referrerId: string): Promise<string> {
  const signature = await hmacHex(getSecret(), `referral-owner:${referrerId}`);
  return `${referrerId}.${signature}`;
}

export async function verifyReferrerCookie(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const referrerId = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  if (!process.env.ORDER_ACCESS_SECRET) return null;
  const expected = await hmacHex(getSecret(), `referral-owner:${referrerId}`);
  return timingSafeEqualString(signature, expected) ? referrerId : null;
}

function generateReferralCode(): string {
  return randomBytes(5).toString("base64url");
}

export async function createReferrer(birthKey: string, userId: string | null) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.referrer.create({
        data: { code: generateReferralCode(), birthKey, userId },
      });
    } catch (e) {
      if (attempt >= 4) throw e;
    }
  }
}

/** 진행 상황을 계산하고, 목표 인원을 채웠는데 아직 쿠폰이 없으면 이 시점에 발급한다.
 * 친구가 들어온 순간이 아니라 본인이 다시 확인하는 순간에 발급해서, 쿠폰 유효기간(14일)이
 * 본인이 코드를 처음 본 날부터 흐르게 한다. */
export async function getReferralStatus(referrerId: string): Promise<ReferralStatus | null> {
  let referrer = await prisma.referrer.findUnique({ where: { id: referrerId } });
  if (!referrer) return null;

  const count = await prisma.referralVisit.count({ where: { referrerId } });

  if (count >= REFERRAL_TARGET && !referrer.couponCode) {
    const issued = await issueCoupon();
    // 두 탭에서 동시에 열어도 쿠폰이 한 번만 연결되도록 "아직 쿠폰 없음" 조건을 건다.
    const linked = await prisma.referrer.updateMany({
      where: { id: referrerId, couponCode: null },
      data: { couponCode: issued.code },
    });
    if (linked.count === 0) {
      await prisma.coupon.delete({ where: { code: issued.code } });
    }
    referrer = (await prisma.referrer.findUnique({ where: { id: referrerId } }))!;
  }

  let coupon: ReferralStatus["coupon"] = null;
  if (referrer.couponCode) {
    const row = await prisma.coupon.findUnique({ where: { code: referrer.couponCode } });
    if (row) {
      coupon = { code: row.code, expiresAt: row.expiresAt.toISOString(), used: row.usedAt !== null };
    }
  }

  return { code: referrer.code, count: Math.min(count, REFERRAL_TARGET), target: REFERRAL_TARGET, coupon };
}
