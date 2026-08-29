"use client";

import { useEffect, useState } from "react";
import type { SajuResult } from "@/lib/saju/types";
import type { FreeCompatibility } from "@/lib/saju/compatibility";
import { getCompatibilitySections } from "@/lib/saju/compatibility";
import { resultToInput } from "@/lib/saju/types";
import { AdSlot } from "./AdSlot";
import { CompatibilityUnlock } from "./CompatibilityUnlock";
import { ShareButton } from "./ShareButton";
import { trackEvent } from "@/lib/analytics/track";

export function CompatibilityResultView({
  selfResult,
  partnerResult,
  free,
  selfName,
  partnerName,
  onRestart,
  resumePaymentId,
}: {
  selfResult: SajuResult;
  partnerResult: SajuResult;
  free: FreeCompatibility;
  selfName: string;
  partnerName: string;
  onRestart: () => void;
  resumePaymentId: string | null;
}) {
  const [isPaid, setIsPaid] = useState(false);
  const sections = getCompatibilitySections(free);

  useEffect(() => {
    trackEvent("free_result_view", { productType: "compatibility_report" });
  }, []);

  const pairLabel =
    selfName && partnerName ? `${selfName}님과 ${partnerName}님` : "두 분";

  return (
    <div className="flex w-full max-w-md flex-col gap-8 pb-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-sm text-foreground-muted">{pairLabel}의 궁합</span>
        <div className="mt-2 text-5xl font-serif text-accent-gold-soft">{free.overallScore}점</div>
        <h2 className="font-serif text-2xl text-foreground">{free.headline}</h2>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-foreground">{free.summary}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4 text-center">
        <p className="text-xs text-foreground-muted">
          오행 관계: <span className="text-accent-gold-soft">{free.relation}</span> · 사주는 확정된 미래가 아니라
          재미와 자기이해를 위한 콘텐츠예요.
        </p>
      </div>

      {!isPaid && <AdSlot label="광고" />}

      <CompatibilityUnlock
        selfInput={resultToInput(selfResult)}
        partnerInput={resultToInput(partnerResult)}
        selfName={selfName}
        partnerName={partnerName}
        sections={sections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      <div className="flex flex-col gap-2">
        <ShareButton
          title="사주랩 궁합 결과"
          text={`우리 궁합 ${free.overallScore}점 나왔는데, 이 점수가 왜 나왔는지 궁금하지 않아? 🔮`}
          shareLabel="💬 이 결과 그 사람한테 보내기"
          ctaLabel="우리 궁합도 확인하기"
          card={{ variant: "compat", score: free.overallScore, sub: "이 점수가 나온 진짜 이유는 따로 있어요" }}
          source="compat_free"
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
