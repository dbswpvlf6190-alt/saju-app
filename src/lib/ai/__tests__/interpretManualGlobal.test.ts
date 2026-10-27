import { describe, expect, it } from "vitest";
import { cleanGlobalText, globalManualProblems, measureLength, minLengthFor } from "../interpretManualGlobal";
import { localeForCurrency } from "@/lib/payment/money";

describe("해외판 사용설명서 글 검사", () => {
  it("영어는 단어 수, 일본어는 공백 제외 글자 수로 분량을 잰다", () => {
    expect(measureLength("one two  three\nfour", "en")).toBe(4);
    expect(measureLength("あ い\nう", "ja")).toBe(3);
  });

  it("한글이 섞이면 실패 사유로 잡는다", () => {
    const words = Array.from({ length: 600 }, () => "word").join(" ");
    expect(globalManualProblems(`${words} 일간`, "en", "overview")).toContain("contains Hangul (Korean letters)");
    expect(globalManualProblems(words, "en", "overview")).toEqual([]);
  });

  it("금지어(단정·질병)와 분량 미달을 잡는다", () => {
    const ok = Array.from({ length: 600 }, () => "word").join(" ");
    expect(globalManualProblems(`${ok} guaranteed`, "en", "overview").some((p) => p.startsWith("banned words"))).toBe(true);
    expect(globalManualProblems(`${ok} Illness`, "en", "overview").some((p) => p.startsWith("banned words"))).toBe(true);
    expect(globalManualProblems("short text", "en", "overview").some((p) => p.startsWith("too short"))).toBe(true);
    const ja = "あ".repeat(1200);
    expect(globalManualProblems(ja, "ja", "overview")).toEqual([]);
    expect(globalManualProblems(`${ja}必ず`, "ja", "overview").some((p) => p.startsWith("banned words"))).toBe(true);
  });

  it("장별 최소 분량이 모든 장에 정해져 있다", () => {
    for (const locale of ["en", "ja"] as const) {
      for (const key of ["overview", "patterns", "people", "workmoney", "timing", "actions"] as const) {
        expect(minLengthFor(locale, key)).toBeGreaterThan(100);
      }
    }
  });

  it("모델이 붙인 제목 줄과 마크다운 기호를 걷어낸다", () => {
    expect(cleanGlobalText("## Your core blueprint\nBody text.", "Your core blueprint")).toBe("Body text.");
    expect(cleanGlobalText("**Bold** and\n- item", "x")).toBe("Bold and\nitem");
  });
});

describe("주문 통화 → 리포트 언어", () => {
  it("USD는 영어, JPY는 일본어, 원화·없음은 한국어(null)", () => {
    expect(localeForCurrency("USD")).toBe("en");
    expect(localeForCurrency("JPY")).toBe("ja");
    expect(localeForCurrency("KRW")).toBeNull();
    expect(localeForCurrency(undefined)).toBeNull();
  });
});
