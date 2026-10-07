"use client";

import { useEffect, useRef, useState } from "react";
import type { PremiumSection, PremiumSectionKey } from "@/lib/saju";
import { PREMIUM_REPORT_PRICE_KRW, SINGLE_SECTION_PRICE_KRW } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";
import { MANUAL_CHAPTER_META, reportV2Enabled } from "@/lib/reports/manualChapters";

export type OfferChoice = { kind: "full" } | { kind: "single"; section: PremiumSectionKey };

/**
 * 유료 안내(잠금 미리보기 + 가격 + 상품 선택). 30일 퍼널에서 "안내 노출 145 → 결제 버튼 10(7%)"으로
 * 여기가 가장 큰 이탈 지점이라 다음을 바꿨다(2026-09-27 시제품):
 *  1) 맨 위 항목(사용자가 가장 궁금해하는 쪽으로 정렬됨) 한 문단을 흐림 없이 먼저 보여준다 — 뭘 사는지 와닿게.
 *  2) "전체 5가지 4,900원(항목당 980원)"과 "궁금한 1가지만 1,900원" 두 선택지 — 첫 결제 문턱을 낮춘다.
 *  3) 가격 상자가 실제로 화면에 들어왔을 때만 premium_offer_seen을 기록한다(기존 premium_preview_view는
 *     결과 화면이 열리자마자 찍혀서 스크롤을 안 내린 사람까지 포함됐음).
 */
