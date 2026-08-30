// 주문 생성 시 발급하는 브라우저 전용 접근 토큰. GET /api/orders/[paymentId]가
// paymentId 하나만으로 누구나 유료 리포트를 조회할 수 있었던 문제를 막기 위함이다 —
// paymentId는 URL/브라우저 히스토리로 노출될 수 있지만, 이 토큰은 httpOnly 쿠키라
// 결제를 진행한 바로 그 브라우저만 서버로 자동 전송할 수 있다.
// src/lib/admin/auth.ts와 동일한 HMAC 서명 패턴을 재사용한다.

const COOKIE_PREFIX = "saju_order_";

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 쿠키 이름 자체에 paymentId를 담아, 한 브라우저가 여러 주문을 동시에 진행해도
 * 서로 덮어쓰지 않게 한다. */
export function orderAccessCookieName(paymentId: string): string {
  return `${COOKIE_PREFIX}${paymentId}`;
}

export async function signOrderAccessToken(paymentId: string): Promise<string> {
  const secret = process.env.ORDER_ACCESS_SECRET;
  if (!secret) {
    throw new Error("ORDER_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return hmacHex(secret, paymentId);
}

export async function verifyOrderAccessToken(paymentId: string, token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ORDER_ACCESS_SECRET;
  if (!secret) return false;
  const expected = await hmacHex(secret, paymentId);
  return timingSafeEqualString(token, expected);
}
