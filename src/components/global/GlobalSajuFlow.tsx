"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SajuInput, SajuResult, Pillar } from "@/lib/saju/types";
import type { WuXing } from "@/lib/saju/ganzhi";
import { WuxingMascot } from "@/components/saju/WuxingMascot";
import { WUXING_COLOR_VAR } from "@/components/saju/wuxingColors";
import { trackEvent } from "@/lib/analytics/track";
import { firstSource, rememberSource } from "@/lib/analytics/source";
import {
  BRANCH_ANIMALS,
  DAY_MASTERS,
  ELEMENT_NAMES,
  ELEMENT_NOTES,
  type GlobalLocale,
} from "@/lib/global/dayMasters";
import { GLOBAL_MESSAGES } from "@/lib/global/messages";
import { GLOBAL_PAYMENTS_ENABLED } from "@/lib/payment/config";
import { GlobalPremiumUnlock } from "./GlobalPremiumUnlock";

const WUXING_ORDER: WuXing[] = ["목", "화", "토", "금", "수"];
const MIN_LOADING_MS = 1200;
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1930 + 1 }, (_, i) => THIS_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function daysIn(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 국내판과 같은 계산 API를 쓴다. 해외 출생자는 대부분 양력 생일만 알아서 양력으로만 받는다. */
async function calculate(input: SajuInput): Promise<SajuResult> {
  const res = await fetch("/api/saju/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birthInput: input }),
  });
  if (!res.ok) throw new Error(res.status === 400 ? "input" : "network");
  const data = (await res.json()) as { result: SajuResult };
  return data.result;
}

export function GlobalSajuFlow({ locale }: { locale: GlobalLocale }) {
  const t = GLOBAL_MESSAGES[locale];
  const [year, setYear] = useState(1995);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState<number | null>(null);
  const [gender, setGender] = useState<"female" | "male">("female");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SajuResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref") ?? undefined;
    rememberSource(ref);
    trackEvent("global_landing_view", { locale, ...(ref && { ref }) });
  }, [locale]);

  const maxDay = daysIn(year, month);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const [computed] = await Promise.all([
        calculate({
          calendarType: "solar",
          year,
          month,
          day: Math.min(day, maxDay),
          hour: hour ?? undefined,
          minute: hour === null ? undefined : 0,
          gender,
        }),
        wait(MIN_LOADING_MS),
      ]);
      setResult(computed);
      trackEvent("global_saju_complete", { locale });
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError(err instanceof Error && err.message === "input" ? t.inputError : t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  const select =
    "w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold";

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="rounded-full border border-accent-gold/40 px-3 py-1 text-xs tracking-wide text-accent-gold-soft">
          {t.badge}
        </span>
        <h1 className="whitespace-pre-line font-serif text-[26px] leading-snug sm:text-3xl text-foreground">{t.headline}</h1>
        <p className="text-sm leading-relaxed text-foreground-muted">{t.sub}</p>
      </header>

      {!result && (
        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-5 rounded-2xl border border-border-subtle bg-background-card/70 p-5"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-foreground">{t.birthDate}</legend>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
              <select aria-label={t.year} value={year} onChange={(e) => setYear(Number(e.target.value))} className={select}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                    {locale === "ja" ? "年" : ""}
                  </option>
                ))}
              </select>
              <select aria-label={t.month} value={month} onChange={(e) => setMonth(Number(e.target.value))} className={select}>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {locale === "ja" ? `${m}月` : new Date(2000, m - 1, 1).toLocaleString("en", { month: "short" })}
                  </option>
                ))}
              </select>
              <select aria-label={t.day} value={Math.min(day, maxDay)} onChange={(e) => setDay(Number(e.target.value))} className={select}>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                    {locale === "ja" ? "日" : ""}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">{t.birthTime}</span>
            <select
              value={hour === null ? "" : hour}
              onChange={(e) => setHour(e.target.value === "" ? null : Number(e.target.value))}
              className={select}
            >
              <option value="">{t.timeUnknown}</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {locale === "ja" ? `${h}時台` : `${String(h).padStart(2, "0")}:00 – ${String(h).padStart(2, "0")}:59`}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-foreground">{t.gender}</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  aria-pressed={gender === g}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    gender === g
                      ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft"
                      : "border-border-subtle text-foreground-muted"
                  }`}
                >
                  {g === "female" ? t.female : t.male}
                </button>
              ))}
            </div>
          </fieldset>

          {error && <p className="text-center text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 rounded-xl bg-accent-gold px-4 py-3 text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? t.loading : t.submit}
          </button>
          <p className="text-center text-xs text-foreground-muted">{t.privacyNote}</p>
        </form>
      )}

      {result && (
        <div ref={resultRef} className="flex w-full scroll-mt-6 flex-col gap-6">
          <GlobalResult locale={locale} result={result} />
          <button
            type="button"
            onClick={() => setResult(null)}
            className="text-sm text-foreground-muted underline underline-offset-4"
          >
            {t.restart}
          </button>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-foreground-muted/80">{t.disclaimer}</p>
    </div>
  );
}

function GlobalResult({ locale, result }: { locale: GlobalLocale; result: SajuResult }) {
  const t = GLOBAL_MESSAGES[locale];
  const dm = DAY_MASTERS[result.dayPillar.ganHanja]?.[locale];
  const wuxing = result.dayPillar.ganWuxing;
  const sorted = [...WUXING_ORDER].sort((a, b) => result.wuxingPercent[b] - result.wuxingPercent[a]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const pillars: (Pillar | null)[] = [result.yearPillar, result.monthPillar, result.dayPillar, result.timePillar];

  return (
    <>
      <section className="reveal-pop flex flex-col items-center gap-2 rounded-2xl border border-accent-gold/30 bg-background-card/70 p-5 text-center">
        <span className="text-xs text-foreground-muted">{t.dayMasterTitle}</span>
        <WuxingMascot wuxing={wuxing} size={96} />
        <h2 className="font-serif text-2xl text-accent-gold-soft">{dm?.label}</h2>
        <p className="text-sm text-foreground-muted">{dm?.image}</p>
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {dm?.keywords.map((k) => (
            <span key={k} className="rounded-full bg-accent-gold/10 px-2.5 py-1 text-xs text-accent-gold-soft">
              {k}
            </span>
          ))}
        </div>
        <p className="pt-2 text-left text-sm leading-relaxed text-foreground">{dm?.summary}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">{t.chartTitle}</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          {pillars.map((p, i) => (
            <div key={t.pillarLabels[i]} className="flex flex-col items-center gap-1 rounded-xl bg-background-elevated/60 py-3">
              <span className="text-[11px] text-foreground-muted">{t.pillarLabels[i]}</span>
              {p ? (
                <>
                  <span className="font-serif text-xl" style={{ color: WUXING_COLOR_VAR[p.ganWuxing] }}>
                    {p.ganHanja}
                  </span>
                  <span className="font-serif text-xl" style={{ color: WUXING_COLOR_VAR[p.zhiWuxing] }}>
                    {p.zhiHanja}
                  </span>
                  <span className="text-[11px] text-foreground-muted">{BRANCH_ANIMALS[p.zhiHanja]?.[locale]}</span>
                </>
              ) : (
                <span className="py-4 text-xs text-foreground-muted">{t.unknown}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">{t.balanceTitle}</h3>
        <div className="flex flex-col gap-1.5">
          {WUXING_ORDER.map((w) => (
            <div key={w} className="flex items-center gap-2 text-xs">
              <span className="w-12 shrink-0 text-foreground">{ELEMENT_NAMES[w][locale]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-elevated">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${result.wuxingPercent[w]}%`, background: WUXING_COLOR_VAR[w] }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-foreground-muted">{Math.round(result.wuxingPercent[w])}%</span>
            </div>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-foreground">
          <strong className="text-accent-gold-soft">
            {t.strongest}: {ELEMENT_NAMES[strongest][locale]}
          </strong>{" "}
          — {ELEMENT_NOTES[strongest][locale].strong}
        </p>
        {result.wuxingPercent[weakest] < result.wuxingPercent[strongest] && (
          <p className="text-sm leading-relaxed text-foreground">
            <strong className="text-accent-gold-soft">
              {t.weakest}: {ELEMENT_NAMES[weakest][locale]}
            </strong>{" "}
            — {ELEMENT_NOTES[weakest][locale].weak}
          </p>
        )}
      </section>

      {/* 결제가 열리기 전에는 기존 "공개 알림 받기"를 그대로 보여준다. */}
      {GLOBAL_PAYMENTS_ENABLED ? <GlobalPremiumUnlock locale={locale} result={result} /> : <LaunchWaitlist locale={locale} />}
    </>
  );
}

