import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateSaju, getPremiumSections } from "@/lib/saju";
import { PremiumOffer, StickyPremiumBar } from "../PremiumOffer";
import { ReportSections } from "../ReportSections";
import { MANUAL_CHAPTER_META } from "@/lib/reports/manualChapters";

const result = calculateSaju({ calendarType: "solar", year: 2003, month: 1, day: 13, hour: 13, minute: 28, gender: "male" });
const premiumSections = getPremiumSections(result);
const offer = () =>
  renderToStaticMarkup(
    createElement(PremiumOffer, { name: "제필", dayMasterLabel: "병화(丙火)", premiumSections, onChoose: () => {} }),
  );

afterEach(() => vi.unstubAllEnvs());

describe("결제 전 소개(PremiumOffer)", () => {
  it("새 방식: 6장 제목·소개가 보이고, 가격과 1가지 선택은 그대로다", () => {
    const html = offer();
    for (const c of MANUAL_CHAPTER_META) {
      expect(html).toContain(c.title);
      expect(html).toContain(c.promise);
    }
    expect(html).toContain("나 사용설명서 전체 6장");
    expect(html).toContain("4,900원");
    expect(html).toContain("궁금한 1가지만 먼저");
    expect(html).toContain("1,900원");
    expect(html).toContain("4,900원으로 나 사용설명서 열기");
    expect(html).not.toContain("전체 5가지 한 번에");
  });

  it("긴급 롤백(NEXT_PUBLIC_REPORT_V2=0): 옛 5가지 소개로 돌아간다", () => {
    vi.stubEnv("NEXT_PUBLIC_REPORT_V2", "0");
    const html = offer();
    expect(html).toContain("전체 5가지 한 번에");
    expect(html).toContain("4,900원으로 5가지 전체 보기");
    expect(html).not.toContain("나 사용설명서 전체 6장");
  });

  it("캐릭터가 건 궁금증을 미리보기 카드로 1장에 이어준다", () => {
    const line = "네 불씨 옆에 붙은 기운이 활활 돕는 불씨인지 태워버리는 불씨인지 — 사용설명서 1장에서 이어서 풀어드려요.";
    const html = renderToStaticMarkup(
      createElement(PremiumOffer, { name: "", dayMasterLabel: "병화(丙火)", premiumSections, onChoose: () => {}, bridgeLine: line }),
    );
    expect(html).toContain("방금 궁금했던 그 얘기");
    expect(html).toContain(line);
    expect(html).toContain("타고난 설계와, 방금 궁금했던 일간 곁의 기운의 답까지 이해해요");
  });

  it("연결 문구가 없으면 기존 미리보기를 쓴다", () => {
    expect(offer()).toContain("내가 반복하는 선택");
    expect(offer()).not.toContain("방금 궁금했던 그 얘기");
  });

  it("하단 고정 바 문구", () => {
    expect(renderToStaticMarkup(createElement(StickyPremiumBar, { name: "제필", targetId: "x" }))).toBeDefined();
  });
});

describe("결제 후 본문(ReportSections)", () => {
  const items = MANUAL_CHAPTER_META.map((c, i) => ({ key: c.key as string, title: `${i + 1}. ${c.title}` }));

  it("도착한 장은 본문, 아직 안 온 장은 '불러오는 중', 실패한 장은 재시도 안내", () => {
    const html = renderToStaticMarkup(
      createElement(ReportSections, {
        items,
        sections: { overview: "첫 장 본문이에요.\n\n둘째 문단" },
        missing: ["patterns"],
      }),
    );
    expect(html).toContain("1. 나의 기본 설계도");
    expect(html).toContain("첫 장 본문이에요.");
    expect(html).toContain("생성에 실패했어요. 아래에서 다시 시도해 주세요.");
    expect(html).toContain("불러오는 중...");
    expect((html.match(/<h4/g) ?? []).length).toBe(6);
  });

  it("옛 주제 방식도 같은 모양으로 그려진다", () => {
    const html = renderToStaticMarkup(
      createElement(ReportSections, {
        items: [{ key: "love", title: "연애운" }],
        sections: { love: "연애 본문" },
        missing: [],
      }),
    );
    expect(html).toContain("연애운");
    expect(html).toContain("연애 본문");
  });
});
