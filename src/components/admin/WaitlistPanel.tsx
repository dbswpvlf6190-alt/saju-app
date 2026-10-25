"use client";

import { useState } from "react";

/** 결제 오픈 알림 대기자. 결제가 열린 날 이메일을 한 번에 복사해 숨은참조(BCC)로 안내 메일을 보내고, 보낸 뒤 목록을 지운다. */
export function WaitlistPanel({ count }: { count: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function copyAll() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/waitlist");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오지 못했어요.");
      await navigator.clipboard.writeText((data.emails as string[]).join(", "));
      setMessage(`${data.emails.length}개 이메일을 복사했어요. 메일의 숨은참조(BCC)에 붙여 넣으세요.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "복사하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function purge() {
    if (!window.confirm("안내 메일을 모두 보냈나요? 대기자 이메일을 전부 삭제합니다. 되돌릴 수 없어요.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/waitlist", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제하지 못했어요.");
      setMessage(`${data.deleted}건을 삭제했어요. 새로고침하면 반영돼요.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "삭제하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-accent-gold-soft">결제 오픈 알림 대기자</h2>
        <span className="text-sm text-foreground-muted">{count}명</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={() => void copyAll()}
          className="rounded-xl border border-accent-gold px-3 py-2 text-sm text-accent-gold-soft disabled:opacity-40"
        >
          이메일 전체 복사
        </button>
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={() => void purge()}
          className="rounded-xl border border-border-subtle px-3 py-2 text-sm text-foreground-muted disabled:opacity-40"
        >
          안내 메일 보냄 · 목록 삭제
        </button>
      </div>
      {message && <p className="text-xs text-foreground-muted">{message}</p>}
    </div>
  );
}
