"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SajuInput, SajuResult } from "@/lib/saju/types";
import type { FreeCompatibility } from "@/lib/saju/compatibility";
import {
  COMPAT_INVITE_PARAM,
  type CompatInviteView,
  type MyCompatInvite,
} from "@/lib/compatInvite/shared";
import { saveLastBirthInfo } from "@/lib/revisit/localBirthInfo";
import {
  CompatibilityForm,
  type CompatibilityInviteValues,
  type CompatibilitySubmitValues,
} from "./CompatibilityForm";
import { CompatibilityResultView } from "./CompatibilityResultView";
import { CompatInviteWaiting } from "./CompatInviteWaiting";
import { CompatInviteeForm } from "./CompatInviteeForm";
import { trackEvent } from "@/lib/analytics/track";

const PENDING_KEY = "saju:pendingCompatibilityPurchase";

interface CompatibilityComputed {
  selfResult: SajuResult;
  partnerResult: SajuResult;
  free: FreeCompatibility;
}

type InviteMode = { role: "inviter" | "partner"; otherName: string };

/** 보낸 사람 화면에 띄울 기다리는 링크. */
interface WaitingInvite {
  code: string;
  inviterName: string;
  expiresAt: string;
  notifyRequested: boolean;
}

/** 링크를 받은 사람이 열었을 때의 화면 상태. */
type InviteeState =
  | { kind: "loading" }
  | { kind: "form"; code: string; inviterName: string }
  | { kind: "used"; inviterName: string }
  | { kind: "expired" };

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

