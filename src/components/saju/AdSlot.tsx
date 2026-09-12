"use client";

import { useEffect } from "react";

const AD_UNIT_ID = "DAN-4jeHSvep5vJaQR9b";

/** 카카오 애드핏 배너(320x100). 유료 결제 사용자에게는 상위(ResultView)에서
 * 아예 렌더링하지 않는 방식으로 광고 제거 혜택을 준다. */
export function AdSlot({ label = "광고" }: { label?: string }) {
  useEffect(() => {
    // 애드핏 SDK는 "로드되는 시점에 페이지에 있는 .kakao_ad_area를 한 번 스캔"하는
    // 방식이다. Next.js의 <Script>는 같은 id면 한 번만 실행하기 때문에, 이 컴포넌트가
    // 두 번째로 마운트될 때(사주 다시 보기, 궁합→사주 이동 등으로 새 AdSlot이 뜰 때)는
    // SDK가 재실행되지 않아 새 광고 영역이 영영 빈 칸으로 남는 문제가 있었다.
    // 마운트마다 새 <script> 태그를 직접 만들어 붙여서 매번 SDK가 다시 스캔하게 한다.
    const script = document.createElement("script");
    script.src = "//t1.kakaocdn.net/kas/static/ba.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
    </div>
  );
}
