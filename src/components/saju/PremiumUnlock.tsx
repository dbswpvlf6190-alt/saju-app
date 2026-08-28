"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PremiumSection, SajuResult } from "@/lib/saju";
// ResultView.tsx와 같은 이유로 배럴 대신 서브모듈에서 직접 가져온다.
import { resultToInput } from "@/lib/saju/types";
import { PREMIUM_REPORT_PRICE_KRW } from "@/lib/payment/config";
import {
  PREMIUM_CTA_LABEL,
  PREMIUM_DELIVERY_NOTE,
  PREMIUM_DETAILS_STEP_INTRO,
  PREMIUM_PREVIEW_VALUE_LINE,
  PREMIUM_SECTION_INTRO,
  PREMIUM_TRUST_ITEMS,
  PREMIUM_VALUE_CHECKLIST,
  PREMIUM_VALUE_DETAIL,
  PREMIUM_VALUE_HEADLINE,
  PREMIUM_VALUE_SUBHEAD,
} from "@/lib/payment/ctaCopy";
import { trackEvent } from "@/lib/analytics/track";
import { ReviewForm } from "./ReviewForm";

type Status = "locked" | "processing" | "unlocked" | "error";

const PENDING_KEY = "saju:pendingPurchase";

export function PremiumUnlock({
  result,
  name,
  premiumSections,
  resumePaymentId,
  onUnlockedChange,
}: {
  result: SajuResult;
  name: string;
  premiumSections: PremiumSection[];
  resumePaymentId: string | null;
  /** 결제로 잠금이 풀리면 true로 호출된다 — 상위에서 이 세션 동안 광고를 숨기는 데 사용한다. */
  onUnlockedChange?: (unlocked: boolean) => void;
}) {
  const [status, setStatus] = useState<Status>("locked");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<string, string> | null>(null);
  const [missingSections, setMissingSections] = useState<string[]>([]);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState(name);
  const [payMethod, setPayMethod] = useState<"CARD" | "EASY_PAY">("CARD");
  // 상품 가치 + CTA를 먼저 보여주고, 클릭해서 구매 의사를 밝힌 뒤에야 이름·이메일·휴대폰
  // 입력폼을 보여주기 위한 2단계 흐름. 결제 실패로 되돌아와도 입력폼은 유지해야 하므로
  // 여기서 "details"로 넘어간 뒤에는 "intro"로 되돌리지 않는다. 모바일 결제창 리디렉션
  // 복귀(resumePaymentId)인 경우는 이미 정보를 다 입력하고 왔던 것이라 처음부터 details로 둔다.
  const [formStep, setFormStep] = useState<"intro" | "details">(() =>
    resumePaymentId ? "details" : "intro",
  );

  useEffect(() => {
    // 결제 복귀(resumePaymentId)로 바로 처리 상태에 들어가는 경우가 아니라면, 잠금
    // 화면(미리보기)이 실제로 노출된 시점을 한 번 기록한다.
    if (!resumePaymentId) {
      trackEvent("premium_preview_view", {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReport = useCallback(async (paymentId: string) => {
    const reportRes = await fetch(`/api/orders/${encodeURIComponent(paymentId)}`);
    const reportData = await reportRes.json();

    // 일부 항목만 실패한 경우에도 성공한 항목은 그대로 보여주고, 실패한 항목만
    // 다시 시도할 수 있게 한다 — 전부 다시 기다리게 하지 않기 위함이다.
    if (reportData.sections && Object.keys(reportData.sections).length > 0) {
      setSections(reportData.sections);
      setMissingSections(reportData.missingSections ?? []);
      setActivePaymentId(paymentId);
      setStatus("unlocked");
      onUnlockedChange?.(true);
      if (!reportData.missingSections?.length) {
        setErrorMessage(null);
        sessionStorage.removeItem(PENDING_KEY);
      } else {
        setErrorMessage(reportData.error ?? "일부 항목을 불러오지 못했어요.");
      }
      return;
    }

    if (!reportRes.ok) {
      throw new Error(reportData.error ?? "리포트를 불러오지 못했습니다.");
    }
  }, [onUnlockedChange]);

  const finalizeOrder = useCallback(
    async (paymentId: string) => {
      setStatus("processing");
      setErrorMessage(null);
      try {
        const completeRes = await fetch(`/api/orders/${encodeURIComponent(paymentId)}/complete`, {
          method: "POST",
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) {
          throw new Error(completeData.error ?? "결제 확인에 실패했습니다.");
        }
        trackEvent("payment_success", { productType: "premium_report" });

        await fetchReport(paymentId);
      } catch (e) {
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
        trackEvent("payment_fail", { productType: "premium_report" });
      }
    },
    [fetchReport],
  );

  async function handleRetryMissing() {
    if (!activePaymentId) return;
    setStatus("processing");
    try {
      await fetchReport(activePaymentId);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "다시 시도하는 중 오류가 발생했습니다.");
    } finally {
      setStatus("unlocked");
    }
  }

  useEffect(() => {
    // resumePaymentId는 리디렉션 복귀 시 URL에서 읽어온 외부 상태이며, 이를 감지해
    // 결제 완료 처리를 1회 트리거하는 것이므로 effect에서의 비동기 setState 호출이 맞다.
    if (resumePaymentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void finalizeOrder(resumePaymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumePaymentId]);

  async function handlePurchase() {
    trackEvent("checkout_start", { productType: "premium_report" });
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setStatus("error");
      setErrorMessage("결제 연동 준비중이에요. NEXT_PUBLIC_PORTONE_STORE_ID / CHANNEL_KEY 설정이 필요합니다.");
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
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({ name, birthInput: resultToInput(result) }),
      );

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthInput: resultToInput(result) }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(order.error ?? "주문 생성에 실패했습니다.");
      }

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

      await finalizeOrder(response.paymentId);
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "결제 중 오류가 발생했습니다.");
    }
  }

  if (sections) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="px-1 text-sm font-medium text-foreground-muted">상세 운세</h3>
        {premiumSections.map((section) => {
          const text = sections[section.key];
          const isMissing = missingSections.includes(section.key);
          return (
            <div key={section.key} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
              <h4 className="font-medium text-accent-gold-soft">{section.title}</h4>
              {text ? (
                <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">{text}</p>
              ) : (
                <p className="mt-2 text-sm text-foreground-muted">
                  {isMissing ? "생성에 실패했어요. 아래에서 다시 시도해 주세요." : "불러오는 중..."}
                </p>
              )}
            </div>
          );
        })}

        {missingSections.length > 0 && (
          <>
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {errorMessage ?? "일부 항목을 불러오지 못했어요."}
            </p>
            <button
              type="button"
              onClick={handleRetryMissing}
              disabled={status === "processing"}
              className="rounded-xl border border-accent-gold px-4 py-3 text-center text-sm font-semibold text-accent-gold-soft transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "processing" ? "다시 시도하는 중..." : "실패한 항목 다시 시도"}
            </button>
          </>
        )}

        {activePaymentId && <ReviewForm paymentId={activePaymentId} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="px-1 text-sm font-medium text-foreground-muted">🔒 상세 분석 미리보기</h3>
      <p className="px-1 text-xs text-foreground-muted">{PREMIUM_SECTION_INTRO}</p>
      {/* 제목만 나열하면 실제로 뭘 얼마나 받는지 와닿지 않는다는 지적에 따라, 카드 목록
          위에 구체적인 항목·분량을 먼저 보여준다(과장 없이 실제 생성 규격 그대로). */}
      <p className="px-1 text-xs font-medium text-accent-gold-soft">{PREMIUM_PREVIEW_VALUE_LINE}</p>

      {/* 카드 하나당 제목 + 블러 처리된 한 줄 미리보기만 보여주는 압축 리스트.
          예전엔 카드마다 티저 문단 + 블러 문단 + "계속 확인" 문구가 반복돼 5개를 다 보려면
          스크롤이 상당히 길었다 — 같은 안내 문구를 위 한 줄로 합치고 카드 자체를 줄였다. */}
      <div className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-background-card/70">
        {premiumSections.map((section) => (
          <div key={section.key} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground">{section.title}</span>
              <p className="mt-0.5 truncate select-none text-xs leading-relaxed text-foreground-muted/40 blur-[2.5px]">
                {section.previewSnippet}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-accent-gold-soft">🔒</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4 text-center">
        <h4 className="font-serif text-lg text-accent-gold-soft">{PREMIUM_VALUE_HEADLINE}</h4>
        <p className="text-sm text-foreground-muted">{PREMIUM_VALUE_SUBHEAD}</p>
        <ul className="mt-2 flex flex-col gap-1 text-left text-sm text-foreground">
          {PREMIUM_VALUE_CHECKLIST.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
        <p className="text-xs text-foreground-muted">{PREMIUM_VALUE_DETAIL}</p>
        <p className="mt-3 text-2xl font-semibold text-accent-gold-soft">
          {PREMIUM_REPORT_PRICE_KRW.toLocaleString()}원
        </p>
        <p className="text-xs text-foreground-muted">{PREMIUM_DELIVERY_NOTE}</p>
      </div>

      {formStep === "intro" ? (
        // 1단계: 가치 제안 + CTA만 먼저 보여준다. 구매 의사를 밝히기 전에는
        // 이름·이메일·휴대폰 입력란을 아예 노출하지 않는다.
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              trackEvent("premium_cta_click", { productType: "premium_report" });
              setFormStep("details");
            }}
            className="min-h-14 rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
          >
            {PREMIUM_CTA_LABEL}
          </button>
          <div className="flex flex-col items-center gap-1 text-center text-xs text-foreground-muted">
            <p>{PREMIUM_TRUST_ITEMS.map((item) => `✓ ${item}`).join("  ·  ")}</p>
            <Link href="/refund" className="underline underline-offset-4 hover:text-accent-gold-soft">
              환불정책 확인하기
            </Link>
          </div>
        </div>
      ) : (
        // 2단계: CTA를 눌러 구매 의사를 밝힌 뒤에만 결제 정보 입력란이 나타난다.
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-foreground-muted">{PREMIUM_DETAILS_STEP_INTRO}</span>
            <button
              type="button"
              onClick={() => setFormStep("intro")}
              disabled={status === "processing"}
              className="shrink-0 text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft disabled:opacity-50"
            >
              ‹ 이전
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="px-1 text-sm text-foreground-muted">결제 수단</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["CARD", "카드"],
                ["EASY_PAY", "카카오페이"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPayMethod(value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    payMethod === value
                      ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft"
                      : "border-border-subtle text-foreground-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="purchase-name" className="px-1 text-sm text-foreground-muted">
              결제자 이름
            </label>
            <input
              id="purchase-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="purchase-email" className="px-1 text-sm text-foreground-muted">
              결제 확인 메일을 받을 이메일
            </label>
            <input
              id="purchase-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="purchase-phone" className="px-1 text-sm text-foreground-muted">
              휴대폰 번호
            </label>
            <input
              id="purchase-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="01012345678"
              className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
            />
          </div>

          {errorMessage && (
            <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            onClick={() => void handlePurchase()}
            disabled={status === "processing"}
            className="mt-1 min-h-14 rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "processing" ? "처리 중..." : PREMIUM_CTA_LABEL}
          </button>

          <div className="flex flex-col items-center gap-1 text-center text-xs text-foreground-muted">
            <Link href="/refund" className="underline underline-offset-4 hover:text-accent-gold-soft">
              환불정책 확인하기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
