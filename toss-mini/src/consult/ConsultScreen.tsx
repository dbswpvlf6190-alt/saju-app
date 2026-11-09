import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Analytics } from "@apps-in-toss/web-framework";
import type { SajuInput } from "@saju/types";
import type { ConsultPassRef } from "../iap";
import { addFamilyMember, askQuestion, fetchPass, splitFollowUps, type PassView } from "./api";
import { Icon } from "../Icon";

const MAX_CHARS = 300;
const STARTERS = [
  "올해 남은 기간, 돈 흐름은 어때요?",
  "2027년에 조심해야 할 달은 언제예요?",
  "저와 잘 맞는 일이나 장사는 어떤 쪽이에요?",
  "자녀(배우자)와 사이가 좋아지려면 어떻게 하면 좋을까요?",
];
const RELS = ["배우자", "아들", "딸", "어머니", "아버지", "형제자매", "손주", "기타"];

function track(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    void Analytics.log({ log_name: name, log_type: "event", params }).catch(() => {});
  } catch {
    /* 무시 */
  }
}

/** v15 AI 사주 상담방(토스). 큰 글씨·추천 질문 버튼·남은 횟수. 묶음 리포트는 기존 신년운세·사용설명서 화면으로 연다. */
export function ConsultScreen({
  pass,
  onBack,
  onOpenReport,
}: {
  pass: ConsultPassRef;
  onBack: () => void;
  /** 열었으면 true. 이 기기에 리포트가 없으면 false → 안내 문구를 보인다. */
  onOpenReport?: (kind: "ny" | "pr") => boolean;
}) {
  const [view, setView] = useState<PassView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState("owner");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reportMissing, setReportMissing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tmpSeq = useRef(0);

  const load = useCallback(async () => {
    try {
      setView(await fetchPass(pass.passId, pass.k));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "상담방을 열지 못했어요.");
    }
  }, [pass]);

  useEffect(() => {
    track("screen_consult", { product: pass.product });
    void load();
  }, [load, pass.product]);

  const messages = useMemo(() => (view?.messages ?? []).filter((m) => m.profileKey === profileKey), [view, profileKey]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const last = [...messages].reverse().find((m) => m.role === "assistant");
  const chips = last ? splitFollowUps(last.content).next : STARTERS;

  async function ask(text: string) {
    const q = text.trim();
    if (!q || sending || !view) return;
    setSending(true);
    setSendError(null);
    tmpSeq.current += 1;
    setView({ ...view, messages: [...view.messages, { id: `tmp-${tmpSeq.current}`, role: "user", content: q, profileKey }] });
    setQuestion("");
    const r = await askQuestion(pass.passId, pass.k, q, profileKey);
    if (r.error) {
      setSendError(r.error);
      setQuestion(q);
    } else {
      track("consult_ask", { product: pass.product });
    }
    await load();
    setSending(false);
  }

  if (loadError) {
    return (
      <main className="page">
        <section className="card">
          <p>{loadError}</p>
        </section>
        <button type="button" className="ghost" onClick={onBack}>돌아가기</button>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="page">
        <p className="muted" style={{ textAlign: "center", marginTop: 40 }}>상담방을 여는 중이에요…</p>
      </main>
    );
  }

  const fam = view.family.find((f) => f.key === profileKey);
  const who = profileKey === "owner" ? (view.ownerName ? `${view.ownerName} 님` : "나") : fam ? `${fam.rel}${fam.name ? ` ${fam.name}` : ""}` : "가족";
  const summary = profileKey === "owner" ? view.owner : fam?.summary;

  return (
    <main className="page consult-room">
      <header className="hero">
        <div className="eyebrow">사주명리학 전문 AI 상담</div>
        <h1>내 상담방</h1>
        <p>
          {view.quota.ok ? view.quota.remainingLabel : view.quota.message} · {new Date(view.expiresAt).toLocaleDateString("ko-KR")}까지
        </p>
      </header>

      {view.reports.length > 0 && onOpenReport && (
        <div className="consult-reports">
          {view.reports.map((r) => (
            <button key={r.kind} type="button" className="ghost" onClick={() => setReportMissing(!onOpenReport(r.kind))}>
              <Icon name="book" /> {r.title} 보기
            </button>
          ))}
        </div>
      )}
      {reportMissing && <p className="muted" style={{ fontSize: 14, textAlign: "center" }}>리포트는 결제한 기기에서 열 수 있어요. 결제한 폰에서 다시 열어 주세요.</p>}

      {(view.familyMax > 0 || view.family.length > 0) && (
        <div className="consult-tabs">
          {[{ key: "owner", label: view.ownerName ?? "나" }, ...view.family.map((f) => ({ key: f.key, label: `${f.rel}${f.name ? ` ${f.name}` : ""}` }))].map((p) => (
            <button key={p.key} type="button" className={`toggle small ${profileKey === p.key ? "on" : ""}`} onClick={() => setProfileKey(p.key)}>
              {p.label}
            </button>
          ))}
          {view.family.length < view.familyMax && (
            <button type="button" className="toggle small" onClick={() => setAdding((v) => !v)}>
              + 가족 추가 ({view.family.length}/{view.familyMax})
            </button>
          )}
        </div>
      )}

      {adding && (
        <FamilyForm
          onSubmit={async (rel, input, name) => {
            const key = await addFamilyMember(pass.passId, pass.k, rel, input, name);
            setAdding(false);
            await load();
            setProfileKey(key);
          }}
        />
      )}

      {summary && (
        <section className="card">
          <p style={{ fontSize: 15 }}>
            <b>{who}</b> · {summary.birth} · {summary.label}
          </p>
          <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{summary.metaphor}</p>
        </section>
      )}

      <div className="consult-msgs">
        {messages.length === 0 && <p className="bubble a">{who}의 사주를 바탕으로 답해 드릴게요. 아래 질문을 누르거나, 궁금한 것을 직접 적어 주세요.</p>}
        {messages.map((m) =>
          m.role === "user" ? (
            <p key={m.id} className="bubble q">{m.content}</p>
          ) : (
            <p key={m.id} className="bubble a">{splitFollowUps(m.content).body}</p>
          ),
        )}
        {sending && <p className="bubble a muted">사주를 살펴보며 답을 쓰는 중이에요… (10~20초)</p>}
        <div ref={bottomRef} />
      </div>

      {view.quota.ok && !sending && (
        <div className="consult-chips">
          {chips.map((c) => (
            <button key={c} type="button" className="ghost" onClick={() => void ask(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {sendError && <p className="muted" style={{ color: "#e3543f", textAlign: "center" }}>{sendError}</p>}

      {view.quota.ok ? (
        <div className="consult-input">
          <textarea value={question} rows={3} placeholder="궁금한 것을 편하게 적어 주세요" onChange={(e) => setQuestion(e.target.value.slice(0, MAX_CHARS))} />
          <p className="muted" style={{ fontSize: 12 }}>병명·계좌번호 같은 민감한 정보는 적지 말아 주세요.</p>
          <div className="row-between">
            <span className="muted" style={{ fontSize: 12 }}>
              {question.length}/{MAX_CHARS}
            </span>
            <button type="button" className="cta" disabled={sending || !question.trim()} onClick={() => void ask(question)}>
              물어보기
            </button>
          </div>
        </div>
      ) : (
        <section className="card">
          <p style={{ textAlign: "center" }}>{view.quota.message}</p>
        </section>
      )}

      <button type="button" className="ghost" onClick={onBack}>돌아가기</button>
      <p className="foot">{view.notice}</p>
    </main>
  );
}

function FamilyForm({ onSubmit }: { onSubmit: (rel: string, input: SajuInput, name?: string) => Promise<void> }) {
  const [rel, setRel] = useState("배우자");
  const [name, setName] = useState("");
  const [y, setY] = useState("");
  const [m, setM] = useState("");
  const [d, setD] = useState("");
  const [cal, setCal] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"female" | "male" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const digits = (v: string, n: number) => v.replace(/\D/g, "").slice(0, n);
  const ok = y.length === 4 && Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31 && gender;

  return (
    <section className="card">
      <h2>가족 등록</h2>
      <p className="muted" style={{ fontSize: 12 }}>가족 본인이 동의한 경우에만 등록해 주세요.</p>
      <select value={rel} onChange={(e) => setRel(e.target.value)} style={{ width: "100%", marginBottom: 10 }}>
        {RELS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <input placeholder="이름 (선택)" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
      <div className="date-row">
        <input inputMode="numeric" placeholder="예) 1990" value={y} onChange={(e) => setY(digits(e.target.value, 4))} />
        <em>년</em>
        <input inputMode="numeric" placeholder="월" value={m} onChange={(e) => setM(digits(e.target.value, 2))} />
        <em>월</em>
        <input inputMode="numeric" placeholder="일" value={d} onChange={(e) => setD(digits(e.target.value, 2))} />
        <em>일</em>
      </div>
      <div className="row cal-row">
        {(["solar", "lunar"] as const).map((c) => (
          <button key={c} type="button" className={`toggle small ${cal === c ? "on" : ""}`} onClick={() => setCal(c)}>
            {c === "solar" ? "양력" : "음력"}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        {(["female", "male"] as const).map((g) => (
          <button key={g} type="button" className={`toggle big ${gender === g ? "on" : ""}`} onClick={() => setGender(g)}>
            {g === "female" ? "여성" : "남성"}
          </button>
        ))}
      </div>
      {err && <p className="muted" style={{ color: "#e3543f", marginTop: 8 }}>{err}</p>}
      <button
        type="button"
        className="cta"
        style={{ marginTop: 12 }}
        disabled={!ok || busy}
        onClick={() => {
          if (!gender) return;
          setBusy(true);
          setErr(null);
          onSubmit(rel, { calendarType: cal, isLeapMonth: false, year: Number(y), month: Number(m), day: Number(d), gender }, name.trim() || undefined)
            .catch((e: unknown) => setErr(e instanceof Error ? e.message : "등록하지 못했어요."))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "등록 중..." : "등록하기"}
      </button>
      <p className="foot" style={{ marginTop: 8 }}>태어난 시간은 몰라도 돼요(시간 없이 풀어요)</p>
    </section>
  );
}
