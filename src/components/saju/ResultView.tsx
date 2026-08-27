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
import { trackEvent } from "@/lib/analytics/track";

export function ResultView({
  name,
  result,
  onRestart,
  resumePaymentId,
}: {
  name: string;
  result: SajuResult;
  onRestart: () => void;
  resumePaymentId: string | null;
}) {
  const [isPaid, setIsPaid] = useState(false);
  const free = generateFreeContent(result);
  const premiumSections = getPremiumSections(result);
  const daily = getDailyFortuneDetail(result);

  useEffect(() => {
    trackEvent("free_result_view", { productType: "premium_report" });
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-8 pb-16">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">오행 분포</h3>
        <WuxingBar percent={result.wuxingPercent} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">타고난 성격</h3>
        <p className="leading-relaxed text-foreground">{free.personality}</p>
      </div>

      <DailyFortuneCard daily={daily} />

      <Link
        href="/compatibility"
        className="rounded-2xl border border-dashed border-border-subtle px-4 py-3 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
      >
        ❤️ 우리 궁합도 확인해보기
      </Link>

      {!isPaid && <AdSlot />}

      <PremiumUnlock
        result={result}
        name={name}
        premiumSections={premiumSections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      <div className="flex flex-col gap-2">
        <ShareButton
          title="사주랩"
          text={`나의 사주는 ${free.dayMasterLabel}, "${free.dayMasterMetaphor}"래요. 무료로 내 사주도 확인해보세요 🔮`}
        />
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-foreground-muted underline underline-offset-4"
        >
          다시 입력하기
        </button>
      </div>
    </div>
  );
}
