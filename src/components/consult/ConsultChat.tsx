"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics/track";
import { MAX_QUESTION_CHARS } from "@/lib/consult/safety";
import {
  DEFAULT_PERSON_VALUES,
  PersonBirthFields,
  isPersonComplete,
  personToSajuInput,
  type PersonFormValues,
} from "@/components/saju/PersonBirthFields";

interface Summary {
  label: string;
  metaphor: string;
  birth: string;
}
interface PassView {
  id: string;
  orderPaymentId: string;
  productName: string;
  ownerName: string | null;
  giftFrom: string | null;
  owner: Summary | null;
  family: { key: string; rel: string; name: string | null; summary: Summary }[];
  familyMax: number;
  expiresAt: string;
  quota: { ok: true; remainingLabel: string } | { ok: false; reason: string; message: string };
  reports: { kind: "ny" | "pr"; title: string }[];
  messages: { id: string; role: string; content: string; profileKey: string }[];
  notice: string;
}

const STARTERS = [
  "올해 남은 기간, 돈 흐름은 어때요?",
  "2027년에 조심해야 할 달은 언제예요?",
  "저와 잘 맞는 일이나 장사는 어떤 쪽이에요?",
  "자녀(배우자)와 사이가 좋아지려면 어떻게 하면 좋을까요?",
];
const RELS = ["배우자", "아들", "딸", "어머니", "아버지", "형제자매", "손주", "기타"];

/** 답변 끝의 "다음에 물어볼 만한 것: A / B"를 칩으로 꺼내고 본문에서는 뺀다. */
function splitFollowUps(text: string): { body: string; next: string[] } {
  const m = text.match(/\n?\s*다음에 물어볼 만한 것\s*[:：]\s*(.+)\s*$/);
  if (!m) return { body: text, next: [] };
  return {
    body: text.slice(0, m.index).trim(),
    next: m[1].split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean).slice(0, 3),
  };
}

