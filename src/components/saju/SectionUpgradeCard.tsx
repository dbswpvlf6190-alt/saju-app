"use client";

import { useState } from "react";
import type { PremiumSection } from "@/lib/saju";
import { SECTION_UPGRADE_PRICE_KRW } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";

type Status = "idle" | "processing" | "error";

/**
 * 1가지(1,900원)를 산 사람에게 나머지 4가지를 차액(3,000원)으로 여는 카드. NewYearUpsellCard와 같은
 * 원칙으로 방금 입력한 결제 정보를 재사용해 버튼 한 번으로 결제창을 띄운다. 차액 주문은 서버가 원래
 * 주문(parentPaymentId)의 생년월일을 그대로 쓰므로 여기서 생년월일을 보내지 않는다(orders/route.ts).
 */
export function SectionUpgradeCard({
  parentPaymentId,
  lockedSections,
  fullName: initialFullName,
  email: initialEmail,
  phoneNumber: initialPhoneNumber,
  onPaid,
  beforePay,
}: {
  parentPaymentId: string;
  lockedSections: PremiumSection[];
  fullName: string;
  email: string;
  phoneNumber: string;
  onPaid: (upgradePaymentId: string) => Promise<void>;
  /** 모바일 결제창 리디렉션 복귀 때 결과 화면을 되살릴 수 있게 저장해 둔다(SajuFlow의 pendingPurchase). */
  beforePay?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"CARD" | "EASY_PAY">("CARD");
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const needsContactInfo = !initialEmail || !initialPhoneNumber || !initialFullName.trim();

  async function handlePurchase() {
    trackEvent("checkout_start", { productType: "section_upgrade" });
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setStatus("error");
      setErrorMessage("결제 연동 준비중이에요.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus("error");
      setErrorMessage("결제 확인 메일을 받을 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!/^01[0-9]{8,9}$/.test(phoneNumber.replace(/-/g, ""))) {
      setStatus("error");
      setErrorMessage("휴대폰 번호를 '-' 없이 정확히 입력해 주세요. (예: 01012345678)");
      return;
    }
    if (!fullName.trim()) {
      setStatus("error");
      setErrorMessage("결제자 이름을 입력해 주세요.");
      return;
    }

    setStatus("processing");
    setErrorMessage(null);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: "section_upgrade", parentPaymentId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "주문 생성에 실패했습니다.");

      beforePay?.();
      const { requestPayment } = await import("@portone/browser-sdk/v2");
      const response = await requestPayment({
        storeId,
        channelKey,
        paymentId: order.paymentId,
        orderName: order.orderName,
        totalAmount: order.amount,
        currency: "KRW",
        payMethod,
        ...(payMethod === "EASY_PAY" ? { easyPay: { easyPayProvider: "KAKAOPAY" } } : {}),
        customer: { email, phoneNumber: phoneNumber.replace(/-/g, ""), fullName: fullName.trim() },
        redirectUrl: window.location.href.split("?")[0],
      });
      if (!response || response.code) throw new Error(response?.message ?? "결제가 취소되었습니다.");

      const completeRes = await fetch(`/api/orders/${encodeURIComponent(response.paymentId)}/complete`, { method: "POST" });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error ?? "결제 확인에 실패했습니다.");
      trackEvent("payment_success", { productType: "section_upgrade" });
      await onPaid(response.paymentId);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "결제 중 오류가 발생했습니다.");
      trackEvent("payment_fail", { productType: "section_upgrade" });
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4">
      <div className="flex flex-col gap-1 text-center">
        <strong className="text-sm text-accent-gold-soft">나머지 {lockedSections.length}가지도 이어서 볼까요?</strong>
        <span className="text-xs text-foreground-muted">이미 낸 1,900원은 빼고, 차액만 내면 돼요</span>
      </div>
      <ul className="flex flex-wrap justify-center gap-1.5">
        {lockedSections.map((s) => (
          <li key={s.key} className="rounded-full border border-border-subtle px-3 py-1 text-xs text-foreground-muted">
            🔒 {s.title}
          </li>
        ))}
      </ul>

      {needsContactInfo && (
        <div className="flex flex-col gap-2">
          <input type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="결제자 이름"
            className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent-gold" />
          <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent-gold" />
          <input type="tel" autoComplete="tel" inputMode="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="01012345678"
            className="w-full rounded-lg border border-border-subtle bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-accent-gold" />
        </div>
      )}

      <div className="flex justify-center gap-2">
        {([
          ["CARD", "카드"],
          ["EASY_PAY", "카카오페이"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPayMethod(value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              payMethod === value ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft" : "border-border-subtle text-foreground-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errorMessage && <p className="text-center text-xs text-red-300">{errorMessage}</p>}

      <button
        type="button"
        onClick={() => void handlePurchase()}
        disabled={status === "processing"}
        className="min-h-12 rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "processing" ? "처리 중..." : `+${SECTION_UPGRADE_PRICE_KRW.toLocaleString()}원으로 나머지 ${lockedSections.length}가지 열기`}
      </button>
    </div>
  );
}
