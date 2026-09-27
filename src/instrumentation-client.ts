import * as Sentry from "@sentry/nextjs";

// 브라우저에서 발생하는 에러(리액트 렌더 에러, 미처리 예외 등)를 잡는다.
// DSN이 없으면 SDK가 조용히 아무 것도 전송하지 않는다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
