"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuInput, SajuResult } from "@/lib/saju/types";
import type { FreeCompatibility } from "@/lib/saju/compatibility";
import { CompatibilityForm, type CompatibilitySubmitValues } from "./CompatibilityForm";
import { CompatibilityResultView } from "./CompatibilityResultView";
import { trackEvent } from "@/lib/analytics/track";

const PENDING_KEY = "saju:pendingCompatibilityPurchase";

interface CompatibilityComputed {
  selfResult: SajuResult;
  partnerResult: SajuResult;
  free: FreeCompatibility;
}

async function calculateCompatibilityRemote(selfInput: SajuInput, partnerInput: SajuInput): Promise<CompatibilityComputed> {
  const res = await fetch("/api/saju/compatibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selfInput, partnerInput }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "입력값을 다시 확인해 주세요.");
  }
  return data as CompatibilityComputed;
}

export function CompatibilityFlow() {
  const [computed, setComputed] = useState<CompatibilityComputed | null>(null);
  const [names, setNames] = useState({ selfName: "", partnerName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumePaymentId, setResumePaymentId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent("compatibility_start", {});

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    window.history.replaceState({}, "", window.location.pathname);
    if (!paymentId) return;

    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    (async () => {
      try {
        const pending = JSON.parse(raw) as CompatibilitySubmitValues;
        const result = await calculateCompatibilityRemote(pending.selfInput, pending.partnerInput);
        setNames({ selfName: pending.selfName, partnerName: pending.partnerName });
        setComputed(result);
        setResumePaymentId(paymentId);
      } catch {
        // 저장된 값이 손상된 경우 조용히 무시하고 처음 화면으로 둔다.
      }
    })();
  }, []);

  async function handleSubmit(values: CompatibilitySubmitValues) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await calculateCompatibilityRemote(values.selfInput, values.partnerInput);
      setNames({ selfName: values.selfName, partnerName: values.partnerName });
      setComputed(result);
      trackEvent("compatibility_complete", { relation: result.free.relation });
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 다시 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setComputed(null);
    setResumePaymentId(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <div ref={formRef} className="flex w-full flex-col items-center pt-4">
        {!computed && <CompatibilityForm onSubmit={handleSubmit} submitting={submitting} errorMessage={error} />}
      </div>
      {computed && (
        <div ref={resultRef} className="flex w-full flex-col items-center">
          <CompatibilityResultView
            selfResult={computed.selfResult}
            partnerResult={computed.partnerResult}
            free={computed.free}
            selfName={names.selfName}
            partnerName={names.partnerName}
            onRestart={handleRestart}
            resumePaymentId={resumePaymentId}
          />
        </div>
      )}
    </div>
  );
}
