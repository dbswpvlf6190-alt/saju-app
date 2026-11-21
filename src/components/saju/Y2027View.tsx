"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { rememberSource } from "@/lib/analytics/source";
import { blogPostTag, classifyPageFrom } from "@/lib/analytics/pageFrom";

/**
 * /2027 띠·나이 페이지 방문을 기록한다(정적 페이지라 서버 기록이 없었다). page = 띠 slug·출생연도·index.
 * 블로그에서 왔으면 첫 유입 경로를 blog_<page>로 기억해, 그 뒤 결제 시도(checkout_start의 src)에서도 블로그 손님인지 보이게 한다.
 */
export function Y2027View({ page }: { page: string }) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const from = classifyPageFrom(document.referrer, params.get("from"), window.location.hostname);
    // 2026-11-21 C4: 블로그 링크의 ?post=<글이름표>(예: 1123-sonnal)로 어느 글이 손님·결제를 데려오는지 본다.
    const post = blogPostTag(params.get("post"));
    if (from === "blog") rememberSource(post ? `blog_${page}~${post}` : `blog_${page}`);
    trackEvent("y2027_view", { page, from, ...(post && { post }) });
  }, [page]);
  return null;
}
