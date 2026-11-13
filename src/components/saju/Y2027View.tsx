"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { rememberSource } from "@/lib/analytics/source";
import { classifyPageFrom } from "@/lib/analytics/pageFrom";

/**
 * /2027 띠·나이 페이지 방문을 기록한다(정적 페이지라 서버 기록이 없었다). page = 띠 slug·출생연도·index.
 * 블로그에서 왔으면 첫 유입 경로를 blog_<page>로 기억해, 그 뒤 결제 시도(checkout_start의 src)에서도 블로그 손님인지 보이게 한다.
 */
export function Y2027View({ page }: { page: string }) {
  useEffect(() => {
    const from = classifyPageFrom(
      document.referrer,
      new URLSearchParams(window.location.search).get("from"),
      window.location.hostname,
    );
    if (from === "blog") rememberSource(`blog_${page}`);
    trackEvent("y2027_view", { page, from });
  }, [page]);
  return null;
}
