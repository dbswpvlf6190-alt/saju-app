"use client";

import Script from "next/script";

const AD_UNIT_ID = "DAN-4jeHSvep5vJaQR9b";

/** 카카오 애드핏 배너(320x100). 유료 결제 사용자에게는 상위(ResultView)에서
 * 아예 렌더링하지 않는 방식으로 광고 제거 혜택을 준다. */
export function AdSlot({ label = "광고" }: { label?: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-1" aria-label="광고 영역">
      <span className="text-[11px] uppercase tracking-wide text-foreground-muted/60">{label}</span>
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={AD_UNIT_ID}
        data-ad-width="320"
        data-ad-height="100"
      />
      <Script id="kakao-adfit-sdk" src="//t1.kakaocdn.net/kas/static/ba.min.js" strategy="afterInteractive" async />
    </div>
  );
}
