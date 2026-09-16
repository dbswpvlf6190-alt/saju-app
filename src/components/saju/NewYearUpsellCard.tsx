"use client";

import { useState } from "react";
import type { SajuResult } from "@/lib/saju";
import { resultToInput } from "@/lib/saju/types";
import { NEW_YEAR_REPORT_NAME, NEW_YEAR_REPORT_PRICE_KRW } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";

type Status = "teaser" | "processing" | "unlocked" | "error";

/**
 * 결제 완료(4,900원 상세 리포트 언락) 화면 하단에만 노출되는 시즌 업셀. 이미 결제를 마친
 * 사람만 보는 카드라 email/phone/fullName을 다시 묻지 않고 PremiumUnlock에서 이미 받은
 * 값을 그대로 넘겨받아 바로 결제창을 띄운다 — 업셀은 클릭~결제 사이 마찰이 클수록 전환이
 * 떨어지므로, 폼 재입력 없이 버튼 한 번으로 끝나게 하는 게 핵심이다.
 */
export function NewYearUpsellCard({
  result,
  fullName: initialFullName,
  email: initialEmail,
  phoneNumber: initialPhoneNumber,
}: {
  result: SajuResult;
  fullName: string;
  email: string;
  phoneNumber: string;
}) {
  const [status, setStatus] = useState<Status>("teaser");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"CARD" | "EASY_PAY">("CARD");
  // 기본 리포트를 결제로 산 사람은 이 값들이 이미 채워져 있어 바로 결제창으로 간다. 쿠폰으로
  // 무료 리포트를 받은 사람(email/phone을 물어본 적이 없음)은 이 카드에서 처음으로 결제
  // 정보를 받아야 해서, 비어있을 때만 입력란을 보여준다.
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const needsContactInfo = !initialEmail || !initialPhoneNumber || !initialFullName.trim();

  async function fetchReport(paymentId: string) {
    const res = await fetch(`/api/orders/${encodeURIComponent(paymentId)}`);
    const data = await res.json();
    if (data.sections?.newYear) {
      setText(data.sections.newYear);
      setStatus("unlocked");
      return;
    }
    throw new Error(data.error ?? "신년운세를 불러오지 못했습니다.");
  }

  async function handlePurchase() {
    trackEvent("checkout_start", { productType: "new_year_report" });
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
        body: JSON.stringify({ productType: "new_year_report", birthInput: resultToInput(result) }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(order.error ?? "주문 생성에 실패했습니다.");
      }

      // 참고: 기본 리포트 구매(PremiumUnlock)와 달리 이 업셀은 모바일 리디렉션 결제창 복귀를
      // 지원하지 않는다 — SajuFlow의 복귀 로직이 "saju:pendingPurchase" 키 하나로 기본
      // 리포트 재개만 처리하고, 이 카드가 뜨는 시점엔 그 키가 이미 지워져 있어 안전하게
      // no-op으로 끝난다(잘못된 데이터를 보여주진 않지만, 리디렉션이 필요한 결제수단에서는
      // 결제 후 자동으로 열리지 않을 수 있다).
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

      if (!response || response.code) {
        throw new Error(response?.message ?? "결제가 취소되었습니다.");
      }

      const completeRes = await fetch(`/api/orders/${encodeURIComponent(response.paymentId)}/complete`, {
        method: "POST",
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error ?? "결제 확인에 실패했습니다.");
      }
      trackEvent("payment_success", { productType: "new_year_report" });

      await fetchReport(response.paymentId);
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "결제 중 오류가 발생했습니다.");
      trackEvent("payment_fail", { productType: "new_year_report" });
    }
  }

  if (status === "unlocked" && text) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(200,98,63,0.4)] bg-[rgba(200,98,63,0.1)] p-4">
        <h3 className="font-medium text-[#e8a37f]">🎍 {NEW_YEAR_REPORT_NAME}</h3>
        <p className="whitespace-pre-line leading-relaxed text-foreground">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(200,98,63,0.4)] bg-[rgba(200,98,63,0.1)] p-4 text-center">
      <strong className="text-sm text-[#e8a37f]">{NEW_YEAR_REPORT_NAME}도 궁금하다면</strong>
      <span className="text-xs text-foreground-muted">
        지금 리포트에 이어서, 새해 흐름만 따로 더 자세히 — 상반기·하반기 흐름과 조심할 시기까지
      </span>

      {needsContactInfo && (
        <div className="flex flex-col gap-2 text-left">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="결제자 이름"
            className="w-full rounded-lg border border-[rgba(200,98,63,0.3)] bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-[#c8623f]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[rgba(200,98,63,0.3)] bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-[#c8623f]"
          />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="01012345678"
            className="w-full rounded-lg border border-[rgba(200,98,63,0.3)] bg-background-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-[#c8623f]"
          />
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
              payMethod === value
                ? "border-[#c8623f] bg-[rgba(200,98,63,0.2)] text-[#e8a37f]"
                : "border-[rgba(200,98,63,0.3)] text-foreground-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errorMessage && <p className="text-xs text-red-300">{errorMessage}</p>}

      <button
        type="button"
        onClick={() => void handlePurchase()}
        disabled={status === "processing"}
        className="rounded-xl bg-[#c8623f] px-4 py-2.5 text-center text-sm font-semibold text-[#1a0f0a] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "processing" ? "처리 중..." : `+${NEW_YEAR_REPORT_PRICE_KRW.toLocaleString()}원으로 신년운세 추가`}
      </button>
    </div>
  );
}
