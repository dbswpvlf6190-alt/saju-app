"use client";

import { useState } from "react";
import type { SajuResult } from "@/lib/saju";
// 배럴(@/lib/saju)을 거치면 번들러가 engine.ts(lunar-typescript, 수백 KB)까지 딸려오는 걸
// 완전히 트리쉐이킹하지 못해서, 클라이언트 컴포넌트에서는 실제로 쓰는 서브모듈을 직접 가져온다.
import { generateFreeContent, getPremiumSections } from "@/lib/saju/content";
import { getDailyFortune } from "@/lib/saju/dailyFortune";
import { PillarCard } from "./PillarCard";
import { WuxingBar } from "./WuxingBar";
import { PremiumUnlock } from "./PremiumUnlock";
import { AdSlot } from "./AdSlot";
import { ShareButton } from "./ShareButton";

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
  const daily = getDailyFortune(result);

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

      <div className="flex flex-col gap-2 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4">
        <h3 className="text-sm font-medium text-accent-gold-soft">오늘의 운세 · {daily.dateLabel}</h3>
        <p className="leading-relaxed text-foreground">{daily.text}</p>
      </div>

      {!isPaid && <AdSlot />}

      <PremiumUnlock
        result={result}
        name={name}
        premiumSections={premiumSections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      <div className="flex flex-col gap-2">
        <ShareButton dayMasterLabel={free.dayMasterLabel} dayMasterMetaphor={free.dayMasterMetaphor} />
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
