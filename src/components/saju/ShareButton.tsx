"use client";

import { useState } from "react";

/**
 * 생년월일·생시 같은 원본 개인정보는 공유 텍스트에 절대 포함하지 않는다.
 * 일간 별칭 + 성격 한 줄 + 앱 링크만 공유해서, 받는 사람이 궁금해서 직접 들어와보게 만드는 용도다.
 */
export function ShareButton({
  dayMasterLabel,
  dayMasterMetaphor,
}: {
  dayMasterLabel: string;
  dayMasterMetaphor: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareText = `나의 사주는 ${dayMasterLabel}, "${dayMasterMetaphor}"래요. 무료로 내 사주도 확인해보세요 🔮`;
    const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

    if (navigator.share) {
      try {
        await navigator.share({ title: "사주풀이", text: shareText, url: shareUrl });
      } catch {
        // 사용자가 공유를 취소한 경우 등은 별도 처리 없이 조용히 무시한다.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
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
      {copied ? "링크를 복사했어요" : "결과 공유하기"}
    </button>
  );
}
