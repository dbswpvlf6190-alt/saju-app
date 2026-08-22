import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

// 단일 서버 인스턴스 메모리 기반의 최소한의 요청 제한이다. 서버가 여러 인스턴스로
// 스케일되는 프로덕션(Vercel 등)에서는 인스턴스별로 카운트가 따로 집계되어 완벽하지
// 않으므로, 실제 운영 단계에서는 Upstash Redis 같은 공유 저장소 기반으로 교체해야 한다.
// 지금은 개발/저트래픽 단계에서 무료 API 호출·DB 스팸·로그인 무차별 대입을 막는 기초 방어선 역할이다.
const buckets = new Map<string, Bucket>();

export function rateLimitByIdentifier(
  identifier: string,
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds?: number } {
  const bucketKey = `${key}:${identifier}`;
  const now = Date.now();

  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function rateLimit(
  req: NextRequest,
  key: string,
  options: { limit: number; windowMs: number },
): { ok: boolean; retryAfterSeconds?: number } {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return rateLimitByIdentifier(ip, key, options);
}
