"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminReviewToggle({ id, visible }: { id: string; visible: boolean }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft disabled:opacity-50"
    >
      {pending ? "처리 중..." : visible ? "숨기기" : "다시 노출"}
    </button>
  );
}
