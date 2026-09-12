"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuInput, SajuResult } from "@/lib/saju";
import { BirthInfoForm, type BirthInfoFormValues } from "./BirthInfoForm";
import { ResultView } from "./ResultView";
import { loadLastBirthInfo, saveLastBirthInfo, type SavedBirthInfo } from "@/lib/revisit/localBirthInfo";
import { trackEvent } from "@/lib/analytics/track";
import type { ReviewItem } from "./ReviewList";

const PENDING_KEY = "saju:pendingPurchase";

interface PendingPurchase {
  name: string;
  birthInput: SajuInput;
}

// 계산 자체는 순식간에 끝나지만, 곧바로 결과를 띄우면 "풀이"보다 그냥 폼 제출처럼
// 느껴진다. 아래 문구를 순서대로 보여주며 최소 이 시간만큼은 로딩 화면을 유지해서
// 실제로 사주를 짚어가는 듯한 느낌을 준다(수치는 과장 없이 진짜 계산 단계들이다).
const LOADING_MESSAGES = [
  "생년월일시를 절기력으로 변환하는 중...",
  "년주·월주·일주·시주를 배치하는 중...",
  "오행 균형을 계산하는 중...",
  "일간을 확인하는 중...",
] as const;
const MIN_LOADING_MS = 1400;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function SajuFlow({
  reviews,
  entryMode = "default",
}: {
  reviews: ReviewItem[];
  /** "typeTest"/"examLuck"이면 각각 /type-test, /exam-luck 진입으로 기록하고, 결과
   * 화면에 그에 맞는 카드를 먼저 보여준다. */
  entryMode?: "default" | "typeTest" | "examLuck";
}) {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumePaymentId, setResumePaymentId] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<SavedBirthInfo | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!submitting) return;
    const id = setInterval(() => {
      setLoadingMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, MIN_LOADING_MS / LOADING_MESSAGES.length);
    return () => clearInterval(id);
  }, [submitting]);

  useEffect(() => {
    // 공유 링크(ShareButton이 붙이는 ?ref=share_kakao 등)로 들어온 방문인지, /type-test로
    // 들어온 방문인지 같이 기록해서 어느 진입점이 실제 결제까지 이어지는지 비교할 수 있게 한다.
    const ref = new URLSearchParams(window.location.search).get("ref") ?? undefined;
    trackEvent("landing_view", { ...(ref && { ref }), entry: entryMode });
  }, [entryMode]);

  // 모바일 결제창은 리디렉션 방식으로 돌아올 수 있어, 이때 URL의 paymentId와
  // 결제 시작 전 저장해둔 생년월일 정보(sessionStorage)로 결과 화면을 복원한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    window.history.replaceState({}, "", window.location.pathname);
    if (!paymentId) {
      // 결제 복귀가 아니면, 재방문자를 위해 마지막으로 본 사주 정보가 있는지만 확인해둔다
      // (자동으로 결과를 열지는 않고, 버튼을 눌러야 보이도록 한다).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedInfo(loadLastBirthInfo());
      return;
    }

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

  async function runCalculation(name: string, birthInput: SajuInput) {
    setSubmitting(true);
    setError(null);
    setLoadingMessageIndex(0);
    try {
      trackEvent("saju_start", {});
      const [computed] = await Promise.all([calculateSajuRemote(birthInput), wait(MIN_LOADING_MS)]);
      setName(name);
      setResult(computed);
      saveLastBirthInfo({ name, birthInput });
      trackEvent("saju_complete", {});
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 다시 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(values: BirthInfoFormValues) {
    await runCalculation(values.name, {
      calendarType: values.calendarType,
      isLeapMonth: values.isLeapMonth,
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.timeUnknown ? undefined : values.hour,
      minute: values.timeUnknown ? undefined : values.minute,
      gender: values.gender,
    });
  }

  function handleRevisit() {
    if (!savedInfo) return;
    void runCalculation(savedInfo.name, savedInfo.birthInput);
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
      <div ref={formRef} className="flex w-full flex-col items-center gap-4 pt-4">
        {!result && submitting ? (
          // 계산 자체는 즉시 끝나지만, 곧장 결과를 띄우기보다 실제로 사주를 짚어가는 듯한
          // 짧은 "풀이 중" 화면을 보여준다(runCalculation의 MIN_LOADING_MS와 짝을 이룬다).
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-background-card/70 px-6 py-10 text-center">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="loading-dot h-2.5 w-2.5 rounded-full bg-accent-gold"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-foreground-muted">{LOADING_MESSAGES[loadingMessageIndex]}</p>
          </div>
        ) : (
          <>
            {!result && savedInfo && (
              <div className="flex w-full max-w-md flex-col gap-2 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4 text-center">
                <p className="text-sm text-foreground-muted">
                  {savedInfo.name ? `${savedInfo.name}님, ` : ""}이전에 확인한 사주 결과가 있어요
                </p>
                <button
                  type="button"
                  onClick={handleRevisit}
                  disabled={submitting}
                  className="rounded-xl border border-accent-gold px-4 py-2.5 text-sm font-semibold text-accent-gold-soft transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  내 사주 다시 보기 · 오늘의 운세 보기
                </button>
              </div>
            )}
            {!result && (
              <BirthInfoForm onSubmit={handleSubmit} submitting={submitting} errorMessage={error} />
            )}
          </>
        )}
      </div>
      {result && (
        <div ref={resultRef} className="flex w-full flex-col items-center">
          <ResultView
            name={name}
            result={result}
            onRestart={handleRestart}
            resumePaymentId={resumePaymentId}
            reviews={reviews}
            revealMode={entryMode === "default" ? undefined : entryMode}
          />
        </div>
      )}
    </div>
  );
}
