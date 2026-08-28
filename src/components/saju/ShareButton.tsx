"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { shareToKakao } from "@/lib/kakao/share";

/** 공유 카드 이미지에 넣을 결과 요약. 여기 들어가는 값도 공유 텍스트(text)에 이미
 * 노출되는 정도(일간 별명, 궁합 점수 등)로만 제한한다 — 이름·생년월일시는 절대 금지. */
type ShareCard =
  | { variant: "saju"; label: string; sub?: string }
  | { variant: "compat"; score: number; sub?: string };

/** 생년월일·생시 같은 원본 개인정보는 공유 텍스트/URL에 절대 포함하지 않는다.
 * 요약 문구 + 앱 홈 링크만 공유해서, 받는 사람이 궁금해서 직접 들어와보게 만드는 용도다.
 * 사주 결과·궁합 결과 양쪽에서 재사용한다. */
export function ShareButton({
  title,
  text,
  ctaLabel = "무료로 확인하기",
  card,
}: {
  title: string;
  text: string;
  /** 카카오 공유 카드의 버튼 문구. 사주/궁합 맥락에 맞게 호출부에서 지정한다. */
  ctaLabel?: string;
  card?: ShareCard;
}) {
  const [copied, setCopied] = useState(false);

  // 공유 링크에 방법별 ref를 붙여서, 랜딩 페이지에서 어떤 공유 경로로 새 방문자가
  // 들어왔는지 구분할 수 있게 한다(공유 기능이 실제 유입을 만드는지 확인하는 용도).
  function buildShareUrl(method: "kakao" | "native" | "copy") {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.origin);
    url.searchParams.set("ref", `share_${method}`);
    return url.toString();
  }

  function buildImageUrl(): string | undefined {
    if (!card || typeof window === "undefined") return undefined;
    const params = new URLSearchParams({ variant: card.variant });
    if (card.variant === "saju") {
      params.set("label", card.label);
    } else {
      params.set("score", String(card.score));
    }
    if (card.sub) params.set("sub", card.sub);
    return `${window.location.origin}/api/og/share?${params.toString()}`;
  }

  async function handleShare() {
    trackEvent("share_click", {});

    // 카카오톡이 국내 공유 채널 중 압도적으로 많이 쓰여서 우선 시도한다.
    // SDK 로드 실패(광고차단 등)나 초기화 실패 시에만 기존 방식으로 폴백한다.
    if (
      shareToKakao({
        title,
        description: text,
        url: buildShareUrl("kakao"),
        imageUrl: buildImageUrl(),
        buttonLabel: ctaLabel,
      })
    ) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: buildShareUrl("native") });
      } catch {
        // 사용자가 공유를 취소한 경우 등은 별도 처리 없이 조용히 무시한다.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${text} ${buildShareUrl("copy")}`);
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
