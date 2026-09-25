import * as Sentry from "@sentry/nextjs";

// proxy.ts(미들웨어)처럼 Edge 런타임에서 도는 코드의 에러를 잡기 위한 별도 초기화.
// server.config와 마찬가지로 DSN이 없으면 조용히 아무것도 하지 않는다.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
