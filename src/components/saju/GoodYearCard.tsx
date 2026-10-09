"use client";

import { useEffect, useMemo } from "react";
import type { SajuResult } from "@/lib/saju";
import { currentYearKst, getGoodYears } from "@/lib/saju/goodYears";
import { trackEvent } from "@/lib/analytics/track";

/**
 * 무료 결과의 "앞으로 흐름이 좋은 해" 카드. 가장 가까운 좋은 해 하나는 크게, 다음 하나는 작게 보여주고
 * "그 해에 무엇을 시작하고 무엇을 미룰지"는 유료 리포트의 '지금 시기 사용법' 장으로 잇는다.
 */
export function GoodYearCard({ result }: { result: SajuResult }) {
  // 올해는 남은 달이 적어 기대감이 약하다 — 내년부터 5년 중에서 고른다(Threads 답글 pick_timing '좋은 해'와 같은 기준).
  const years = useMemo(() => getGoodYears(result, currentYearKst() + 1), [result]);
  useEffect(() => {
    if (years.length) trackEvent("good_year_view", { year: years[0].year });
  }, [years]);
  if (years.length === 0) return null;
  const [first, second] = years;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4">
      <h3 className="text-sm font-medium text-foreground-muted">🌟 앞으로 흐름이 좋은 해</h3>
      <div className="flex flex-col gap-1">
        <span className="font-serif text-2xl text-accent-gold-soft">
          {first.year}년 <span className="text-base">{first.ganzhiKor}년</span>
        </span>
        <span className="text-sm font-semibold text-foreground">{first.label}</span>
        <p className="text-sm leading-relaxed text-foreground">{first.line}</p>
      </div>
      {second && (
        <p className="text-sm text-foreground-muted">
          그다음은 <b className="text-foreground">{second.year}년 {second.ganzhiKor}년</b> — {second.label}
        </p>
      )}
      <p className="text-xs leading-relaxed text-foreground-muted">
        그 해에 무엇을 시작하고 무엇을 미뤄야 할지는 상세 풀이 <b>‘지금 시기 사용법’</b> 장에서 이어서 풀어드려요.
      </p>
      <a
        href="#premium-unlock"
        onClick={() => trackEvent("good_year_cta_click", { year: first.year })}
        className="rounded-xl border border-accent-gold px-4 py-2.5 text-center text-sm font-semibold text-accent-gold-soft"
      >
        내 시기 사용법 보기 →
      </a>
      <p className="text-[11px] text-foreground-muted/80">태어난 날의 일간과 해마다 들어오는 기운의 관계로 본 전통 해석이에요.</p>
    </div>
  );
}
