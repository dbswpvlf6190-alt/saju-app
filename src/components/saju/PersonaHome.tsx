"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SajuFlow } from "./SajuFlow";
import type { ReviewItem } from "./ReviewList";

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
export function PersonaHome({ reviews }: { reviews: ReviewItem[] }) {
  const [focus, setFocus] = useState<Focus | null>(null);
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

        {focus === null ? (
          <>
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
                🔮 <strong className="text-accent-gold-soft">{FOCUS_LABEL[focus]}</strong>부터 먼저
                보여드릴게요
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
