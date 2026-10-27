import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlobalPremiumUnlock } from "../GlobalPremiumUnlock";
import { GLOBAL_PAY_COPY } from "@/lib/global/payCopy";
import { MANUAL_CHAPTER_KEYS } from "@/lib/reports/manualChapters";
import type { SajuResult } from "@/lib/saju/types";

// 구매 전 화면은 result를 쓰지 않는다(결제 시작 때만 생년월일을 서버에 보낸다).
const render = (locale: "en" | "ja") => renderToStaticMarkup(createElement(GlobalPremiumUnlock, { locale, result: {} as SajuResult }));
const HANGUL = /[가-힣]/;

describe("해외판 유료 리포트 구매 화면", () => {
  it("영어: 달러 가격과 6장 소개가 보이고 한국어 문구가 없다", () => {
    const html = render("en");
    expect(html).toContain("$3.99");
    expect(html).toContain("Continue to payment");
    for (const key of MANUAL_CHAPTER_KEYS) expect(html).toContain(GLOBAL_PAY_COPY.en.chapters[key].title);
    // 환불정책 링크 문구의 "(Korean)"은 영어 글자라 한글 검사에 걸리지 않아야 한다.
    expect(html).not.toMatch(HANGUL);
  });

  it("일본어: 엔화 가격과 6장 소개가 보이고 한국어 문구가 없다", () => {
    const html = render("ja");
    expect(html).toContain("¥580");
    expect(html).toContain("お支払いへ進む");
    for (const key of MANUAL_CHAPTER_KEYS) expect(html).toContain(GLOBAL_PAY_COPY.ja.chapters[key].title);
    expect(html).not.toMatch(HANGUL);
  });

  it("동의 체크 전에는 PayPal 버튼 칸이 없다", () => {
    expect(render("en")).not.toContain("portone-ui-container");
  });

  it("영어·일본어 문구 항목이 모두 채워져 있다", () => {
    for (const locale of ["en", "ja"] as const) {
      const copy = GLOBAL_PAY_COPY[locale];
      for (const [k, v] of Object.entries(copy)) {
        if (k === "chapters") continue;
        expect(String(v).length, `${locale}.${k}`).toBeGreaterThan(3);
      }
    }
  });
});
