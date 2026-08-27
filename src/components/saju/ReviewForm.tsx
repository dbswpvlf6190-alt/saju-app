"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics/track";

/** 결제 완료(PAID) 화면에서만 렌더링된다 — paymentId 자체가 구매 증명이다. */
export function ReviewForm({ paymentId }: { paymentId: string }) {
  const [rating, setRating] = useState(5);
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
      className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4"
    >
      <h3 className="text-sm font-medium text-foreground-muted">이 리포트는 어떠셨나요?</h3>

      <div className="flex gap-1" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n}점`}
            className={`text-2xl leading-none ${n <= rating ? "text-accent-gold" : "text-foreground-muted/30"}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="솔직한 후기를 남겨주세요 (개인정보나 링크는 포함하지 말아 주세요)"
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
        className="rounded-xl border border-accent-gold px-4 py-2.5 text-center text-sm font-semibold text-accent-gold-soft transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "submitting" ? "등록 중..." : "후기 남기기"}
      </button>
    </form>
  );
}
