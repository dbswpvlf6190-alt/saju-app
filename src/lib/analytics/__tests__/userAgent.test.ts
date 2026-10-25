import { describe, expect, it } from "vitest";
import { classifyUserAgent } from "../userAgent";

describe("classifyUserAgent", () => {
  it("링크 미리보기·검색 로봇은 bot", () => {
    for (const ua of [
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
      "kakaotalk-scrap/1.0; +https://devtalk.kakao.com/",
      "Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)",
      "python-requests/2.31.0",
      "",
      null,
    ]) {
      expect(classifyUserAgent(ua)).toBe("bot");
    }
  });

  it("사람이 쓰는 인앱 브라우저는 bot이 아니다", () => {
    expect(classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 289.0.0.77.109")).toBe("threads");
    expect(classifyUserAgent("Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 Instagram 309.0.0.40.113 Android")).toBe("instagram");
    expect(classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5")).toBe("kakao");
    expect(classifyUserAgent("Mozilla/5.0 (Linux; Android 13; CUBOT X70) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")).toBe("mobile");
    expect(classifyUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")).toBe("desktop");
  });
});