export function PremiumOffer({
  name,
  dayMasterLabel,
  premiumSections,
  onChoose,
  initialMode = "full",
}: {
  name: string;
  dayMasterLabel: string;
  premiumSections: PremiumSection[];
  onChoose: (choice: OfferChoice) => void;
  initialMode?: "full" | "single";
}) {
  const [first, ...rest] = premiumSections;
  // 6장 "나 사용설명서"(2026-10-07): 가격(4,900원)·상품명은 그대로, 본문 구성과 소개 문구만 바뀐다.
  const manual = reportV2Enabled();
  const [mode, setMode] = useState<"full" | "single">(initialMode);
  const [single, setSingle] = useState<PremiumSectionKey>(first.key);
  const offerRef = useRef<HTMLDivElement>(null);
  const perSection = Math.round(PREMIUM_REPORT_PRICE_KRW / premiumSections.length / 10) * 10;
  const singleTitle = premiumSections.find((s) => s.key === single)?.title ?? "";

  useEffect(() => {
    const el = offerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackEvent("premium_offer_seen", { productType: "premium_report" });
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 px-1 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">{dayMasterLabel}</span>
        <h3 className="font-serif text-lg leading-snug text-foreground">
          {manual ? `${name ? `${name}님` : "나"}의 사용설명서 6장` : `${name ? `${name}님` : "내"} 사주로 쓴 상세 풀이 5가지`}
        </h3>
        <p className="text-xs text-foreground-muted">
          {manual
            ? "왜 같은 선택을 반복하는지, 상대에게 쓸 말, 지금 시기까지 — 태어난 사주 전체를 근거로 풀어요."
            : "오늘 운세가 아니라, 태어난 사주 전체를 근거로 풀어요."}
        </p>
      </div>

      {/* 1) 첫 항목은 흐림 없이 한 문단 공개 */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-gold/40 bg-background-card/80 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium text-accent-gold-soft">{manual ? "내가 반복하는 선택" : first.title}</span>
          <span className="rounded-full bg-accent-gold/15 px-2 py-0.5 text-[11px] text-accent-gold-soft">미리 보기</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{first.previewSnippet}</p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background-card to-transparent" />
        <p className="relative mt-3 text-center text-xs text-foreground-muted">
          {manual ? "🔒 이어서 6장 · 6,000자 이상 · 결제 후 바로 열려요" : "🔒 이어서 1,200자 이상 · 결제 후 바로 열려요"}
        </p>
      </div>

      {/* 나머지: 새 방식은 6장 제목 + 읽고 나면 얻는 것, 옛 방식은 제목 + 흐린 한 줄 */}
      <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-background-card/70">
        {manual &&
          MANUAL_CHAPTER_META.map((chapter, i) => (
            <div key={chapter.key} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 shrink-0 text-center text-xs text-accent-gold-soft">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-foreground">{chapter.title}</span>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{chapter.promise}</p>
              </div>
              <span className="shrink-0 text-xs text-accent-gold-soft">🔒</span>
            </div>
          ))}
        {!manual && rest.map((section) => (
          <div key={section.key} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground">{section.title}</span>
              <p className="mt-0.5 truncate select-none text-xs leading-relaxed text-foreground-muted/40 blur-[2.5px]">
                {section.previewSnippet}
              </p>
            </div>
            <span className="shrink-0 text-xs text-accent-gold-soft">🔒</span>
          </div>
        ))}
      </div>

      {/* 2) 상품 선택 */}
      <div ref={offerRef} className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`relative flex items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
            mode === "full" ? "border-accent-gold bg-accent-gold/10" : "border-border-subtle bg-background-card/60"
          }`}
        >
          <span className="absolute -top-2.5 left-4 rounded-full bg-accent-gold px-2 py-0.5 text-[11px] font-semibold text-[#1a1430]">
            추천
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{manual ? "나 사용설명서 전체 6장" : "전체 5가지 한 번에"}</span>
            <span className="text-xs text-foreground-muted">
              {manual ? "바로 쓸 말·시기별 할 일까지 · 6,000자 이상" : "연애·재물·직업·인간관계·올해 흐름 · 6,000자 이상"}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end whitespace-nowrap">
            <span className="text-lg font-semibold text-accent-gold-soft">{PREMIUM_REPORT_PRICE_KRW.toLocaleString()}원</span>
            <span className="text-[11px] text-foreground-muted">
              {manual ? "1회 결제 · 바로 열람" : `항목당 ${perSection.toLocaleString()}원`}
            </span>
          </span>
        </button>

        <div
          className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${
            mode === "single" ? "border-accent-gold bg-accent-gold/10" : "border-border-subtle bg-background-card/60"
          }`}
        >
          <button type="button" onClick={() => setMode("single")} className="flex items-center justify-between text-left">
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">궁금한 1가지만 먼저</span>
              <span className="text-xs text-foreground-muted">나중에 나머지를 보고 싶으면 차액만 내면 돼요</span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-lg font-semibold text-foreground">{SINGLE_SECTION_PRICE_KRW.toLocaleString()}원</span>
          </button>
          {mode === "single" && (
            <div className="flex flex-wrap gap-1.5">
              {premiumSections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSingle(s.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    single === s.key
                      ? "border-accent-gold bg-accent-gold text-[#1a1430]"
                      : "border-border-subtle text-foreground-muted"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const choice: OfferChoice = mode === "full" ? { kind: "full" } : { kind: "single", section: single };
          trackEvent("premium_cta_click", {
            productType: mode === "full" ? "premium_report" : "single_section",
            ...(mode === "single" ? { section: single } : {}),
          });
          onChoose(choice);
        }}
        className="min-h-14 rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
      >
        {mode === "full"
          ? manual
            ? `${PREMIUM_REPORT_PRICE_KRW.toLocaleString()}원으로 나 사용설명서 열기`
            : `${PREMIUM_REPORT_PRICE_KRW.toLocaleString()}원으로 5가지 전체 보기`
          : `${SINGLE_SECTION_PRICE_KRW.toLocaleString()}원으로 ${singleTitle} 보기`}
      </button>
    </div>
  );
}

/** 무료 결과를 읽는 동안 화면 아래에 붙어 있는 작은 결제 안내 바. 유료 안내 영역이 화면에 보이면 숨는다. */
export function StickyPremiumBar({ name, targetId }: { name: string; targetId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = document.getElementById(targetId);
    const onScroll = () => {
      if (!target) return;
      // 무료 결과를 어느 정도 읽었고(500px+), 아직 유료 안내 영역에 도달하기 전일 때만 보인다.
      // 유료 안내에 도착했거나 지나쳐 내려갔으면 숨긴다(가격 상자와 겹치지 않게).
      const rect = target.getBoundingClientRect();
      setShow(window.scrollY > 500 && rect.top > window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [targetId]);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <a
        href={`#${targetId}`}
        onClick={() => trackEvent("premium_sticky_click", { productType: "premium_report" })}
        className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-accent-gold/50 bg-[#1a1430]/95 px-4 py-3 shadow-lg backdrop-blur"
      >
        <span className="text-sm text-foreground">
          🔒 {name ? `${name}님` : "내"} {reportV2Enabled() ? "나 사용설명서" : "상세 풀이 5가지"}
          <span className="ml-1 text-xs text-foreground-muted">1,900원부터</span>
        </span>
        <span className="shrink-0 rounded-lg bg-accent-gold px-3 py-1.5 text-xs font-semibold text-[#1a1430]">보기</span>
      </a>
    </div>
  );
}
