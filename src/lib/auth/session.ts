// 카카오 로그인으로 발급하는 사용자 세션 쿠키. admin/auth.ts·payment/orderAccess.ts와
// 동일한 HMAC 서명 패턴을 쓴다 — 별도 세션 저장소 없이 쿠키 자체(userId + 서명)만으로
// 검증한다. 비밀번호가 없는 앱이라 세션 비밀키(SESSION_SECRET)만으로 위변조를 막는다.

export const SESSION_COOKIE_NAME = "saju_session";

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

/** 쿠키 값 형식: "<userId>.<서명>" — userId 자체는 민감정보가 아니라(카카오 로그인
 * 계정의 내부 cuid일 뿐) 평문으로 둬도 되고, 서명이 위변조를 막아준다. */
export async function signSessionCookie(userId: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  const signature = await hmacHex(secret, userId);
  return `${userId}.${signature}`;
}

/** 서명이 유효하면 userId를, 아니면 null을 반환한다. */
export async function verifySessionCookie(value: string | undefined | null): Promise<string | null> {
  if (!value) return null;
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const userId = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const expected = await hmacHex(secret, userId);
  return timingSafeEqualString(signature, expected) ? userId : null;
}

/** 요청에 실려온 세션 쿠키에서 로그인한 사용자 ID를 꺼낸다(없거나 무효하면 null). */
export async function getSessionUserId(req: { cookies: { get(name: string): { value: string } | undefined } }): Promise<string | null> {
  return verifySessionCookie(req.cookies.get(SESSION_COOKIE_NAME)?.value);
}
