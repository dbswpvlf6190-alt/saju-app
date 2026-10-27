"use client";

import { useCallback, useEffect, useState } from "react";
import { MANUAL_CHAPTER_KEYS, type ManualChapterKey } from "@/lib/reports/manualChapters";
import { GLOBAL_PAY_COPY } from "@/lib/global/payCopy";
import type { GlobalLocale } from "@/lib/global/dayMasters";

/** 결제한 해외판 리포트 6장. 결제 직후 화면과 "내 리포트 링크" 페이지가 같이 쓴다. 장은 도착하는 대로 보여 준다. */
export function GlobalReportView({
  locale,
  paymentId,
  accessKey,
}: {
  locale: GlobalLocale;
  paymentId: string;
  /** 쿠키 없이 여는 링크의 키. 결제한 브라우저에서는 쿠키가 있어 없어도 열린다. */
  accessKey: string | null;
}) {
  const t = GLOBAL_PAY_COPY[locale];
  const [chapters, setChapters] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchChapter = useCallback(
    async (key: ManualChapterKey) => {
      const k = accessKey ? `&k=${encodeURIComponent(accessKey)}` : "";
      const res = await fetch(`/api/orders/${encodeURIComponent(paymentId)}?section=${key}${k}`);
      const data = await res.json();
      if (!data.sections?.[key]) throw new Error("chapter");
      setChapters((prev) => ({ ...prev, [key]: data.sections[key] }));
    },
    [paymentId, accessKey],
  );

  const load = useCallback(
    async (keys: ManualChapterKey[]) => {
      setFailed([]);
      const settled = await Promise.allSettled(keys.map((k) => fetchChapter(k)));
      setFailed(keys.filter((_, i) => settled[i].status === "rejected"));
    },
    [fetchChapter],
  );

  useEffect(() => {
    // 화면이 열릴 때 한 번 6장을 모두 요청한다(먼저 끝나는 장부터 보인다).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(MANUAL_CHAPTER_KEYS);
  }, [load]);

  const link =
    accessKey && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/report?id=${encodeURIComponent(paymentId)}&k=${encodeURIComponent(accessKey)}`
      : null;

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // 복사를 막는 브라우저에서는 아래 입력칸의 링크를 직접 선택해 복사하면 된다.
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className="px-1 text-sm font-medium text-foreground-muted">{t.reportTitle}</h3>

      {link && (
        <div className="flex flex-col gap-2 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4">
          <p className="text-sm font-semibold text-accent-gold-soft">{t.linkTitle}</p>
          <p className="text-xs leading-relaxed text-foreground-muted">{t.linkNote}</p>
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2 text-xs text-foreground"
          />
          <button
            type="button"
            onClick={() => void copyLink()}
            className="min-h-11 rounded-xl border border-accent-gold px-4 py-2 text-sm font-semibold text-accent-gold-soft"
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      {MANUAL_CHAPTER_KEYS.map((key) => {
        const text = chapters[key];
        return (
          <div key={key} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
            <h4 className="font-medium text-accent-gold-soft">{t.chapters[key].title}</h4>
            {text ? (
              <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">{text}</p>
            ) : failed.includes(key) ? (
              <p className="mt-2 text-sm text-foreground-muted">{t.chapterFailed}</p>
            ) : (
              <div className="mt-2 flex flex-col gap-2" aria-label={t.chapterLoading}>
                <p className="text-sm text-foreground-muted">{t.chapterLoading}</p>
                <div className="h-3 w-full animate-pulse rounded bg-background-elevated" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-background-elevated" />
              </div>
            )}
          </div>
        );
      })}

      {failed.length > 0 && (
        <button
          type="button"
          onClick={() => void load(failed as ManualChapterKey[])}
          className="min-h-12 rounded-xl border border-accent-gold px-4 py-3 text-sm font-semibold text-accent-gold-soft"
        >
          {t.retry}
        </button>
      )}
    </section>
  );
}

/** /en/report·/ja/report. 주소의 id·k로 리포트를 연다(링크가 틀렸으면 안내만 보여 준다). */
export function GlobalReportPage({ locale }: { locale: GlobalLocale }) {
  const t = GLOBAL_PAY_COPY[locale];
  const [params, setParams] = useState<{ id: string; k: string } | null | undefined>(undefined);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("id");
    const k = q.get("k");
    // 주소창 값은 마운트 뒤에야 알 수 있어(서버 렌더에는 없음) 효과에서 읽는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParams(id && k ? { id, k } : null);
  }, []);

  if (params === undefined) return null;
  if (params === null) return <p className="py-10 text-center text-sm text-foreground-muted">{t.invalidLink}</p>;
  return <GlobalReportView locale={locale} paymentId={params.id} accessKey={params.k} />;
}
