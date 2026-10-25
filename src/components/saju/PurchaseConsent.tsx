"use client";

import Link from "next/link";

/** 결제 직전 청약철회(환불) 안내와 동의. 디지털 콘텐츠는 열람하면 청약철회가 제한될 수 있어 결제 전에 알리고 동의를 받는다.
 * 문구는 /refund(환불정책)와 같은 기준이다 — 미열람 7일 이내 전액 환불, 열람 후에는 제한될 수 있음. */
export function PurchaseConsent({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border-subtle bg-background-card/60 px-3 py-2.5 text-xs leading-relaxed text-foreground-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37]"
      />
      <span>
        <strong className="text-foreground">(필수)</strong> 결제 즉시 제공되는 디지털 콘텐츠예요. 리포트를 열람하기 전에는 결제 후 7일 안에 환불할 수 있고,
        열람한 뒤에는 청약철회가 제한될 수 있다는 점을 확인했어요.{" "}
        <Link href="/refund" target="_blank" className="underline underline-offset-4 hover:text-accent-gold-soft">
          환불정책 보기
        </Link>
      </span>
    </label>
  );
}
