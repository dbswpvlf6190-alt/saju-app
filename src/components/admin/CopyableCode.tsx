"use client";

import { useState } from "react";

/** 클릭하면 클립보드에 복사되는 코드 텍스트. 쿠폰 코드처럼 다른 곳(DM 등)에 그대로
 * 옮겨 붙일 일이 많은 값을 표에서 바로 복사할 수 있게 한다. */
export function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없어도 코드 자체는 화면에 그대로 보이니 복사만 못 할 뿐 문제 없다.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="font-mono text-base font-bold tracking-wide text-foreground transition-colors hover:text-accent-gold-soft"
    >
      {copied ? "복사됨!" : code}
    </button>
  );
}
