"use client";

import Link from "next/link";

/** 상담 상품 결제 직전 청약철회 제한 안내와 동의(전자상거래법 제17조 제2항 제5호·제6항, 기본 해제·체크해야 결제 가능).
 * 문구는 /refund 3항(AI 사주 상담권)과 같은 기준이다. 서버(/api/orders)도 refundConsent=true가 없으면 주문을 만들지 않는다. */
export function ConsultConsent({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-subtle bg-background-card/60 px-3.5 py-3 text-sm leading-relaxed text-foreground-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-[#d4af37]"
      />
      <span>
        <strong className="text-foreground">(필수)</strong> 결제 즉시 제공이 시작되는 디지털 콘텐츠예요.{" "}
        <strong className="text-foreground">열어 본 리포트와 이미 사용한 질문·이용일수는 환불(청약철회)되지 않는다</strong>는 점을
        확인했어요(전자상거래법 제17조 제2항 제5호). 쓰지 않은 질문권은 결제 후 7일 안에 환불돼요.{" "}
        <Link href="/refund" target="_blank" className="underline underline-offset-4 hover:text-accent-gold-soft">
          환불정책 보기
        </Link>
      </span>
    </label>
  );
}
