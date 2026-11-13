"use client";

import { useState } from "react";
import type { SajuResult } from "@/lib/saju";
import { resultToInput } from "@/lib/saju/types";
import { NEW_YEAR_REPORT_NAME, NEW_YEAR_REPORT_PRICE_KRW, PAYMENTS_PAUSED } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";
import { PurchaseConsent } from "./PurchaseConsent";
import { NewYearReportText } from "./NewYearReportText";
import { Icon } from "@/components/ui/Icon";
import { useUserAgent } from "@/lib/hooks/useUserAgent";
import {
  clipForLog,
  detectInAppBrowser,
  friendlyPaymentError,
  inAppHint,
  inAppPrepayHint,
  kakaoPayAvailable,
  isValidEmail,
  isValidPhone,
  needsFullContact,
  normalizePhone,
} from "@/lib/payment/checkoutEnv";
import { clearNewYearPending, saveNewYearPending } from "@/lib/newYear/pending";

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
  variant = "upsell",
  redirectPath,
}: {
  result: SajuResult;
  fullName: string;
  email: string;
  phoneNumber: string;
  /** "standalone"이면 /new-year 단독 구매 문구를 쓴다. 기본은 결제 완료 화면 하단 업셀. */
  variant?: "upsell" | "standalone";
  /** 모바일 결제창 리디렉션이 돌아올 경로(예: /new-year/return). 없으면 지금 페이지로 돌아온다. */
  redirectPath?: string;
}) {
  const [status, setStatus] = useState<Status>("teaser");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<"CARD" | "EASY_PAY">("CARD");
  // 기본 리포트를 결제로 산 사람은 이 값들이 이미 채워져 있어 바로 결제창으로 간다. 쿠폰으로
  // 무료 리포트를 받은 사람(email/phone을 물어본 적이 없음)은 이 카드에서 처음으로 결제
  // 정보를 받아야 해서, 비어있을 때만 입력란을 보여준다.
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const userAgent = useUserAgent();
  // 이니시스 모바일 결제창은 이름만 필수다(checkoutEnv.ts). 휴대폰에서는 휴대폰·이메일 칸을 아예 보여주지 않는다(11/12 첫 손님이 여기서 막힘).
  const fullContact = needsFullContact(userAgent);
  // PC 결제창은 카카오페이가 꺼져 있어(kakaoPayAvailable) 카드로만 받는다.
  const kakaoOk = kakaoPayAvailable(userAgent);
  const method = kakaoOk ? payMethod : "CARD";
  const inApp = detectInAppBrowser(userAgent);
  const askName = !initialFullName.trim();
  const askContact = fullContact && (!initialEmail || !initialPhoneNumber);

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

  function fail(message: string) {
    setStatus("error");
    setErrorMessage(message);
  }

  /** 결제창 실패·취소를 기록하고, 서버가 PortOne에 실제 상태를 물어 주문을 정리하게 한다(실패 사유가 서버 기록에 남는다). */
  function recordFailure(paymentId: string | null, where: string, code?: string, message?: string, pgCode?: string) {
    const msg = clipForLog(message);
    trackEvent("payment_fail", {
      productType: "new_year_report",
      where,
      ...(code && { code }),
      ...(pgCode && { pgCode }),
      ...(msg && { msg }),
    });
    if (paymentId) {
      fetch(`/api/orders/${encodeURIComponent(paymentId)}/complete`, { method: "POST" }).catch(() => {});
    }
  }

  async function handlePurchase() {
    if (!agreed) return;
    trackEvent("checkout_start", { productType: "new_year_report" });
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) return fail("결제 연동 준비중이에요.");

    const name = fullName.trim();
    const phone = normalizePhone(phoneNumber);
    const mail = email.trim();
    if (!name) return fail("결제하시는 분 이름을 넣어 주세요.");
    if (fullContact) {
      if (!isValidPhone(phone)) return fail("휴대폰 번호를 다시 확인해 주세요. (예: 010 1234 5678)");
      if (!isValidEmail(mail)) return fail("이메일 주소를 다시 확인해 주세요. (예: hong@naver.com)");
    }

    setStatus("processing");
    setErrorMessage(null);
    let paymentId: string | null = null;

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: "new_year_report", birthInput: resultToInput(result) }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(order.error ?? "주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
      paymentId = order.paymentId as string;

      // 모바일 결제창은 다른 페이지로 넘어갔다가 /new-year/return으로 돌아온다. 실패·취소로 돌아와도
      // 생일을 다시 넣지 않게 지금 결과를 이 탭에 잠깐 저장해 둔다(pending.ts).
      if (variant === "standalone") saveNewYearPending(result, name);

      const { requestPayment } = await import("@portone/browser-sdk/v2");
      const response = await requestPayment({
        storeId,
        channelKey,
        paymentId: order.paymentId,
        orderName: order.orderName,
        totalAmount: order.amount,
        currency: "KRW",
        payMethod: method,
        ...(method === "EASY_PAY" ? { easyPay: { easyPayProvider: "KAKAOPAY" } } : {}),
        // 휴대폰·이메일은 PC에서만 필수다. 모바일에서 비어 있으면 아예 보내지 않는다(빈 값은 형식 오류가 날 수 있다).
        customer: {
          fullName: name,
          ...(isValidPhone(phone) && { phoneNumber: phone }),
          ...(isValidEmail(mail) && { email: mail }),
        },
        redirectUrl: redirectPath ? `${window.location.origin}${redirectPath}` : window.location.href.split("?")[0],
      });

      if (!response || response.code) {
        recordFailure(paymentId, "card", response?.code, response?.message, response?.pgCode);
        return fail(friendlyPaymentError(response?.message));
      }

      const completeRes = await fetch(`/api/orders/${encodeURIComponent(response.paymentId)}/complete`, {
        method: "POST",
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error ?? "결제 확인에 실패했어요.");
      }
      trackEvent("payment_success", { productType: "new_year_report" });
      clearNewYearPending();

      await fetchReport(response.paymentId);
    } catch (e) {
      const message = e instanceof Error ? e.message : "결제 중 오류가 발생했어요.";
      recordFailure(paymentId, "card_error", undefined, message);
      fail(message);
    }
  }

  // 카드사 심사 중(결제 일시 중단)엔 결제가 실패하므로 업셀 카드를 숨긴다(쿠폰 리포트 아래에 뜨는 경우).
  if (PAYMENTS_PAUSED && status !== "unlocked") return null;

  if (status === "unlocked" && text) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-[#dccba6] bg-[#fbf7ef] p-4">
        <h3 className="font-medium text-accent-gold-soft"><Icon name="star" /> {NEW_YEAR_REPORT_NAME}</h3>
        <NewYearReportText text={text} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#dccba6] bg-[#fbf7ef] p-4 text-center">
      <strong className="text-sm text-accent-gold-soft">
        {variant === "standalone" ? `내 ${NEW_YEAR_REPORT_NAME} 열어보기` : `${NEW_YEAR_REPORT_NAME}도 궁금하다면`}
      </strong>
      <span className="text-xs text-foreground-muted">
        {variant === "standalone"
          ? "분기별 키워드, 월별 12개월 흐름, 조심할 달과 기회의 달까지 내 사주로 풀어드려요"
          : "지금 리포트에 이어서, 새해 흐름만 따로 더 자세히 — 월별 흐름과 조심할 달·기회의 달까지"}
      </span>

      {(askName || askContact) && (
        <div className="flex flex-col gap-2.5 text-left">
          {askName && (
            <label className="flex flex-col gap-1 text-sm text-foreground-muted">
              결제하시는 분 이름
              <input
                type="text" autoComplete="name" value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-lg border border-[#dccba6] bg-background-elevated px-3 py-2.5 text-base text-foreground outline-none focus:border-[#b8955a]"
              />
            </label>
          )}
          {askContact && (
            <>
              <label className="flex flex-col gap-1 text-sm text-foreground-muted">
                휴대폰 번호
                <input
                  type="tel" autoComplete="tel" inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010 1234 5678"
                  className="w-full rounded-lg border border-[#dccba6] bg-background-elevated px-3 py-2.5 text-base text-foreground outline-none focus:border-[#b8955a]"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-foreground-muted">
                이메일 (결제 영수증 받는 곳)
                <input
                  type="email" autoComplete="email" inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hong@naver.com"
                  className="w-full rounded-lg border border-[#dccba6] bg-background-elevated px-3 py-2.5 text-base text-foreground outline-none focus:border-[#b8955a]"
                />
              </label>
            </>
          )}
        </div>
      )}

      <div className="flex justify-center gap-2">
        {([
          ["CARD", "카드"],
          ["EASY_PAY", "카카오페이"],
        ] as const).filter(([value]) => kakaoOk || value !== "EASY_PAY").map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPayMethod(value)}
            className={`min-w-24 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              method === value
                ? "border-[#b8955a] bg-[#f3eee4] text-accent-gold-soft"
                : "border-[#dccba6] text-foreground-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left">
          <p className="text-sm text-red-700">{errorMessage}</p>
          {inAppHint(inApp) && <p className="text-xs leading-relaxed text-foreground-muted">{inAppHint(inApp)}</p>}
        </div>
      )}

      {!errorMessage && inAppPrepayHint(inApp) && (
        <p className="rounded-xl border border-[#dccba6] bg-[#f8f4ec] px-3 py-2.5 text-left text-xs leading-relaxed text-foreground-muted">
          {inAppPrepayHint(inApp)}
        </p>
      )}

      <PurchaseConsent checked={agreed} onChange={setAgreed} />

      <button
        type="button"
        onClick={() => void handlePurchase()}
        disabled={status === "processing" || !agreed}
        className="rounded-xl bg-cta px-4 py-2.5 text-center text-sm font-semibold text-cta-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "processing"
          ? "처리 중..."
          : variant === "standalone"
            ? `${NEW_YEAR_REPORT_PRICE_KRW.toLocaleString()}원으로 신년운세 보기`
            : `+${NEW_YEAR_REPORT_PRICE_KRW.toLocaleString()}원으로 신년운세 추가`}
      </button>
    </div>
  );
}
