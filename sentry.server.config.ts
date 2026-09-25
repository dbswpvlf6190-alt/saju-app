import * as Sentry from "@sentry/nextjs";

// NEXT_PUBLIC_SENTRY_DSN이 비어 있으면 Sentry SDK는 조용히 아무것도 전송하지 않는다
// (공식적으로 안전한 기본 동작) — 로컬 개발이나 DSN 발급 전에도 빌드/실행이 깨지지 않는다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 트래픽이 아직 크지 않으니 전수 수집 — 나중에 비용이 부담되면 낮추면 된다.
  tracesSampleRate: 1.0,
});
