"use client";

import { useId } from "react";
import type { WuXing } from "@/lib/saju/ganzhi";

/** 오행 5종 마스코트. 각 원소의 기존 비유(나무·불꽃·산·원석·물방울, content.ts의
 * DAY_MASTER_PROFILES와 동일한 이미지)를 그대로 캐릭터화했다. 그라데이션 id는 컴포넌트가
 * 한 화면에 여러 번 렌더링돼도 충돌하지 않도록 useId()로 매번 새로 만든다. */
export function WuxingMascot({ wuxing, size = 96 }: { wuxing: WuXing; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `wx-grad-${uid}`;

  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label={`${wuxing} 마스코트`}>
      {wuxing === "목" && (
        <>
          <defs>
            <radialGradient id={gradId} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#8fd6a8" />
              <stop offset="60%" stopColor="#4caf6e" />
              <stop offset="100%" stopColor="#2f7a49" />
            </radialGradient>
          </defs>
          <ellipse cx="80" cy="146" rx="34" ry="7" fill="#000" opacity="0.28" />
          <rect x="72" y="108" width="16" height="26" rx="6" fill="#8a6a4a" />
          <ellipse cx="58" cy="132" rx="9" ry="6" fill="#4caf6e" />
          <ellipse cx="102" cy="132" rx="9" ry="6" fill="#4caf6e" />
          <circle cx="80" cy="66" r="52" fill={`url(#${gradId})`} />
          <path d="M80 10 Q86 22 78 30 Q90 26 92 14" fill="#6fc98c" />
          <ellipse cx="55" cy="60" rx="10" ry="13" fill="#fff" opacity="0.16" />
          <circle cx="63" cy="64" r="6" fill="#17301f" />
          <circle cx="97" cy="64" r="6" fill="#17301f" />
          <circle cx="65.5" cy="61.5" r="1.8" fill="#fff" />
          <circle cx="99.5" cy="61.5" r="1.8" fill="#fff" />
          <ellipse cx="58" cy="78" rx="7" ry="4" fill="#e88a8a" opacity="0.55" />
          <ellipse cx="102" cy="78" rx="7" ry="4" fill="#e88a8a" opacity="0.55" />
          <path d="M64 82 Q80 94 96 82" fill="none" stroke="#17301f" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {wuxing === "화" && (
        <>
          <defs>
            <radialGradient id={gradId} cx="45%" cy="35%" r="80%">
              <stop offset="0%" stopColor="#ffce8a" />
              <stop offset="45%" stopColor="#e2604f" />
              <stop offset="100%" stopColor="#a83b2b" />
            </radialGradient>
          </defs>
          <ellipse cx="80" cy="146" rx="32" ry="7" fill="#000" opacity="0.28" />
          <path
            d="M80 12 C104 40 116 66 112 90 C108 122 92 138 80 138 C68 138 52 122 48 90 C44 66 56 40 80 12 Z"
            fill={`url(#${gradId})`}
          />
          <path
            d="M80 40 C94 58 100 74 96 90 C93 104 86 112 80 112 C77 112 74 108 73 102 C82 96 86 82 80 68 C76 60 76 50 80 40 Z"
            fill="#ffe1a8"
            opacity="0.55"
          />
          <circle cx="66" cy="86" r="6" fill="#4a1810" />
          <circle cx="94" cy="86" r="6" fill="#4a1810" />
          <circle cx="68.5" cy="83.5" r="1.8" fill="#fff" />
          <circle cx="96.5" cy="83.5" r="1.8" fill="#fff" />
          <ellipse cx="61" cy="99" rx="7" ry="4" fill="#ffd27a" opacity="0.7" />
          <ellipse cx="99" cy="99" rx="7" ry="4" fill="#ffd27a" opacity="0.7" />
          <path d="M67 104 Q80 116 93 104" fill="none" stroke="#4a1810" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {wuxing === "토" && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eccd8f" />
              <stop offset="55%" stopColor="#d3a04a" />
              <stop offset="100%" stopColor="#9c7530" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="146" rx="42" ry="7" fill="#000" opacity="0.28" />
          <ellipse cx="55" cy="140" rx="8" ry="5" fill="#9c7530" />
          <ellipse cx="105" cy="140" rx="8" ry="5" fill="#9c7530" />
          <path
            d="M80 22 C112 22 138 58 138 92 C138 118 112 138 80 138 C48 138 22 118 22 92 C22 58 48 22 80 22 Z"
            fill={`url(#${gradId})`}
          />
          <path d="M46 60 C54 44 66 34 80 32 C70 40 60 52 56 68 Z" fill="#f4e0ae" opacity="0.5" />
          <circle cx="62" cy="84" r="6.5" fill="#5a3f18" />
          <circle cx="98" cy="84" r="6.5" fill="#5a3f18" />
          <circle cx="64.5" cy="81.5" r="1.8" fill="#fff" />
          <circle cx="100.5" cy="81.5" r="1.8" fill="#fff" />
          <ellipse cx="56" cy="98" rx="7.5" ry="4.5" fill="#e79a6a" opacity="0.5" />
          <ellipse cx="104" cy="98" rx="7.5" ry="4.5" fill="#e79a6a" opacity="0.5" />
          <path d="M64 102 Q80 112 96 102" fill="none" stroke="#5a3f18" strokeWidth="4.5" strokeLinecap="round" />
        </>
      )}

      {wuxing === "금" && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5f3ec" />
              <stop offset="55%" stopColor="#cfc9b8" />
              <stop offset="100%" stopColor="#8f8a78" />
            </linearGradient>
          </defs>
          <ellipse cx="80" cy="146" rx="34" ry="7" fill="#000" opacity="0.28" />
          <polygon points="80,16 122,48 108,108 80,138 52,108 38,48" fill={`url(#${gradId})`} />
          <polygon points="80,16 122,48 80,64 38,48" fill="#ffffff" opacity="0.35" />
          <line x1="80" y1="16" x2="80" y2="138" stroke="#8f8a78" strokeWidth="1.5" opacity="0.4" />
          <line x1="38" y1="48" x2="122" y2="48" stroke="#8f8a78" strokeWidth="1.5" opacity="0.4" />
          <path d="M96 26 L102 34 L96 42 L90 34 Z" fill="#fff" opacity="0.85" />
          <circle cx="66" cy="80" r="6" fill="#3f3c33" />
          <circle cx="94" cy="80" r="6" fill="#3f3c33" />
          <circle cx="68.5" cy="77.5" r="1.8" fill="#fff" />
          <circle cx="96.5" cy="77.5" r="1.8" fill="#fff" />
          <ellipse cx="60" cy="94" rx="7" ry="4" fill="#e0a8a8" opacity="0.5" />
          <ellipse cx="100" cy="94" rx="7" ry="4" fill="#e0a8a8" opacity="0.5" />
          <path d="M69 98 Q80 106 91 98" fill="none" stroke="#3f3c33" strokeWidth="4" strokeLinecap="round" />
        </>
      )}

      {wuxing === "수" && (
        <>
          <defs>
            <radialGradient id={gradId} cx="38%" cy="32%" r="80%">
              <stop offset="0%" stopColor="#a9c3f2" />
              <stop offset="55%" stopColor="#5b86d6" />
              <stop offset="100%" stopColor="#2f4d94" />
            </radialGradient>
          </defs>
          <ellipse cx="80" cy="146" rx="30" ry="7" fill="#000" opacity="0.28" />
          <circle cx="40" cy="128" r="5" fill="#5b86d6" opacity="0.7" />
          <circle cx="120" cy="122" r="4" fill="#5b86d6" opacity="0.6" />
          <path
            d="M80 14 C104 52 122 76 122 98 C122 122 103 140 80 140 C57 140 38 122 38 98 C38 76 56 52 80 14 Z"
            fill={`url(#${gradId})`}
          />
          <ellipse cx="60" cy="70" rx="12" ry="18" fill="#fff" opacity="0.32" />
          <circle cx="65" cy="92" r="6" fill="#182a52" />
          <circle cx="95" cy="92" r="6" fill="#182a52" />
          <circle cx="67.5" cy="89.5" r="1.8" fill="#fff" />
          <circle cx="97.5" cy="89.5" r="1.8" fill="#fff" />
          <ellipse cx="60" cy="106" rx="7" ry="4" fill="#ffb8c6" opacity="0.5" />
          <ellipse cx="100" cy="106" rx="7" ry="4" fill="#ffb8c6" opacity="0.5" />
          <path d="M68 110 Q80 120 92 110" fill="none" stroke="#182a52" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
