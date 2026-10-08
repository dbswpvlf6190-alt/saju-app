"use client";

import { useEffect, useState } from "react";

/** 결제 직후 리포트를 쓰는 동안 보여주는 진행 안내. 한 장에 20~45초가 걸려서, 안내가 없으면 화면이 멈춘 것처럼 보인다. */
export function ReportProgress({ total, done }: { total: number; done: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const percent = Math.max(6, Math.round((done / Math.max(total, 1)) * 100));
  const slow = seconds >= 60;

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent-gold/30 border-t-accent-gold" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold text-foreground">결제가 완료됐어요. 리포트를 쓰고 있어요 ✍️</span>
          <span className="text-xs text-foreground-muted">보통 30~60초 걸려요. 이 화면을 닫지 말고 잠시만 기다려 주세요.</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-background-elevated">
          <div className="h-full rounded-full bg-accent-gold transition-all duration-700" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-right text-xs text-accent-gold-soft">
          {done}/{total}장 완성
        </span>
      </div>
      {slow && (
        <p className="text-xs leading-relaxed text-foreground-muted">
          평소보다 조금 오래 걸리고 있어요. 계속 쓰고 있으니 기다려 주세요. 화면을 닫아도 결제는 그대로 유지되고, 나중에 &lsquo;내 구매내역&rsquo;에서 다시 열 수 있어요.
        </p>
      )}
    </div>
  );
}
