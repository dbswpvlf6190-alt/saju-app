"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductType } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";
import { firstSource } from "@/lib/analytics/source";

/**
 * 결제 일시 중단(PAYMENTS_PAUSED, 카드사 심사 중) 동안 결제 폼 대신 보여주는 "결제 오픈 알림 받기".
 * 사려던 사람이 그냥 떠나지 않게 이메일을 남기게 한다. 이메일은 오픈 안내 1회에만 쓰고 지운다.
 */
export function PaymentWaitlist({ productType, title }: { productType: ProductType; title: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("waitlist_view", { productType });
  }, [productType]);

  async function submit() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("이메일 주소를 정확히 입력해 주세요.");
      return;
    }
    if (!consent) {
      setError("알림 발송을 위한 이메일 수집에 동의해 주세요.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), productType, consent: true, src: firstSource() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "신청을 저장하지 못했어요.");
      trackEvent("waitlist_signup", { productType });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "신청을 저장하지 못했어요.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col gap-1 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4 text-center">
        <strong className="text-sm text-accent-gold-soft">알림 신청 완료 🔔</strong>
        <p className="text-xs text-foreground-muted">결제가 열리면 {email.trim()}로 가장 먼저 알려드릴게요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4">
      <div className="flex flex-col gap-1 text-center">
        <strong className="text-sm text-accent-gold-soft">{title} 결제를 여는 중이에요</strong>
        <p className="text-xs leading-relaxed text-foreground-muted">
          카드사 심사가 끝나는 대로 결제가 열려요. 이메일을 남겨주시면 열리는 날 가장 먼저 알려드릴게요.
        </p>
      </div>
      <input
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
      />
      <label className="flex items-start gap-2 text-xs leading-relaxed text-foreground-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          (필수) 결제 오픈 안내 메일 발송을 위해 이메일을 수집해요. 안내 1회 후 바로 삭제하고, 늦어도 3개월 안에
          삭제해요.{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            개인정보처리방침
          </Link>
        </span>
      </label>
      {error && <p className="text-center text-xs text-red-300">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={status === "saving"}
        className="min-h-12 rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "saving" ? "신청 중..." : "🔔 결제 열리면 알림 받기"}
      </button>
    </div>
  );
}
