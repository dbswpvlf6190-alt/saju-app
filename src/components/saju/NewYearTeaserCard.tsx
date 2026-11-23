"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { trackEvent } from "@/lib/analytics/track";
import type { NewYearTeaser } from "@/lib/newYear/preview";

// 웹 /new-year 결제 전 미리보기(2026-11-17). 토스 v11 카드(구매 버튼 클릭 10배)를 웹 테마로 옮겼다.
// 손님(네이버 블로그·검색, 50대 이상 여성 다수)이 결제를 망설이는 이유: ① 내용을 미리 못 봄 ② 무엇을 사는지 모름 ③ 믿음.
// 그래서 순서는 내 한 해 이름 → 가장 좋은 달 + 진짜 좋은 날 하루 공개(나머지는 잠금) → 열두 달 그래프 → 받는 것을 숫자로.
// 전부 계산값이라 같은 생일이면 언제 봐도 같다. 쓰지 않음: 겁주기·건강·단정·가짜 마감·가짜 후기·흐리게 가린 가짜 글자.

const monthList = (ms: number[]) => ms.map((m) => `${m}월`).join(" · ");

export function NewYearTeaserCard({ teaser, name }: { teaser: NewYearTeaser; name: string }) {
  const t = teaser;
  const bestSet = new Set(t.best);

  useEffect(() => {
    trackEvent("ny_teaser_view", { best: t.best.join(","), goodDays: t.totalGoodDays });
    // 카드가 처음 보일 때 한 번만 기록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      aria-label={`${t.year}년 신년운세 미리보기`}
      className="flex flex-col gap-5 rounded-2xl border border-[#dccba6] bg-background-card/80 px-5 py-6 text-left"
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-accent-gold-soft">
          <Icon name="star" /> {t.year} {t.ganzhiKor}년 · {name ? `${name}님의 ` : "나의 "}신년운세
        </span>
        <h2 className="flex flex-col gap-1 font-serif text-foreground">
          <span className="text-lg">
            {name ? `${name}님의 ` : "나의 "}
            {t.year}년은
          </span>
          <span className="text-[26px] leading-tight text-accent-gold-soft">{t.label}</span>
        </h2>
        <p className="text-base leading-relaxed text-foreground-muted">{t.line}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#dccba6] bg-[#fbf7ef] px-4 py-4">
        <span className="text-sm font-medium text-accent-gold-soft">★ 흐름이 가장 좋은 달</span>
        <p className="font-serif text-xl text-foreground">
          {t.top.month}월 <span className="text-base text-foreground-muted">{t.top.title}</span>
        </p>
        {t.freeDay && (
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-2" aria-label={`${t.top.month}월 좋은 날`}>
            <div className="flex flex-col items-center rounded-lg border border-[#b8955a] bg-background-elevated px-1 py-2">
              <small className="text-[11px] text-accent-gold-soft">먼저 알려드려요</small>
              <b className="whitespace-nowrap text-[15px] text-foreground">
                {t.freeDay.month}월 {t.freeDay.day}일({t.freeDay.weekday})
              </b>
            </div>
            {Array.from({ length: t.lockedInTop }, (_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#dccba6] px-1 py-2 text-foreground-muted"
              >
                <small className="whitespace-nowrap text-[10px]">열면 보여요</small>
                <b className="text-base">
                  <Icon name="lock" />
                </b>
              </div>
            ))}
          </div>
        )}
        <p className="flex gap-1.5 text-sm leading-relaxed text-foreground">
          <Icon name="bulb" className="mt-0.5 shrink-0" />
          <span>{t.top.tip}</span>
        </p>
        <p className="flex gap-1.5 text-xs leading-relaxed text-foreground-muted">
          <Icon name="lock" className="mt-0.5 shrink-0" />
          <span>{t.top.month}월의 재물·가족 이야기와 나머지 날짜는 열두 달 풀이에서 알려드려요</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.year}년 열두 달 흐름</span>
        <div
          className="flex h-28 items-end justify-between gap-1"
          role="img"
          aria-label={`흐름이 좋은 달: ${monthList(t.best)}`}
        >
          {t.bars.map((b) => (
            <div key={b.m} className="flex h-full flex-1 flex-col items-center gap-1">
              <span className="h-3 text-[10px] leading-3 text-accent-gold-soft">{bestSet.has(b.m) ? "★" : ""}</span>
              <span className="flex w-full flex-1 items-end rounded-sm bg-[#f1ebdf]">
                <span
                  className={`w-full rounded-sm ${bestSet.has(b.m) ? "bg-[#b8955a]" : "bg-[#c9cfdc]"}`}
                  style={{ height: `${b.h}%` }}
                />
              </span>
              <span className="text-[11px] text-foreground-muted">{b.m}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground">
          흐름이 좋은 달은 <b className="text-accent-gold-soft">{monthList(t.best)}</b>이에요
        </p>
        {t.moneyMonths.length > 0 && (
          <p className="flex gap-1.5 text-sm text-foreground">
            <Icon name="coin" className="mt-0.5 shrink-0" />
            {/* 2026-11-23: 재물 달까지 다 알려 주면 궁금한 게 남지 않는다(미리보기 뒤 결제 시도 14 → 1). 몇 번인지만 알리고 잠근다. */}
            <span>
              재물이 들어오는 달 <b className="text-accent-gold-soft">{t.moneyMonths.length}번</b>은 열두 달 풀이에서 알려드려요
            </span>
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2.5 border-t border-[#e8dfcc] pt-4">
        {[
          [`내게 좋은 날 ${t.totalGoodDays}일`, "달마다 날짜와 요일까지 알려드려요"],
          ["달마다 재물 · 가족 · 할 일", "열두 달 모두, 그 달 이름과 함께"],
          ["내 사주로 쓴 총평", "분기별 키워드와 실천 조언까지"],
        ].map(([title, sub]) => (
          <li key={title} className="flex gap-2.5">
            <Icon name="check" className="mt-1 shrink-0 text-accent-gold-soft" />
            <span className="flex flex-col">
              <b className="text-base text-foreground">{title}</b>
              <span className="text-sm text-foreground-muted">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
