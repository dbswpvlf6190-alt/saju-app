"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 인스타 추첨 이벤트용 무료 리포트 코드를 발급한다. 발급 직후에는 화면에 코드를 그대로
 * 보여줘서, 사장님이 바로 복사해 당첨자 DM으로 보낼 수 있게 한다(DB 조회 없이도 되는 용도). */
export function CouponIssuer() {
  const [count, setCount] = useState(5);
  const [pending, setPending] = useState(false);
  const [issuedCodes, setIssuedCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const router = useRouter();

  async function handleCopy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      // 클립보드 권한이 없어도 코드 자체는 화면에 그대로 보이니 복사만 못 할 뿐 문제 없다.
    }
  }

  async function handleIssue() {
    setPending(true);
    setError(null);
    setIssuedCodes(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "쿠폰 발급에 실패했습니다.");
      setIssuedCodes(data.codes);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "쿠폰 발급 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="coupon-count" className="text-sm text-foreground-muted">
          발급 개수
        </label>
        <input
          id="coupon-count"
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-20 rounded-lg border border-border-subtle bg-background-elevated px-2 py-1.5 text-sm text-foreground outline-none focus:border-accent-gold"
        />
        <button
          type="button"
          onClick={handleIssue}
          disabled={pending}
          className="rounded-lg border border-accent-gold px-3 py-1.5 text-sm font-medium text-accent-gold-soft transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "발급 중..." : "새 쿠폰 발급"}
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {issuedCodes && issuedCodes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-foreground-muted">발급된 코드 — 눌러서 복사, 당첨자 DM으로 전달해 주세요.</p>
          <div className="flex flex-col gap-2">
            {issuedCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => void handleCopy(code)}
                className="flex items-center justify-between rounded-xl border border-accent-gold/50 bg-background-elevated px-4 py-3 text-left transition-colors hover:border-accent-gold"
              >
                <span className="font-mono text-xl font-bold tracking-wide text-foreground">{code}</span>
                <span className="shrink-0 text-xs text-accent-gold-soft">
                  {copiedCode === code ? "복사됨!" : "복사"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
