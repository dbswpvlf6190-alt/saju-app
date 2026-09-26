"use client";

import { useEffect, useState } from "react";
import type { DailyFortuneDetail } from "@/lib/saju/dailyFortune";
import { trackEvent } from "@/lib/analytics/track";

/** 8개 항목으로 확장한 오늘의 운세. 날짜(KST) + 일간 기반으로 결정되므로 새로고침해도
 * 바뀌지 않고, 날짜가 지나면 자연스럽게 새 결과가 나온다("내일 다시 확인" 재방문 유도). */
export function DailyFortuneCard({ daily }: { daily: DailyFortuneDetail }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    trackEvent("daily_fortune_view", {});
  }, []);

  // 결제 CTA 아래 부가 기능이라 기본은 종합운만 보여주고, 나머지는 펼쳐야 보이게 해서
  // 페이지 길이를 줄인다.
  const detailRows: { emoji: string; label: string; value: string }[] = [
    { emoji: "❤️", label: "연애운", value: daily.love },
    { emoji: "💰", label: "재물운", value: daily.wealth },
    { emoji: "💼", label: "직업운", value: daily.career },
    { emoji: "🤝", label: "인간관계운", value: daily.relationship },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-accent-gold-soft">🌙 오늘의 간단 운세 · {daily.dateLabel}</h3>
        <span className="shrink-0 rounded-full bg-background-elevated/60 px-2 py-0.5 text-[10px] text-foreground-muted">
          일일 운세
        </span>
      </div>
      {/* 위 유료 상세 분석과 카테고리 이름이 겹쳐서 "이미 다 봤다"고 오해하지 않도록,
          이건 오늘 하루짜리 가벼운 운세라는 걸 읽기 전에 먼저 밝혀둔다. */}
      <p className="text-xs text-foreground-muted">
        이건 오늘 하루만 가볍게 보는 운세예요. 사주 전체를 심층 분석한 리포트는 위 상세 분석에서 확인하실 수
        있어요.
      </p>

      <div>
        <span className="text-xs text-foreground-muted">🔮 오늘의 종합운</span>
        <p className="text-sm leading-relaxed text-foreground">{daily.overall}</p>
      </div>

      <p className="text-center text-sm italic text-foreground-muted">⭐ {daily.oneLiner}</p>

      {expanded && (
        <>
          <div className="flex flex-col gap-2">
            {detailRows.map((row) => (
              <div key={row.label}>
                <span className="text-xs text-foreground-muted">
                  {row.emoji} {row.label}
                </span>
                <p className="text-sm leading-relaxed text-foreground">{row.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background-elevated/60 px-3 py-2 text-center">
              <span className="text-xs text-foreground-muted">🍀 행운의 숫자</span>
              <p className="text-sm font-semibold text-accent-gold-soft">{daily.luckyNumber}</p>
            </div>
            <div className="rounded-xl bg-background-elevated/60 px-3 py-2 text-center">
              <span className="text-xs text-foreground-muted">🎨 행운의 색</span>
              <p className="text-sm font-semibold text-accent-gold-soft">{daily.luckyColor}</p>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-foreground-muted underline underline-offset-4"
      >
        {expanded ? "오늘의 운세 접기 ▲" : "연애·재물·직업운, 행운의 숫자·색 더 보기 ▾"}
      </button>

      <p className="text-center text-xs text-foreground-muted">내일의 운세도 확인해보세요 🔮 내일 다시 확인하기</p>
    </div>
  );
}
