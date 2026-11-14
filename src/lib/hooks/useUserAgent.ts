"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** 브라우저 User-Agent. 서버 렌더링 때는 빈 문자열이라 화면이 어긋나지 않고, 브라우저에서 바로 실제 값으로 바뀐다. */
export function useUserAgent(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => navigator.userAgent,
    () => "",
  );
}
