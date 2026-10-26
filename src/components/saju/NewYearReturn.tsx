"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { parseNewYearReturn } from "@/lib/newYear/returnParams";
import { trackEvent } from "@/lib/analytics/track";
import { NEW_YEAR_REPORT_NAME } from "@/lib/payment/config";
import { NewYearReportText } from "./NewYearReportText";

type State =
  | { step: "checking" }
  | { step: "writing" }
  | { step: "done"; text: string }
  | { step: "failed"; message: string }
  | { step: "retry"; paymentId: string; message: string };

/**
 * 모바일 결제창(리디렉션)이 끝나고 돌아오는 화면. 주문을 만든 그 브라우저의 접근 쿠키로 결제를 서버에서
 * 다시 확인(complete, 멱등)하고 리포트를 불러온다. 결제는 됐는데 리포트 생성이 실패하면 재결제 없이
 * 다시 시도할 수 있게 "다시 불러오기"를 보여준다.
 */
export function NewYearReturn() {
  const [state, setState] = useState<State>({ step: "checking" });
  const started = useRef(false);

  async function load(paymentId: string) {
    setState({ step: "writing" });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (data.sections?.newYear) {
        setState({ step: "done", text: data.sections.newYear });
        // 풀이가 열린 뒤에만 주문번호를 주소창에서 지운다. 그 전에는 새로고침으로 다시 불러올 수 있게 남겨둔다.
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      setState({
        step: "retry",
        paymentId,
        message: data.error ?? "신년운세를 아직 만들지 못했어요.",
      });
    } catch {
      setState({ step: "retry", paymentId, message: "네트워크가 불안정해요. 잠시 후 다시 시도해 주세요." });
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { paymentId, failed, message } = parseNewYearReturn(window.location.search);

    (async () => {
      if (failed) {
        trackEvent("payment_fail", { productType: "new_year_report" });
        setState({ step: "failed", message: message ?? "결제가 완료되지 않았어요." });
        return;
      }
      if (!paymentId) {
        setState({ step: "failed", message: "결제 정보를 찾지 못했어요." });
        return;
      }
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(paymentId)}/complete`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "결제 확인에 실패했어요.");
        if (data.status !== "PAID") throw new Error("결제가 완료되지 않았어요.");
        trackEvent("payment_success", { productType: "new_year_report" });
        await load(paymentId);
      } catch (e) {
        trackEvent("payment_fail", { productType: "new_year_report" });
        setState({ step: "failed", message: e instanceof Error ? e.message : "결제 확인 중 오류가 발생했어요." });
      }
    })();
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <h1 className="text-center font-serif text-xl text-accent-gold-soft">{NEW_YEAR_REPORT_NAME}</h1>

      {(state.step === "checking" || state.step === "writing") && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-background-card/70 px-6 py-10 text-center">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="loading-dot h-2.5 w-2.5 rounded-full bg-accent-gold"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-foreground-muted">
            {state.step === "checking" ? "결제를 확인하고 있어요..." : "내 사주로 새해 운세를 쓰고 있어요. 최대 1분 정도 걸려요."}
          </p>
        </div>
      )}

      {state.step === "done" && (
        <div className="rounded-2xl border border-[rgba(200,98,63,0.4)] bg-[rgba(200,98,63,0.1)] p-4">
          <NewYearReportText text={state.text} />
        </div>
      )}

      {state.step === "retry" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-background-card/70 px-5 py-6 text-center">
          <p className="text-sm text-foreground">결제는 완료됐어요. 풀이를 불러오는 중 문제가 있었어요.</p>
          <p className="text-xs text-foreground-muted">{state.message}</p>
          <button
            type="button"
            onClick={() => void load(state.paymentId)}
            className="rounded-xl bg-[#c8623f] px-4 py-2.5 text-sm font-semibold text-[#1a0f0a] transition-opacity hover:opacity-90"
          >
            다시 불러오기
          </button>
          <p className="text-xs text-foreground-muted">
            버튼이 안 되면 이 화면을 새로고침해 주세요. 결제한 같은 브라우저에서는 하루 동안 다시 열 수 있어요.
          </p>
        </div>
      )}

      {state.step === "failed" && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-background-card/70 px-5 py-6 text-center">
          <p className="text-sm text-foreground">{state.message}</p>
          <Link
            href="/new-year"
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
          >
            신년운세 처음으로
          </Link>
        </div>
      )}
    </div>
  );
}
