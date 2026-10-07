import { describe, expect, it } from "vitest";
import { getReportLayout } from "../layout";
import { MANUAL_CHAPTER_KEYS } from "../manualChapters";

describe("getReportLayout", () => {
  it("캐시가 없는 새 premium_report는 플래그를 따른다", () => {
    expect(getReportLayout({}, "premium_report", true).layout).toBe("manual");
    expect(getReportLayout({}, "premium_report", false).layout).toBe("topics");
  });

  it("기존 결제 고객(옛 주제 캐시)은 플래그와 무관하게 옛 방식 그대로", () => {
    const cached = { love: "...", wealth: "..." };
    expect(getReportLayout(cached, "premium_report", true).layout).toBe("topics");
  });

  it("6장 캐시가 있으면 플래그를 꺼도 6장 방식을 유지한다(도중에 섞이지 않게)", () => {
    const l = getReportLayout({ overview: "..." }, "premium_report", false);
    expect(l.layout).toBe("manual");
    expect(l.keys).toEqual(MANUAL_CHAPTER_KEYS);
  });

  it("1가지·차액 상품은 항상 주제 방식", () => {
    expect(getReportLayout({}, "single_section", true).layout).toBe("topics");
    expect(getReportLayout({ love: "..." }, "section_upgrade", true).layout).toBe("topics");
  });
});