function LaunchWaitlist({ locale }: { locale: GlobalLocale }) {
  const t = GLOBAL_MESSAGES[locale];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t.emailInvalid);
      return;
    }
    if (!consent) {
      setError(t.consentRequired);
      return;
    }
    setStatus("saving");
    try {
      // 국내 대기자와 섞이지 않게 src 앞에 언어를 붙인다(관리자 화면에서 "ja:"/"en:"으로 구분).
      const src = `${locale}:${firstSource() ?? "direct"}`.slice(0, 40);
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), productType: "premium_report", consent: true, src }),
      });
      if (!res.ok) throw new Error(String(res.status));
      trackEvent("global_waitlist_signup", { locale });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error && err.message === "400" ? t.emailInvalid : t.saveError);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4">
      <h3 className="text-center text-sm font-semibold text-accent-gold-soft">🔒 {t.lockedTitle}</h3>
      <ul className="grid grid-cols-2 gap-2">
        {t.lockedItems.map((item) => (
          <li key={item} className="rounded-xl bg-background-card/70 px-3 py-2 text-center text-xs text-foreground">
            {item}
          </li>
        ))}
      </ul>
      {status === "done" ? (
        <p className="text-center text-sm text-accent-gold-soft">{t.done}</p>
      ) : (
        <>
          <p className="text-center text-xs leading-relaxed text-foreground-muted">{t.lockedNote}</p>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
          />
          <label className="flex items-start gap-2 text-xs leading-relaxed text-foreground-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span>
              {t.consent}{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                {t.privacyLink}
              </Link>
            </span>
          </label>
          {error && <p className="text-center text-xs text-red-300">{error}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={status === "saving"}
            className="min-h-12 rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "saving" ? t.saving : t.notifyButton}
          </button>
        </>
      )}
    </section>
  );
}
