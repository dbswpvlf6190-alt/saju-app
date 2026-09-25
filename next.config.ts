import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // 클릭재킹 방어 등 최소한의 보안 헤더. X-Frame-Options는 "우리 페이지를 다른 사이트가
  // iframe으로 감싸는 것"만 막는다 — PortOne 결제창(SDK가 PortOne 자체 도메인으로 여는 UI),
  // Kakao 공유 SDK 스크립트 로드는 전부 우리 응답 헤더와 무관해 영향받지 않는다.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // 조직/프로젝트(SENTRY_ORG, SENTRY_PROJECT)와 인증 토큰(SENTRY_AUTH_TOKEN)이 없으면
  // 소스맵 업로드만 건너뛰고 빌드는 그대로 진행된다 — DSN 발급 전에도 안전하다.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
