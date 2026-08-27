"use client";

import { useEffect } from "react";
import type { DailyFortuneDetail } from "@/lib/saju/dailyFortune";
import { trackEvent } from "@/lib/analytics/track";

/** 8개 항목으로 확장한 오늘의 운세. 날짜(KST) + 일간 기반으로 결정되므로 새로고침해도
 * 바뀌지 않고, 날짜가 지나면 자연스럽게 새 결과가 나온다("내일 다시 확인" 재방문 유도). */
export function DailyFortuneCard({ daily }: { daily: DailyFortuneDetail }) {
  useEffect(() => {
    trackEvent("daily_fortune_view", {});
  }, []);

  const rows: { emoji: string; label: string; value: string }[] = [
    { emoji: "🔮", label: "오늘의 종합운", value: daily.overall },
    { emoji: "❤️", label: "연애운", value: daily.love },
    { emoji: "💰", label: "재물운", value: daily.wealth },
    { emoji: "💼", label: "직업운", value: daily.career },
    { emoji: "🤝", label: "인간관계운", value: daily.relationship },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4">
      <h3 className="text-sm font-medium text-accent-gold-soft">오늘의 운세 · {daily.dateLabel}</h3>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label}>
            <span className="text-xs text-foreground-muted">
              {row.emoji} {row.label}
            </span>
            <p className="text-sm leading-relaxed text-foreground">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background-elevated/60 px-3 py-2 text-center">
          <span className="text-xs text-foreground-muted">🍀 행운의 숫자</span>
          <p className="text-sm font-semibold text-accent-gold-soft">{daily.luckyNumber}</p>
        </div>
        <div className="rounded-xl bg-background-elevated/60 px-3 py-2 text-center">
          <span className="text-xs text-foreground-muted">🎨 행운의 색</span>
          <p className="text-sm font-semibold text-accent-gold-soft">{daily.luckyColor}</p>
        </div>
      </div>

      <p className="text-center text-sm italic text-foreground-muted">⭐ {daily.oneLiner}</p>

      <p className="text-center text-xs text-foreground-muted">내일의 운세도 확인해보세요 🔮 내일 다시 확인하기</p>
    </div>
  );
}