async function fetchInviteView(code: string): Promise<CompatInviteView> {
  const res = await fetch(`/api/compat-invites/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error("링크 정보를 불러오지 못했어요.");
  return (await res.json()) as CompatInviteView;
}

export function CompatibilityFlow() {
  const [computed, setComputed] = useState<CompatibilityComputed | null>(null);
  const [names, setNames] = useState({ selfName: "", partnerName: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumePaymentId, setResumePaymentId] = useState<string | null>(null);
  const [inviteMode, setInviteMode] = useState<InviteMode | null>(null);
  const [waiting, setWaiting] = useState<WaitingInvite | null>(null);
  const [readyInvites, setReadyInvites] = useState<MyCompatInvite[]>([]);
  const [invitee, setInvitee] = useState<InviteeState | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToResult = () =>
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  const showInviteResult = useCallback((view: Extract<CompatInviteView, { status: "completed" }>) => {
    const { result, role } = view;
    setNames({ selfName: result.inviterName, partnerName: result.partnerName });
    setComputed({ selfResult: result.selfResult, partnerResult: result.partnerResult, free: result.free });
    setInviteMode({ role, otherName: role === "inviter" ? result.partnerName : result.inviterName });
    setWaiting(null);
    setInvitee(null);
    setReadyInvites([]);
    scrollToResult();
  }, []);

  const openInvite = useCallback(
    async (code: string) => {
      setInvitee({ kind: "loading" });
      try {
        const view = await fetchInviteView(code);
        if (view.status === "completed") {
          showInviteResult(view);
        } else if (view.status === "pending" && view.role === "inviter") {
          // 보낸 사람이 자기 링크를 연 경우 — 입력 폼 대신 기다리는 화면을 보여준다.
          setInvitee(null);
          setWaiting({ code, inviterName: view.inviterName, expiresAt: view.expiresAt, notifyRequested: false });
        } else if (view.status === "pending") {
          trackEvent("compat_invite_open", {});
          setInvitee({ kind: "form", code, inviterName: view.inviterName });
        } else if (view.status === "used") {
          setInvitee({ kind: "used", inviterName: view.inviterName });
        } else {
          setInvitee({ kind: "expired" });
        }
      } catch {
        setInvitee({ kind: "expired" });
      }
    },
    [showInviteResult],
  );

  useEffect(() => {
    trackEvent("compatibility_start", {});

    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    const pairCode = params.get(COMPAT_INVITE_PARAM);
    window.history.replaceState({}, "", window.location.pathname);

    if (pairCode) {
      // URL로 들어온 궁합 링크(외부 상태)를 마운트 때 한 번 읽어 그 화면을 여는 것이라 effect 안이 맞다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void openInvite(pairCode);
      return;
    }

    if (paymentId) {
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
      return;
    }

    // 궁합 메뉴에 다시 들어온 보낸 사람 — 기다리는 링크나 결과가 열린 링크가 있으면 먼저 보여준다.
    (async () => {
      try {
        const res = await fetch("/api/compat-invites/mine");
        const { invites } = (await res.json()) as { invites: MyCompatInvite[] };
        const ready = invites.filter((i) => i.status === "completed");
        const pending = invites.find((i) => i.status === "pending");
        setReadyInvites(ready);
        if (pending) {
          const view = await fetchInviteView(pending.code);
          if (view.status === "pending") {
            setWaiting({
              code: pending.code,
              inviterName: view.inviterName,
              expiresAt: pending.expiresAt,
              notifyRequested: pending.notifyRequested,
            });
          }
        }
      } catch {
        // 못 불러와도 새로 궁합을 보는 데는 지장이 없다.
      }
    })();
  }, [openInvite]);

  async function handleSubmit(values: CompatibilitySubmitValues) {
    setSubmitting(true);
    setError(null);
    try {
      const result = await calculateCompatibilityRemote(values.selfInput, values.partnerInput);
      setNames({ selfName: values.selfName, partnerName: values.partnerName });
      setComputed(result);
      setInviteMode(null);
      trackEvent("compatibility_complete", { relation: result.free.relation });
      scrollToResult();
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 다시 확인해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateInvite(values: CompatibilityInviteValues) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compat-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviterName: values.selfName, inviterInput: values.selfInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "링크를 만들지 못했어요.");
      trackEvent("compat_invite_create", {});
      setWaiting({ code: data.code, inviterName: values.selfName, expiresAt: data.expiresAt, notifyRequested: false });
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "링크를 만들지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInviteeSubmit(
    code: string,
    values: { partnerName: string; partnerInput: SajuInput },
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/compat-invites/${encodeURIComponent(code)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "궁합을 계산하지 못했어요.");
      // 받은 사람이 곧바로 "내 사주 보기"로 넘어갈 수 있게, 방금 넣은 정보를 이 기기에만 남겨둔다.
      saveLastBirthInfo({ name: values.partnerName, birthInput: values.partnerInput });
      trackEvent("compat_invite_complete", { relation: (data as { result: CompatibilityComputed }).result.free.relation });
      showInviteResult(data as Extract<CompatInviteView, { status: "completed" }>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "궁합을 계산하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setComputed(null);
    setResumePaymentId(null);
    setInviteMode(null);
    setInvitee(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const showMainForm = !computed && !invitee && !waiting;

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <div ref={formRef} className="flex w-full flex-col items-center gap-4 pt-4">
        {!computed &&
          readyInvites.map((invite) => (
            <button
              key={invite.code}
              type="button"
              onClick={() => void openInvite(invite.code)}
              className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border border-rose-300/50 bg-rose-300/10 px-4 py-3 text-left"
            >
              <span className="text-sm text-foreground">
                💌 {invite.partnerName ? `${invite.partnerName}님이` : "상대가"} 입력했어요! 두 사람 궁합 결과가 열렸어요
              </span>
              <span className="shrink-0 text-sm font-semibold text-accent-gold-soft">보기 →</span>
            </button>
          ))}

        {!computed && waiting && (
          <>
            <CompatInviteWaiting
              code={waiting.code}
              inviterName={waiting.inviterName}
              expiresAt={waiting.expiresAt}
              notifyRequested={waiting.notifyRequested}
              onCompleted={showInviteResult}
            />
            <button
              type="button"
              onClick={() => setWaiting(null)}
              className="text-sm text-foreground-muted underline underline-offset-4"
            >
              다른 사람과 새로 궁합 보기
            </button>
          </>
        )}

        {!computed && invitee?.kind === "form" && (
          <CompatInviteeForm
            inviterName={invitee.inviterName}
            submitting={submitting}
            errorMessage={error}
            onSubmit={(values) => void handleInviteeSubmit(invitee.code, values)}
          />
        )}

        {!computed && (invitee?.kind === "used" || invitee?.kind === "expired") && (
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-5 text-center">
            <p className="text-sm text-foreground">
              {inviteMessage(invitee)}
            </p>
            <button
              type="button"
              onClick={() => setInvitee(null)}
              className="rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
            >
              내 궁합 새로 보기
            </button>
          </div>
        )}

        {showMainForm && (
          <CompatibilityForm
            onSubmit={handleSubmit}
            onCreateInvite={(values) => void handleCreateInvite(values)}
            submitting={submitting}
            errorMessage={error}
          />
        )}
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
            invite={inviteMode ?? undefined}
          />
        </div>
      )}
    </div>
  );
}

function inviteMessage(state: { kind: "used"; inviterName: string } | { kind: "expired" }): string {
  if (state.kind === "expired") {
    return "유효기간이 지난 궁합 링크예요. 보낸 분에게 새 링크를 요청하거나, 직접 궁합을 볼 수 있어요.";
  }
  const sender = state.inviterName ? `${state.inviterName}님의` : "이";
  return `${sender} 궁합 링크는 이미 다른 분이 입력했어요. 궁합 결과는 두 분에게만 보여요.`;
}
