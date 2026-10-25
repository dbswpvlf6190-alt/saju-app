// 이벤트 집계에서 로봇을 빼고, 사람 방문은 어느 앱/기기에서 왔는지 큰 분류만 남긴다(개별 기기를 알아볼 수 없는 수준).
// 2026-10-18: 글이 올라가는 순간(카드뉴스 11시, Threads 21시 등) 몇 초 사이에 landing_view가 5~7회씩 몰려
// 첫 화면 방문 116회 중 대부분이 링크 미리보기 로봇이었다(실제 생일 입력은 9명).

export type UaClass = "bot" | "threads" | "instagram" | "facebook" | "kakao" | "naver" | "mobile" | "desktop" | "unknown";

// 사람이 쓰는 인앱 브라우저(KAKAOTALK, Instagram, Barcelona=Threads)와 겹치지 않게 로봇 전용 표시만 쓴다.
const BOT_RE =
  /\bbot\b|bot\/|crawler|spider|slurp|facebookexternalhit|meta-external|facebookcatalog|headlesschrome|lighthouse|pagespeed|preview|kakaotalk-scrap|yeti|daum(oa)?[\/ ]|python|curl|wget|axios|node-fetch|go-http|java\/|okhttp|vercel|uptime|monitor|scrapy|phantomjs|puppeteer|playwright/i;

export function classifyUserAgent(ua: string | null | undefined): UaClass {
  if (!ua || !ua.trim()) return "bot"; // 브라우저는 항상 UA를 보낸다
  if (BOT_RE.test(ua)) return "bot";
  if (/Barcelona/i.test(ua)) return "threads";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER\(inapp|NaverMatome|whale.*mobile/i.test(ua)) return "naver";
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) return "mobile";
  if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) return "desktop";
  return "unknown";
}
