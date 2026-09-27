"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";

// 빈 입력창 앞에서 뭘 써야 할지 막혀 그냥 나가는 경우가 많아, 눌러서 넣을 수 있는 문구를
// 준다. 누른 뒤 자유롭게 고칠 수 있고, 만족했을 때(4점 이상)만 보여준다 — 불만족 후기를
// 좋은 문구로 유도하면 안 되기 때문이다.
const QUICK_PHRASES = [
  "생각보다 훨씬 자세해요",
  "제 얘기 같아서 놀랐어요",
  "연애운이 제일 와닿았어요",
  "재물운 조언이 도움 됐어요",
  "올해 흐름을 미리 알아서 좋아요",
];

/** 결제 완료(PAID) 화면에서만 렌더링된다 — paymentId 자체가 구매 증명이다. 별점을 먼저
 * 한 번만 누르게 하고, 누른 뒤에야 글쓰기 칸을 보여줘서 시작 부담을 줄인다. */
export function ReviewForm({ paymentId }: { paymentId: string }) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4 text-center text-sm text-accent-gold-soft">
        소중한 후기 감사합니다 🙏
      </div>
    );
  }

  function addPhrase(phrase: string) {
    setContent((prev) => (prev.trim() ? `${prev.trim()} ${phrase}` : phrase));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, rating, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "후기 등록에 실패했습니다.");
      }
      trackEvent("review_submit", { rating });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "후기 등록 중 오류가 발생했습니다.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-lg text-accent-gold-soft">리포트, 어떠셨어요?</h3>
        <p className="text-xs text-foreground-muted">별점만 먼저 눌러주세요. 다음에 볼 분들께 큰 도움이 돼요.</p>
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            aria-label={`${n}점`}
            className={`text-3xl leading-none ${n <= rating ? "text-accent-gold" : "text-foreground-muted/30"}`}
          >
            ★
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          {rating >= 4 && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => addPhrase(phrase)}
                  className="rounded-full border border-border-subtle bg-background-elevated/60 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent-gold"
                >
                  + {phrase}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              rating >= 4
                ? "위 문구를 누르거나 직접 써주세요 (개인정보나 링크는 빼주세요)"
                : "아쉬웠던 점을 알려주시면 고쳐볼게요 (개인정보나 링크는 빼주세요)"
            }
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
          />

          {errorMessage && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-xl bg-accent-gold px-4 py-2.5 text-center text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "submitting" ? "등록 중..." : "후기 남기기"}
          </button>
        </>
      )}
    </form>
  );
}
