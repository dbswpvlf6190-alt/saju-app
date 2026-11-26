"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { trackEvent } from "@/lib/analytics/track";
import type { NewYearTeaser } from "@/lib/newYear/preview";

// 웹 /new-year 결제 전 미리보기(2026-11-17). 토스 v11 카드(구매 버튼 클릭 10배)를 웹 테마로 옮겼다.
// 손님(네이버 블로그·검색, 50대 이상 여성 다수)이 결제를 망설이는 이유: ① 내용을 미리 못 봄 ② 무엇을 사는지 모름 ③ 믿음.
// 2026-11-23: 그래프·좋은 달 목록·재물 달·그 달 조언까지 보여 주자 "음, 알겠다" 하고 결제 시도가 14번 → 1번으로 줄었다.
// 그래서 지금은 한 해 이름 → 좋은 날 하루만 공개(몇 일 중 1일인지) → 열두 달은 잠금(좋은 달·재물 달은 개수만) → 받는 것 숫자.
// 놓치면 아까운 것은 정직하게 보여 주되, 쓰지 않음: 겁주기·건강·단정·가짜 마감·가짜 후기·흐리게 가린 가짜 글자.

/** 입춘 날짜(한국 시간). 미리보기 대상 해만 적는다. */
const IPCHUN: Record<number, string> = { 2027: "2월 4일" };

export function NewYearTeaserCard({ teaser, name }: { teaser: NewYearTeaser; name: string }) {
  const t = teaser;
  const restDays = Math.max(0, t.totalGoodDays - (t.freeDay ? 1 : 0));

  useEffect(() => {
    trackEvent("ny_teaser_view", { top: t.top.month, goodDays: t.totalGoodDays });
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
        <span className="text-sm font-medium text-accent-gold-soft">
          {t.freeDay ? `★ 내게 좋은 날 ${t.totalGoodDays}일 중 1일만 먼저 알려드려요` : `★ 흐름이 가장 좋은 달은 ${t.top.month}월이에요`}
        </span>
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
          <Icon name="lock" className="mt-0.5 shrink-0" />
          <span>
            이 날 무엇을 하면 좋은지{restDays > 0 ? `, 나머지 좋은 날 ${restDays}일` : ""}은 열두 달 풀이에서 알려드려요
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.year}년 열두 달</span>
        <div className="grid grid-cols-6 gap-1.5" role="img" aria-label={`${t.top.month}월만 열려 있고 나머지 열한 달은 잠겨 있어요`}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) =>
            m === t.top.month ? (
              <span
                key={m}
                className="flex flex-col items-center rounded-lg border border-[#b8955a] bg-[#f3eee4] py-1.5 text-accent-gold-soft"
              >
                <small className="text-[10px] leading-3">★</small>
                <b className="text-sm">{m}월</b>
              </span>
            ) : (
              <span
                key={m}
                className="flex flex-col items-center rounded-lg border border-dashed border-[#dccba6] py-1.5 text-foreground-muted"
              >
                <small className="text-[10px] leading-3">
                  <Icon name="lock" />
                </small>
                <b className="text-sm font-normal">{m}월</b>
              </span>
            ),
          )}
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          흐름이 좋은 달 <b className="text-accent-gold-soft">{t.bestCount}번</b>
          {t.moneyCount > 0 && (
            <>
              , 재물이 들어오는 달 <b className="text-accent-gold-soft">{t.moneyCount}번</b>
            </>
          )}
          이 있어요. 어느 달인지는 열면 보여요.
        </p>
        {IPCHUN[t.year] && (
          <p className="flex gap-1.5 text-sm leading-relaxed text-foreground-muted">
            <Icon name="bell" className="mt-0.5 shrink-0" />
            <span>
              {t.year}년 운은 입춘({IPCHUN[t.year]})부터 시작돼요. 미리 알아 두면 첫 달부터 챙길 수 있어요.
            </span>
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2.5 border-t border-[#e8dfcc] pt-4">
        {[
          [`내게 좋은 날 ${t.totalGoodDays}일`, "달마다 날짜와 요일, 그날 해 보면 좋은 일까지"],
          ["열두 달 풀이", "달마다 흐름과 재물 · 가족 · 할 일을 한 문단씩"],
          ["다섯 가지 영역 풀이", "일 · 돈 · 가족 · 인연 · 이사와 계약"],
          ["총평과 분기별 실천 계획", "내 사주가 2027년을 받는 방식부터, 약 7,000자"],
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
