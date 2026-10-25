"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { SajuFlow } from "./SajuFlow";
import type { ReviewItem } from "./ReviewList";
import { focusBannerParts } from "@/lib/saju/focusCopy";
import { reportV2Enabled } from "@/lib/reports/manualChapters";

type Focus = "wealth" | "love";

const FOCUS_LABEL: Record<Focus, string> = {
  wealth: "재물운",
  love: "연애운",
};

/** 홈 화면 진입점. "사주팔자"라는 단어보다 "지금 뭐가 궁금한지"를 먼저 물어서, 사주에
 * 거부감이 있는 사람도 자기 고민을 통해 자연스럽게 들어오게 한다(자기 관련성 효과).
 * 재미/수험생 선택은 이미 있는 전용 랜딩(/type-test, /exam-luck)으로 바로 이동하고,
 * 돈/연애 선택은 같은 무료 사주 결과에서 해당 항목을 맨 위로 올려서 보여준다 — 계산이나
 * 상품 구성은 그대로고, 노출 순서만 바뀐다(ResultView의 focus prop). */
export interface ExamBadge {
  kind: string;
  href: string;
  label: string;
  dday: string;
}

export function PersonaHome({ reviews, examBadges = [] }: { reviews: ReviewItem[]; examBadges?: ExamBadge[] }) {
  const [focus, setFocus] = useState<Focus | null>(null);
  // 2026-10-24 사이트 유입 분석: 손님의 73%가 Threads("생일만 적어주면 ○○ 알려줄게" 글)에서 오는데, 첫 화면이
  // "궁금한 게 뭐예요?" 고르기부터라 약속과 어긋나 41명 중 32명이 생일을 안 넣고 나갔다. ref=threads*로 오면
  // 고르기 대신 약속한 화면(생일 입력 → 2027년·좋은 해)으로 바로 안내한다. 판정: 첫 화면→생일 입력 22% → 40%(10/31).
  const [fromThreads, setFromThreads] = useState(false);
  // SajuFlow(자식)의 useEffect가 방문 기록 뒤 주소창의 ?ref=를 지우므로, 그보다 먼저 도는 layout effect에서 읽는다.
  useLayoutEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref") ?? "";
    // 주소창 값은 첫 렌더 뒤에만 읽을 수 있어(서버 렌더와 맞추려고) 효과 안에서 한 번만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ref.startsWith("threads")) setFromThreads(true);
  }, []);
  // 배너 문구(focus가 있을 때만 화면에 쓰인다)
  const banner = focusBannerParts(focus ?? "wealth", FOCUS_LABEL[focus ?? "wealth"], reportV2Enabled());
  const formRef = useRef<HTMLDivElement>(null);

  function choose(next: Focus) {
    setFocus(next);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
          SAJU LAB
        </span>

        {focus === null && fromThreads ? (
          <>
            <h1 className="font-serif text-3xl leading-snug text-foreground">
              생일만 넣으면
              <br />
              2027년·좋은 해가 바로 나와요
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
              Threads에서 본 그 풀이를 여기선 여덟 글자·오행 비율까지 30초면 무료로 볼 수 있어요. 가입 없이 바로.
            </p>
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="mt-1 w-full max-w-xs rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              생일 넣고 바로 보기 ↓
            </button>
            <button
              type="button"
              onClick={() => setFromThreads(false)}
              className="text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft"
            >
              돈·연애·궁합 중에서 골라 보고 싶다면
            </button>
          </>
        ) : focus === null ? (
          <>
            {/* 시험 시즌에만 보이는 배너. 홈에서는 수능 페이지로만 가는 버튼이 있어서 임용 페이지로 가는
                길이 없었다 — 시즌 동안은 두 시험을 맨 위에서 바로 고르게 한다. */}
            {examBadges.length > 0 && (
              <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-sky-300/40 bg-sky-300/10 p-3">
                <span className="text-xs font-medium text-sky-200">📚 시험 시즌 · 무료 합격운 흐름</span>
                <div className="grid grid-cols-2 gap-2">
                  {examBadges.map((b) => (
                    <Link
                      key={b.kind}
                      href={b.href}
                      className="flex flex-col items-center gap-0.5 rounded-xl border border-sky-300/50 bg-background/40 px-2 py-2.5 transition-colors hover:border-sky-300"
                    >
                      <strong className="font-serif text-base tabular-nums text-sky-200">{b.dday}</strong>
                      <span className="text-xs font-medium text-foreground">{b.label} →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <h1 className="font-serif text-3xl leading-snug text-foreground">
              지금 가장
              <br />
              궁금한 게 뭐예요?
            </h1>
            <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
              생년월일시 하나로, 지금 궁금한 것부터 무료로 확인해보세요.
            </p>

            <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => choose("wealth")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border-subtle px-3 py-5 text-sm font-medium text-foreground transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
              >
                <span className="text-xl">💰</span>
                돈 문제가
                <br />
                궁금해요
              </button>
              <button
                type="button"
                onClick={() => choose("love")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border-subtle px-3 py-5 text-sm font-medium text-foreground transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
              >
                <span className="text-xl">❤️</span>
                연애가
                <br />
                궁금해요
              </button>
              <Link
                href="/type-test"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border-subtle px-3 py-5 text-sm font-medium text-foreground transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
              >
                <span className="text-xl">😂</span>
                그냥
                <br />
                재미로요
              </Link>
              <Link
                href="/exam-luck"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border-subtle px-3 py-5 text-sm font-medium text-foreground transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
              >
                <span className="text-xl">📚</span>
                수험생
                <br />
                이에요
              </Link>
            </div>

            <Link
              href="/compatibility"
              className="mt-1 text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft"
            >
              이미 만나는 사람과 궁합이 궁금하다면 → 궁합 보기
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl leading-snug text-foreground">
              생년월일시로 읽는
              <br />
              나의 사주팔자
            </h1>
            <div className="flex items-center gap-2 rounded-xl border border-accent-gold/40 bg-accent-gold/10 px-4 py-2 text-sm text-foreground">
              <span>
                {banner.head}
                <strong className="text-accent-gold-soft">{banner.label}</strong>
                {banner.tail}
              </span>
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="shrink-0 text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft"
              >
                다시 고르기
              </button>
            </div>
          </>
        )}
      </main>

      <div id="saju-form" ref={formRef} className="mt-10 w-full max-w-md scroll-mt-10">
        {/* 후기는 결과 화면 안에서 4,900원 상세 분석 가치·CTA 바로 다음(구매 판단 시점)에
            노출한다 — SajuFlow → ResultView로 그대로 내려보내고 페이지 레벨에서는 더 렌더링하지 않는다. */}
        <SajuFlow reviews={reviews} focus={focus ?? undefined} />
      </div>
    </>
  );
}
