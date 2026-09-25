"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/analytics/track";
import { shareToKakao } from "@/lib/kakao/share";
import type { WuXing } from "@/lib/saju/ganzhi";

/** 공유 카드 이미지에 넣을 결과 요약. 여기 들어가는 값도 공유 텍스트(text)에 이미
 * 노출되는 정도(일간 별명, 궁합 점수 등)로만 제한한다 — 이름·생년월일시는 절대 금지. */
type ShareCard =
  | { variant: "saju"; label: string; sub?: string; wuxing?: WuXing }
  | { variant: "compat"; score: number; sub?: string };

/** 생년월일·생시 같은 원본 개인정보는 공유 텍스트/URL에 절대 포함하지 않는다.
 * 요약 문구 + 앱 홈 링크만 공유해서, 받는 사람이 궁금해서 직접 들어와보게 만드는 용도다.
 * 사주 결과·궁합 결과 양쪽에서 재사용한다. */
export function ShareButton({
  title,
  text,
  ctaLabel = "무료로 확인하기",
  shareLabel = "💬 카카오톡으로 공유하기",
  card,
  source,
}: {
  title: string;
  text: string;
  /** 카카오 공유 카드의 버튼 문구. 사주/궁합 맥락에 맞게 호출부에서 지정한다. */
  ctaLabel?: string;
  /** 화면에 보이는 공유 버튼 자체의 문구. 위치(무료 결과/궁합/구매 후)마다 다른 동기부여
   * 카피를 쓰기 위해 호출부에서 지정한다 — 예: "친구는 뭐라고 나올까?", "그 사람한테 보내기". */
  shareLabel?: string;
  card?: ShareCard;
  /** share_click 이벤트에 같이 기록할 위치 식별자(예: "free_result"/"compat_free"/"premium_unlocked").
   * 어느 화면의 공유 버튼이 실제 유입을 만드는지 구분하기 위한 용도. */
  source?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [storyStatus, setStoryStatus] = useState<"idle" | "preparing" | "error">("idle");
  // 이미지 파일 공유를 지원하지 않는 환경(인스타·카카오톡 안 브라우저, PC 등)에서는 이미지를
  // 화면 안에 띄워서 저장 후 직접 올리게 안내한다(빈 새 탭을 열던 예전 방식은 앱 안
  // 브라우저에서 막히거나 사용자가 뭘 해야 할지 알 수 없었다).
  const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);

  function closeStoryPreview() {
    if (storyPreviewUrl) URL.revokeObjectURL(storyPreviewUrl);
    setStoryPreviewUrl(null);
  }

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

  // 인스타 스토리는 세로형(9:16) 이미지가 아니면 위아래가 잘려서 그대로 올릴 수 없어서,
  // 카카오톡 카드용 가로형(buildImageUrl)과 별개로 /api/og/story를 따로 호출한다.
  function buildStoryImageUrl(): string | undefined {
    if (!card || typeof window === "undefined") return undefined;
    const params = new URLSearchParams({ variant: card.variant });
    if (card.variant === "saju") {
      params.set("label", card.label);
      if (card.wuxing) params.set("wx", card.wuxing);
    } else {
      params.set("score", String(card.score));
    }
    if (card.sub) params.set("sub", card.sub);
    return `${window.location.origin}/api/og/story?${params.toString()}`;
  }

  async function handleStoryShare() {
    trackEvent("share_click", { source: source ? `${source}_story` : "story" });
    const imageUrl = buildStoryImageUrl();
    if (!imageUrl) return;

    setStoryStatus("preparing");
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("이미지를 만들지 못했어요.");
      const blob = await res.blob();
      const file = new File([blob], "saju-lab.png", { type: "image/png" });

      // 모바일 일반 브라우저에서는 파일 첨부 공유 시트를 띄워 인스타그램으로 바로 보낼 수 있게 한다.
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text });
          setStoryStatus("idle");
          return;
        } catch (e) {
          // 사용자가 공유창을 닫은 것(AbortError)은 정상 취소다. 그 외 실패는 아래 저장 안내로 넘긴다.
          if (e instanceof DOMException && e.name === "AbortError") {
            setStoryStatus("idle");
            return;
          }
        }
      }

      // 공유를 지원하지 않는 환경: 화면 안에서 이미지를 보여주고 저장 방법을 안내한다.
      setStoryPreviewUrl(URL.createObjectURL(blob));
      setStoryStatus("idle");
    } catch {
      setStoryStatus("error");
      setTimeout(() => setStoryStatus("idle"), 2000);
    }
  }

  async function handleShare() {
    trackEvent("share_click", source ? { source } : {});

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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
      >
        {copied ? "링크를 복사했어요" : shareLabel}
      </button>

      {/* 카카오톡 공유(링크 카드)와 별개로, 세로형 결과 카드를 인스타 스토리에 바로 올릴 수
          있는 경로. 카카오톡 밖에서도 바이럴 유입이 생기게 하려는 용도라 card가 있을 때만
          노출한다. */}
      {card && (
        <button
          type="button"
          onClick={() => void handleStoryShare()}
          disabled={storyStatus === "preparing"}
          className="flex items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft disabled:opacity-50"
        >
          {storyStatus === "preparing"
            ? "이미지 준비 중..."
            : storyStatus === "error"
              ? "공유에 실패했어요"
              : "📱 인스타 스토리에 공유하기"}
        </button>
      )}

      {storyPreviewUrl && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="스토리용 이미지 저장 안내"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="flex max-h-full w-full max-w-sm flex-col items-center gap-2.5 overflow-y-auto rounded-2xl bg-background-card p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storyPreviewUrl} alt="인스타 스토리용 결과 이미지" className="max-h-[34vh] w-auto rounded-xl" />
            <p className="text-sm font-medium text-foreground">이미지를 꾹 눌러 저장한 뒤 스토리에 올려주세요</p>
            <div className="flex w-full gap-2">
              <a
                href={storyPreviewUrl}
                download="saju-lab.png"
                className="flex-1 rounded-xl bg-accent-gold px-4 py-2.5 text-sm font-semibold text-[#1a1430]"
              >
                이미지 저장
              </a>
              <button
                type="button"
                onClick={closeStoryPreview}
                className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm text-foreground-muted"
              >
                닫기
              </button>
            </div>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-left text-xs leading-relaxed text-foreground-muted">
              <li>위 이미지를 꾹 눌러 <strong>저장</strong>해요.</li>
              <li>인스타그램 스토리에서 방금 저장한 이미지를 올려요.</li>
              <li><strong>@sajulab_official</strong>을 태그하면 친구가 바로 들어올 수 있어요.</li>
            </ol>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
