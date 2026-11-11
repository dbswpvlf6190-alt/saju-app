"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuInput, SajuResult } from "@/lib/saju";
import { PAYMENTS_PAUSED } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";
import { rememberSource } from "@/lib/analytics/source";
import { BirthInfoForm, type BirthInfoFormValues } from "./BirthInfoForm";
import { NewYearUpsellCard } from "./NewYearUpsellCard";

/**
 * /new-year 단독 구매 흐름(2026-10-22): 생년월일 입력 → 내 일주 확인 → 신년운세 결제.
 * 기본 리포트(4,900원)를 먼저 사지 않아도 신년운세만 살 수 있다. 계산은 서버(/api/saju/calculate)에서 하고,
 * 결제·리포트 조회는 기존 new_year_report 주문 경로를 그대로 쓴다. 모바일 결제창이 리디렉션으로 돌아오면
 * /new-year/return이 이어받는다.
 */
export function NewYearStandalone() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref") ?? undefined;
    rememberSource(ref);
    trackEvent("landing_view", { entry: "newYear", ...(ref && { ref }) });
  }, []);

  async function handleSubmit(values: BirthInfoFormValues) {
    const birthInput: SajuInput = {
      calendarType: values.calendarType,
      isLeapMonth: values.isLeapMonth,
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.timeUnknown ? undefined : values.hour,
      minute: values.timeUnknown ? undefined : values.minute,
      gender: values.gender,
    };
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/saju/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "입력값을 다시 확인해 주세요.");
      setName(values.name);
      setResult(data.result as SajuResult);
      trackEvent("new_year_result_view", {});
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 다시 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!result) {
    return <BirthInfoForm onSubmit={handleSubmit} submitting={submitting} errorMessage={error} />;
  }

  return (
    <div ref={resultRef} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-border-subtle bg-background-card/70 px-4 py-5 text-center">
        <span className="text-xs text-foreground-muted">{name ? `${name}님의 일주` : "나의 일주"}</span>
        <strong className="font-serif text-2xl text-accent-gold-soft">{result.dayPillar.ganZhiKor}일주</strong>
        <span className="text-xs text-foreground-muted">이 사주에 2027년 정미년 기운이 어떻게 들어오는지 풀어드려요</span>
      </div>

      {PAYMENTS_PAUSED ? (
        <p className="rounded-2xl border border-border-subtle bg-background-card/70 px-4 py-5 text-center text-sm text-foreground-muted">
          신년운세 결제는 곧 열려요. 조금만 기다려 주세요.
        </p>
      ) : (
        <NewYearUpsellCard
          result={result}
          fullName={name}
          email=""
          phoneNumber=""
          variant="standalone"
          redirectPath="/new-year/return"
        />
      )}

      <button
        type="button"
        onClick={() => setResult(null)}
        className="text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft"
      >
        다른 생년월일로 다시 보기
      </button>
    </div>
  );
}
