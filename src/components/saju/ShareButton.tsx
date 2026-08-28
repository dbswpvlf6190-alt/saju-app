"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { shareToKakao } from "@/lib/kakao/share";

/** 생년월일·생시 같은 원본 개인정보는 공유 텍스트/URL에 절대 포함하지 않는다.
 * 요약 문구 + 앱 홈 링크만 공유해서, 받는 사람이 궁금해서 직접 들어와보게 만드는 용도다.
 * 사주 결과·궁합 결과 양쪽에서 재사용한다. */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    trackEvent("share_click", {});
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

    // 카카오톡이 국내 공유 채널 중 압도적으로 많이 쓰여서 우선 시도한다.
    // SDK 로드 실패(광고차단 등)나 초기화 실패 시에만 기존 방식으로 폴백한다.
    if (shareToKakao({ title, description: text, url: shareUrl })) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // 사용자가 공유를 취소한 경우 등은 별도 처리 없이 조용히 무시한다.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 접근도 실패하면 아무 것도 하지 않는다(권한 문제 등).
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
    >
      {copied ? "링크를 복사했어요" : "💬 카카오톡으로 공유하기"}
    </button>
  );
}
