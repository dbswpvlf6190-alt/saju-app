// 검색용 공개 페이지(/2027 등)에 손님이 어디서 왔는지 큰 분류로 나눈다(2026-11-13).
// 네이버 블로그 글이 실제로 손님을 데려오는지 숫자로 보려고 만들었다. 주소 전체는 남기지 않고 분류 이름만 남긴다.

export type PageFrom = "blog" | "naver_search" | "google" | "daum" | "internal" | "direct" | "other";

const PARAM_VALUES = new Set<PageFrom>(["blog", "naver_search", "google", "daum"]);

/**
 * @param referrer document.referrer (빈 문자열이면 바로 들어옴/앱이 숨김)
 * @param fromParam 주소의 ?from= 값. 블로그 글 링크에 ?from=blog를 붙이면 referrer가 비어도 블로그로 센다.
 * @param ownHost 이 사이트 호스트(사이트 안에서 이동한 경우)
 */
export function classifyPageFrom(referrer: string, fromParam: string | null, ownHost: string): PageFrom {
  if (fromParam && PARAM_VALUES.has(fromParam as PageFrom)) return fromParam as PageFrom;
  if (!referrer) return "direct";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "other";
  }
  if (host === ownHost.toLowerCase()) return "internal";
  if (host === "blog.naver.com" || host === "m.blog.naver.com" || host.endsWith(".blog.me")) return "blog";
  if (host.endsWith("search.naver.com") || host === "m.naver.com" || host === "www.naver.com") return "naver_search";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (host.endsWith("daum.net")) return "daum";
  return "other";
}
