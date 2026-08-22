"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuInput, SajuResult } from "@/lib/saju";
import { BirthInfoForm, type BirthInfoFormValues } from "./BirthInfoForm";
import { ResultView } from "./ResultView";

const PENDING_KEY = "saju:pendingPurchase";

interface PendingPurchase {
  name: string;
  birthInput: SajuInput;
}

async function calculateSajuRemote(birthInput: SajuInput): Promise<SajuResult> {
  const res = await fetch("/api/saju/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birthInput }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "입력값을 다시 확인해 주세요.");
  }
  return data.result as SajuResult;
}

export function SajuFlow() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumePaymentId, setResumePaymentId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // 모바일 결제창은 리디렉션 방식으로 돌아올 수 있어, 이때 URL의 paymentId와
  // 결제 시작 전 저장해둔 생년월일 정보(sessionStorage)로 결과 화면을 복원한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    window.history.replaceState({}, "", window.location.pathname);
    if (!paymentId) return;

    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    (async () => {
      try {
        const pending = JSON.parse(raw) as PendingPurchase;
        const computed = await calculateSajuRemote(pending.birthInput);
        setName(pending.name);
        setResult(computed);
        setResumePaymentId(paymentId);
      } catch {
        // 저장된 값이 손상된 경우 조용히 무시하고 처음 화면으로 둔다.
      }
    })();
  }, []);

  async function handleSubmit(values: BirthInfoFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const computed = await calculateSajuRemote({
        calendarType: values.calendarType,
        isLeapMonth: values.isLeapMonth,
        year: values.year,
        month: values.month,
        day: values.day,
        hour: values.timeUnknown ? undefined : values.hour,
        minute: values.timeUnknown ? undefined : values.minute,
        gender: values.gender,
      });
      setName(values.name);
      setResult(computed);
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
    setResult(null);
    setResumePaymentId(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <div ref={formRef} className="flex w-full flex-col items-center pt-4">
        {!result && (
          <BirthInfoForm onSubmit={handleSubmit} submitting={submitting} errorMessage={error} />
        )}
      </div>
      {result && (
        <div ref={resultRef} className="flex w-full flex-col items-center">
          <ResultView
            name={name}
            result={result}
            onRestart={handleRestart}
            resumePaymentId={resumePaymentId}
          />
        </div>
      )}
    </div>
  );
}
