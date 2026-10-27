"use client";

import { useState } from "react";
import Link from "next/link";
import { resultToInput, type SajuResult } from "@/lib/saju/types";
import { GLOBAL_PRODUCT_CATALOG } from "@/lib/payment/config";
import { GLOBAL_CURRENCY, formatMoney } from "@/lib/payment/money";
import { MANUAL_CHAPTER_KEYS } from "@/lib/reports/manualChapters";
import { GlobalReportView } from "./GlobalReportView";
import { GLOBAL_PAY_COPY } from "@/lib/global/payCopy";
import type { GlobalLocale } from "@/lib/global/dayMasters";
import { trackEvent } from "@/lib/analytics/track";

type Step = "offer" | "creating" | "pay" | "verifying" | "report" | "error";

const PRODUCT = "premium_report" as const;

/**
 * 해외판(/en·/ja) 유료 리포트 구매. 결제는 포트원 PayPal(SPB) 버튼이고, 가격·통화는 서버 카탈로그가 정한다
 * (클라이언트가 보낸 금액은 쓰지 않는다). GLOBAL_PAYMENTS_ENABLED가 꺼져 있는 동안은 이 화면이 노출되지 않는다.
 */
export function GlobalPremiumUnlock({ locale, result }: { locale: GlobalLocale; result: SajuResult }) {
  const t = GLOBAL_PAY_COPY[locale];
  const price = GLOBAL_PRODUCT_CATALOG[PRODUCT][locale];
  const currency = GLOBAL_CURRENCY[locale];
  const [step, setStep] = useState<Step>("offer");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState<string | null>(null);

  async function finalize(id: string) {
    setStep("verifying");
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}/complete`, { method: "POST" });
      if (!res.ok) throw new Error("verify");
      trackEvent("payment_success", { productType: PRODUCT });
      setStep("report");
    } catch {
      setError(`${t.verifyFailed} ${t.chargedNote}`);
      setStep("error");
    }
  }

  async function startCheckout() {
    if (!agreed) {
      setError(t.consentRequired);
      return;
    }
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_PAYPAL_CHANNEL_KEY;
    if (!storeId || !channelKey) {
      setError(t.orderError);
      return;
    }
    setError(null);
    setStep("creating");
    trackEvent("checkout_start", { productType: PRODUCT });
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: PRODUCT, locale, birthInput: resultToInput(result) }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error("order");
      setPaymentId(order.paymentId);
      setAccessKey(order.accessKey ?? null);
      setStep("pay");

      // PayPal 버튼이 그려질 칸(.portone-ui-container)이 화면에 생긴 다음에 SDK를 부른다.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const { loadPaymentUI } = await import("@portone/browser-sdk/v2");
      await loadPaymentUI(
        {
          uiType: "PAYPAL_SPB",
          storeId,
          channelKey,
          paymentId: order.paymentId,
          orderName: order.orderName,
          totalAmount: order.amount,
          currency: order.currency ?? currency,
          redirectUrl: window.location.href.split("?")[0],
        },
        {
          onPaymentSuccess: (response) => void finalize(response.paymentId),
          onPaymentFail: () => {
            setError(t.payFailed);
            trackEvent("payment_fail", { productType: PRODUCT });
          },
        },
      );
    } catch {
      setError(t.orderError);
      setStep("offer");
    }
  }

  if (step === "report" && paymentId) {
    return <GlobalReportView locale={locale} paymentId={paymentId} accessKey={accessKey} />;
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4">
      <header className="flex flex-col gap-1 text-center">
        <h3 className="text-base font-semibold text-accent-gold-soft">{t.offerTitle}</h3>
        <p className="text-xs leading-relaxed text-foreground-muted">{t.offerSub}</p>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground-muted">{t.includesTitle}</p>
        <ul className="flex flex-col gap-1.5">
          {MANUAL_CHAPTER_KEYS.map((key) => (
            <li key={key} className="rounded-xl bg-background-card/70 px-3 py-2 text-xs leading-relaxed text-foreground">
              <strong className="text-accent-gold-soft">{t.chapters[key].title}</strong>
              <span className="block text-foreground-muted">{t.chapters[key].promise}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-2xl font-semibold text-foreground">{formatMoney(price.amount, currency)}</p>
      <p className="text-center text-xs text-foreground-muted">{t.digitalNote}</p>

      {step === "offer" || step === "creating" || step === "error" ? (
        <>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-foreground-muted">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>
              {t.consent} {t.refundNote}{" "}
              <Link href="/refund" className="underline underline-offset-2">
                {t.refundLink}
              </Link>
            </span>
          </label>
          {error && <p className="text-center text-xs text-red-300">{error}</p>}
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={step === "creating"}
            className="min-h-12 rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {step === "creating" ? t.creating : t.continueButton}
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-center text-xs text-foreground-muted">{step === "verifying" ? t.verifying : t.payWith}</p>
          {/* 포트원 PayPal 버튼이 이 칸 안에 그려진다. */}
          <div className="portone-ui-container" data-portone-ui-type="paypal-spb" />
          {error && <p className="text-center text-xs text-red-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