export function ConsultChat({ passId, token, justPaid }: { passId: string; token: string; justPaid: boolean }) {
  const [view, setView] = useState<PassView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState("owner");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [addingFamily, setAddingFamily] = useState(false);
  const [famPerson, setFamPerson] = useState<PersonFormValues>(DEFAULT_PERSON_VALUES);
  const [famRel, setFamRel] = useState("배우자");
  const [famError, setFamError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tmpSeq = useRef(0);
  const k = encodeURIComponent(token);

  const load = useCallback(async () => {
    const res = await fetch(`/api/consult/${encodeURIComponent(passId)}?k=${k}${justPaid ? "&new=1" : ""}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setLoadError(data.error ?? "상담방을 열지 못했어요.");
      return;
    }
    setView(data as PassView);
  }, [passId, k, justPaid]);

  useEffect(() => {
    // 첫 로딩: 상담방 정보를 받아 오면 그때 상태를 채운다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const messages = useMemo(() => (view?.messages ?? []).filter((m) => m.profileKey === profileKey), [view, profileKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const lastAnswer = [...messages].reverse().find((m) => m.role === "assistant");
  const chips = lastAnswer ? splitFollowUps(lastAnswer.content).next : STARTERS;

  async function ask(text: string) {
    const q = text.trim();
    if (!q || sending || !view) return;
    setSending(true);
    setSendError(null);
    setView({ ...view, messages: [...view.messages, { id: `tmp-${(tmpSeq.current += 1)}`, role: "user", content: q, profileKey }] });
    setQuestion("");
    try {
      const res = await fetch(`/api/consult/${encodeURIComponent(passId)}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: token, question: q, profileKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "답변을 받지 못했어요.");
        setQuestion(q);
      } else {
        trackEvent("consult_ask", { charged: Boolean(data.charged) });
      }
    } catch {
      setSendError("연결이 끊겼어요. 잠시 후 다시 물어봐 주세요.");
      setQuestion(q);
    } finally {
      await load();
      setSending(false);
    }
  }

  async function addFamily() {
    if (!isPersonComplete(famPerson)) return;
    setFamError(null);
    const res = await fetch(`/api/consult/${encodeURIComponent(passId)}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ k: token, rel: famRel, name: famPerson.name.trim() || undefined, input: personToSajuInput(famPerson) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFamError(data.error ?? "가족을 등록하지 못했어요.");
      return;
    }
    setAddingFamily(false);
    setFamPerson(DEFAULT_PERSON_VALUES);
    await load();
    setProfileKey(data.key);
  }

  async function copyLink() {
    const url = `${window.location.origin}/consult/${passId}?k=${token}`;
    try {
      if (view?.giftFrom && navigator.share) {
        await navigator.share({ title: "AI 사주 상담 선물", text: `${view.giftFrom} 님이 보낸 AI 사주 상담이에요.`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      /* 공유 취소 */
    }
  }

  if (loadError) {
    return (
      <div className="flex w-full max-w-md flex-col gap-3 px-5 py-16 text-center">
        <p className="text-base text-foreground">{loadError}</p>
        <Link href="/my" className="text-sm text-accent-gold-soft underline underline-offset-4">
          카카오로 저장해 두셨다면 내 구매내역에서 찾기
        </Link>
      </div>
    );
  }
  if (!view) {
    return <div className="w-full max-w-md px-5 py-16 text-center text-base text-foreground-muted">상담방을 여는 중이에요…</div>;
  }

  const current =
    profileKey === "owner"
      ? { title: view.ownerName ? `${view.ownerName} 님` : "나", summary: view.owner }
      : (() => {
          const f = view.family.find((x) => x.key === profileKey);
          return { title: f ? `${f.rel}${f.name ? ` ${f.name}` : ""}` : "가족", summary: f?.summary ?? null };
        })();

  return (
    <div className="flex w-full max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1">
        <span className="text-sm text-accent-gold-soft">{view.productName}</span>
        <h1 className="font-serif text-xl text-foreground">AI 사주 상담방</h1>
        {view.giftFrom && <p className="text-base text-foreground">🎁 {view.giftFrom} 님이 보낸 상담이에요.</p>}
        <p className="text-sm text-foreground-muted">
          {view.quota.ok ? view.quota.remainingLabel : view.quota.message} · {new Date(view.expiresAt).toLocaleDateString("ko-KR")}까지
        </p>
      </header>

      {justPaid && (
        <div className="flex flex-col gap-2 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-4 text-sm leading-relaxed text-foreground">
          <strong className="text-base">
            {view.giftFrom ? "이 링크를 선물 받으실 분께 보내 주세요" : "이 상담방 주소를 꼭 저장해 두세요"}
          </strong>
          <span className="text-foreground-muted">
            링크만 있으면 언제든 다시 들어올 수 있어요. 카카오로 저장하면 휴대폰을 바꿔도 내 구매내역에서 찾을 수 있어요.
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => void copyLink()} className="flex-1 rounded-xl bg-accent-gold px-3 py-2.5 font-semibold text-[#1a1430]">
              {view.giftFrom ? "링크 보내기" : copied ? "복사했어요" : "링크 복사"}
            </button>
            <a
              href={`/api/auth/kakao/start?state=${encodeURIComponent(view.orderPaymentId)}`}
              className="flex-1 rounded-xl bg-[#fee500] px-3 py-2.5 text-center font-semibold text-[#1a1430]"
            >
              카카오로 저장
            </a>
          </div>
        </div>
      )}

      {view.reports.length > 0 && (
        <div className="flex gap-2">
          {view.reports.map((r) => (
            <Link
              key={r.kind}
              href={`/consult/${passId}/report/${r.kind}?k=${k}`}
              className="flex-1 rounded-xl border border-accent-gold/40 bg-background-card/70 px-3 py-3 text-center text-sm font-medium text-accent-gold-soft"
            >
              📜 {r.title} 보기
            </Link>
          ))}
        </div>
      )}

      {(view.familyMax > 0 || view.family.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {[{ key: "owner", label: view.ownerName ?? "나" }, ...view.family.map((f) => ({ key: f.key, label: `${f.rel}${f.name ? ` ${f.name}` : ""}` }))].map(
            (p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setProfileKey(p.key)}
                aria-pressed={profileKey === p.key}
                className={`rounded-full border px-3.5 py-1.5 text-sm ${
                  profileKey === p.key ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft" : "border-border-subtle text-foreground-muted"
                }`}
              >
                {p.label}
              </button>
            ),
          )}
          {view.family.length < view.familyMax && (
            <button
              type="button"
              onClick={() => setAddingFamily((v) => !v)}
              className="rounded-full border border-dashed border-accent-gold/60 px-3.5 py-1.5 text-sm text-accent-gold-soft"
            >
              + 가족 추가 ({view.family.length}/{view.familyMax})
            </button>
          )}
        </div>
      )}

      {addingFamily && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
          <select
            value={famRel}
            onChange={(e) => setFamRel(e.target.value)}
            className="rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground"
          >
            {RELS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <PersonBirthFields idPrefix="fam" title="가족 생년월일" nameOptionalLabel="이름 (선택)" value={famPerson} onChange={setFamPerson} />
          {famError && <p className="text-sm text-red-300">{famError}</p>}
          <button
            type="button"
            onClick={() => void addFamily()}
            disabled={!isPersonComplete(famPerson)}
            className="rounded-xl bg-accent-gold px-3 py-2.5 font-semibold text-[#1a1430] disabled:opacity-50"
          >
            등록하기
          </button>
        </div>
      )}

      {current.summary && (
        <div className="rounded-2xl border border-border-subtle bg-background-card/70 px-4 py-3 text-sm leading-relaxed text-foreground-muted">
          <strong className="text-foreground">{current.title}</strong> · {current.summary.birth} · {current.summary.label}
          <br />
          {current.summary.metaphor}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="rounded-2xl bg-background-elevated px-4 py-3 text-base leading-relaxed text-foreground">
            {current.title}의 사주를 바탕으로 답해 드릴게요. 아래 질문을 눌러 보거나, 궁금한 것을 직접 적어 주세요.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-br-sm bg-accent-gold/15 px-3.5 py-2.5 text-base text-foreground">
              {m.content}
            </p>
          ) : (
            <div key={m.id} className="flex flex-col gap-2 rounded-2xl rounded-bl-sm bg-background-elevated px-3.5 py-3 text-[17px] leading-relaxed text-foreground">
              <p className="whitespace-pre-line">{splitFollowUps(m.content).body}</p>
            </div>
          ),
        )}
        {sending && <p className="rounded-2xl bg-background-elevated px-4 py-3 text-base text-foreground-muted">사주를 살펴보며 답을 쓰는 중이에요… (10~20초)</p>}
        <div ref={bottomRef} />
      </div>

      {view.quota.ok && !sending && (
        <div className="flex flex-col gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void ask(c)}
              className="rounded-xl border border-accent-gold/40 px-3.5 py-2.5 text-left text-base text-accent-gold-soft"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {sendError && <p className="text-sm text-red-300">{sendError}</p>}

      {view.quota.ok ? (
        <div className="sticky bottom-0 flex flex-col gap-2 bg-background pb-3 pt-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION_CHARS))}
            rows={3}
            placeholder="궁금한 것을 편하게 적어 주세요"
            className="w-full resize-none rounded-xl border border-border-subtle bg-background-elevated px-3.5 py-3 text-base text-foreground outline-none focus:border-accent-gold"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-foreground-muted">
              {question.length}/{MAX_QUESTION_CHARS}
            </span>
            <button
              type="button"
              onClick={() => void ask(question)}
              disabled={sending || !question.trim()}
              className="rounded-xl bg-accent-gold px-6 py-3 text-base font-bold text-[#1a1430] disabled:opacity-50"
            >
              물어보기
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-border-subtle px-4 py-4 text-center text-base text-foreground">{view.quota.message}</p>
      )}

      <p className="text-center text-xs text-foreground-muted">{view.notice}</p>
    </div>
  );
}
