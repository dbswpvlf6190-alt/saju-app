export const ADMIN_COOKIE_NAME = "saju_admin_auth";
const TOKEN_PAYLOAD = "admin-authenticated";

// Next.js 미들웨어는 Edge 런타임에서 실행될 수 있어 Node의 `crypto` 모듈 대신
// Edge/Node 양쪽에서 동작하는 Web Crypto API(SubtleCrypto)를 사용한다.
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

/** ADMIN_PASSWORD를 비밀키로 한 HMAC 토큰을 만든다. 세션 저장소 없이 쿠키만으로 검증하기 위함. */
export async function signAdminToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.");
  }
  return hmacHex(secret, TOKEN_PAYLOAD);
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;

  const expected = await hmacHex(secret, TOKEN_PAYLOAD);
  return timingSafeEqualString(token, expected);
}

export function verifyAdminPassword(password: string): boolean {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  return timingSafeEqualString(password, secret);
}
