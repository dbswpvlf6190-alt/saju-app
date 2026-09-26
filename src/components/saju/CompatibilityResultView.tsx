"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  invite,
}: {
  selfResult: SajuResult;
  partnerResult: SajuResult;
  free: FreeCompatibility;
  selfName: string;
  partnerName: string;
  onRestart: () => void;
  resumePaymentId: string | null;
  /** 궁합 링크로 만든 결과일 때. 두 사람 모두 보낸 사람 기준(self=보낸 사람)으로 같은 결과를 보고,
   * otherName은 지금 보고 있는 사람 입장에서 상대의 이름이다. */
  invite?: { role: "inviter" | "partner"; otherName: string };
}) {
  const [isPaid, setIsPaid] = useState(false);
  const sections = getCompatibilitySections(free);

  useEffect(() => {
    trackEvent("free_result_view", { productType: "compatibility_report" });
  }, []);

  const buyerIsPartner = invite?.role === "partner";
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

      {invite && (
        <p className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-3 py-2.5 text-center text-sm text-foreground">
          {invite.role === "inviter"
            ? `✓ ${invite.otherName ? `${invite.otherName}님이` : "상대가"} 입력해서 결과가 열렸어요`
            : `✓ ${invite.otherName ? `${invite.otherName}님` : "보낸 분"}에게도 결과가 열렸어요`}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4 text-center">
        <p className="text-xs text-foreground-muted">
          오행 관계: <span className="text-accent-gold-soft">{free.relation}</span> · 사주는 확정된 미래가 아니라
          재미와 자기이해를 위한 콘텐츠예요.
        </p>
      </div>

      {!isPaid && <AdSlot label="광고" />}

      {/* 상세 분석은 산 사람이 "본인"으로 읽히도록, 링크를 받은 사람이 사면 두 사람 순서를 바꿔 넘긴다. */}
      <CompatibilityUnlock
        selfInput={resultToInput(buyerIsPartner ? partnerResult : selfResult)}
        partnerInput={resultToInput(buyerIsPartner ? selfResult : partnerResult)}
        selfName={buyerIsPartner ? partnerName : selfName}
        partnerName={buyerIsPartner ? selfName : partnerName}
        sections={sections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      {buyerIsPartner && (
        <div className="flex flex-col gap-2 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4 text-center">
          <p className="text-sm text-foreground">
            🔮 궁합 말고 <strong className="text-accent-gold-soft">내 사주</strong>도 궁금하다면? 방금 넣은 정보로 바로
            볼 수 있어요.
          </p>
          <Link
            href="/#saju-form"
            className="rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
          >
            내 사주 무료로 보기
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* 링크로 만든 궁합은 두 사람이 이미 같은 결과를 보고 있어서 "그 사람한테 보내기"를 빼고,
            다른 사람과 궁합을 보도록 새 링크 만들기만 남긴다(다시 입력하기). */}
        {!invite && (
        <ShareButton
          title="사주랩 궁합 결과"
          text={`우리 궁합 ${free.overallScore}점 나왔는데, 이 점수가 왜 나왔는지 궁금하지 않아? 🔮`}
          shareLabel="💬 이 결과 그 사람한테 보내기"
          ctaLabel="우리 궁합도 확인하기"
          card={{ variant: "compat", score: free.overallScore, sub: "이 점수가 나온 진짜 이유는 따로 있어요" }}
          source="compat_free"
        />
        )}
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-foreground-muted underline underline-offset-4"
        >
          {invite ? "다른 사람과 궁합 보기" : "다시 입력하기"}
        </button>
      </div>
    </div>
  );
}
