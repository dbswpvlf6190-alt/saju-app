"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SajuResult } from "@/lib/saju";
// 배럴(@/lib/saju)을 거치면 번들러가 engine.ts(lunar-typescript, 수백 KB)까지 딸려오는 걸
// 완전히 트리쉐이킹하지 못해서, 클라이언트 컴포넌트에서는 실제로 쓰는 서브모듈을 직접 가져온다.
import { generateFreeContent, getPremiumSections } from "@/lib/saju/content";
import { getDailyFortuneDetail } from "@/lib/saju/dailyFortune";
import { PillarCard } from "./PillarCard";
import { WuxingBar } from "./WuxingBar";
import { PremiumUnlock } from "./PremiumUnlock";
import { AdSlot } from "./AdSlot";
import { ShareButton } from "./ShareButton";
import { DailyFortuneCard } from "./DailyFortuneCard";
import { ReviewList, type ReviewItem } from "./ReviewList";
import { trackEvent } from "@/lib/analytics/track";

// 무료로 공개하는 3개 카테고리 + 노출 순서. relationship/yearly는 유료 상세 분석에서만
// 제공한다(기존 상품 구성 그대로 유지 — 여기서 새 카테고리를 만들지 않는다).
// PremiumUnlock의 잠긴 미리보기 목록(연애·재물·직업·인간관계·올해의 흐름 순)과 앞 3개
// 순서를 맞춰서, 방금 본 무료 요약이 바로 아래 유료 미리보기로 자연스럽게 이어지게 한다.
const FREE_PREVIEW_ORDER = ["love", "wealth", "career"] as const;
const FREE_PREVIEW_EMOJI: Record<(typeof FREE_PREVIEW_ORDER)[number], string> = {
  wealth: "💰",
  love: "❤️",
  career: "💼",
};

export function ResultView({
  name,
  result,
  onRestart,
  resumePaymentId,
  reviews,
}: {
  name: string;
  result: SajuResult;
  onRestart: () => void;
  resumePaymentId: string | null;
  reviews: ReviewItem[];
}) {
  const [isPaid, setIsPaid] = useState(false);
  const free = generateFreeContent(result);
  const premiumSections = getPremiumSections(result);
  const daily = getDailyFortuneDetail(result);

  const freePreviewSections = FREE_PREVIEW_ORDER.map(
    (key) => premiumSections.find((s) => s.key === key)!,
  );

  useEffect(() => {
    trackEvent("free_result_view", { productType: "premium_report" });
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-8 pb-16">
      {/* ① 나의 사주 핵심 결과 */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-sm text-foreground-muted">
          {name ? `${name}님의 사주` : "나의 사주"}
        </span>
        <h2 className="font-serif text-2xl text-accent-gold-soft">{free.dayMasterLabel}</h2>
        <p className="text-sm text-foreground-muted">{free.dayMasterMetaphor}</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-foreground">{free.balanceNote}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <PillarCard label="년주" pillar={result.yearPillar} />
        <PillarCard label="월주" pillar={result.monthPillar} />
        <PillarCard label="일주" pillar={result.dayPillar} />
        <PillarCard label="시주" pillar={result.timePillar} />
      </div>

      {/* ② 기본 성향 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">타고난 성격</h3>
        <p className="leading-relaxed text-foreground">{free.personality}</p>
      </div>

      {/* ③ 오행 분석 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">오행 분포</h3>
        <WuxingBar percent={result.wuxingPercent} />
      </div>

      {/* ④⑤⑥ 무료 재물운·연애운·직업운 — 방향만 짧게, 상세는 유료에서 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">무료 운세 요약</h3>
        {freePreviewSections.map((section) => (
          <div key={section.key}>
            <span className="text-sm font-medium text-foreground">
              {FREE_PREVIEW_EMOJI[section.key as (typeof FREE_PREVIEW_ORDER)[number]]} {section.title}
            </span>
            <p className="text-sm leading-relaxed text-foreground-muted">{section.teaser}</p>
          </div>
        ))}
      </div>

      {/* ⑦ 전환 유도 문구 (개인화) */}
      <div className="flex flex-col items-center gap-1 px-2 text-center">
        <p className="text-sm text-foreground-muted">
          지금까지는 <strong className="text-foreground">{free.dominantWuxing}</strong> 기운을 기준으로 한
          기본 방향이었어요.
        </p>
        <p className="text-sm font-medium text-foreground">더 자세한 분석이 궁금하다면?</p>
      </div>

      {/* ⑧~⑩ 상세 분석 미리보기 + 포함 내용 + 가격 (PremiumUnlock 내부) */}
      <PremiumUnlock
        result={result}
        name={name}
        premiumSections={premiumSections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      {/* 실제 이용 후기 — 4,900원 가치·CTA를 막 확인한 시점 바로 다음에 사회적 증거를
          붙여서, 페이지 맨 아래(구매 판단이 끝난 뒤)에 있던 것보다 설득에 도움이 되게 한다. */}
      <div className="flex flex-col gap-3">
        <h3 className="px-1 text-sm font-medium text-foreground-muted">이용 후기</h3>
        <ReviewList reviews={reviews} />
      </div>

      {/* 여기서부터는 핵심 전환 목표(상세 분석 구매) 뒤에 오는 부가 기능들 — 유료 CTA보다
          눈에 띄지 않게 아래로 내려서 배치한다. */}
      <DailyFortuneCard daily={daily} />

      <Link
        href="/compatibility"
        className="rounded-2xl border border-dashed border-border-subtle px-4 py-3 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
      >
        ❤️ 우리 궁합도 확인해보기
      </Link>

      <div className="flex flex-col gap-2">
        <ShareButton
          title="사주랩"
          text={`나의 사주는 ${free.dayMasterLabel}, "${free.dayMasterMetaphor}"래요. 무료로 내 사주도 확인해보세요 🔮`}
          ctaLabel="무료로 내 사주 확인하기"
          card={{ variant: "saju", label: free.dayMasterLabel, sub: free.dayMasterMetaphor }}
        />
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-foreground-muted underline underline-offset-4"
        >
          다시 입력하기
        </button>
      </div>

      {/* 광고는 구매·공유·궁합 탐색 등 서비스 자체의 전환 동선을 다 지나간 뒤,
          정말 마지막에만 노출한다 — 동선 중간에 끼어 이탈을 유도하지 않도록. */}
      {!isPaid && <AdSlot />}
    </div>
  );
}
