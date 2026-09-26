"use client";

import { useEffect, useState } from "react";
import { COMPAT_INVITE_PARAM, type CompatInviteView } from "@/lib/compatInvite/shared";
import { isPushSupported, subscribeBrowserPush } from "@/lib/push/client";
import { trackEvent } from "@/lib/analytics/track";
import { ShareButton } from "./ShareButton";

const POLL_MS = 8000;

/** 보낸 사람이 보는 "기다리는 중" 카드. 링크를 카톡으로 보내고, 상대가 입력하면 이 화면이
 * 열려 있는 동안 자동으로 결과로 넘어간다(화면이 보일 때만 확인한다). 창을 닫았다면 결과 알림을
 * 신청해둘 수 있다. */
export function CompatInviteWaiting({
  code,
  inviterName,
  expiresAt,
  notifyRequested,
  onCompleted,
}: {
  code: string;
  inviterName: string;
  expiresAt: string;
  notifyRequested: boolean;
  onCompleted: (view: Extract<CompatInviteView, { status: "completed" }>) => void;
}) {
  const [notifyState, setNotifyState] = useState<"idle" | "working" | "done" | "denied" | "error">(
    notifyRequested ? "done" : "idle",
  );
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    // 브라우저 지원 여부는 서버 렌더링 때 알 수 없어서 마운트 후에 확인한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushSupported(isPushSupported());
  }, []);

  useEffect(() => {
    let stopped = false;
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/compat-invites/${encodeURIComponent(code)}`);
        const view = (await res.json()) as CompatInviteView;
        if (!stopped && view.status === "completed") {
          stopped = true;
          clearInterval(id);
          onCompleted(view);
        }
      } catch {
        // 네트워크가 잠깐 끊겨도 다음 확인 때 다시 시도한다.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [code, onCompleted]);

  async function handleNotify() {
    setNotifyState("working");
    try {
      const subscription = await subscribeBrowserPush();
      if (subscription === "denied") {
        setNotifyState("denied");
        return;
      }
      const res = await fetch(`/api/compat-invites/${encodeURIComponent(code)}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error();
      trackEvent("compat_invite_notify", {});
      setNotifyState("done");
    } catch {
      setNotifyState("error");
    }
  }

  const sender = inviterName ? `${inviterName}님이` : "친구가";
  const until = new Date(expiresAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-dashed border-accent-gold bg-accent-gold/10 p-4">
      <h3 className="font-serif text-lg text-accent-gold-soft">💌 궁합 링크를 만들었어요</h3>
      <p className="text-sm leading-relaxed text-foreground-muted">
        상대에게 링크를 보내면, 상대가 생년월일을 넣는 순간 이 화면에서 결과가 열려요. 링크는 {until}까지 쓸 수
        있어요.
      </p>

      <ShareButton
        title="사주랩 궁합"
        text={`${sender} 우리 궁합 보자고 보냈어요 💌 내 생년월일만 넣으면 30초 만에 무료로 나와요.`}
        shareLabel="💬 카카오톡으로 궁합 링크 보내기"
        ctaLabel="내 정보 넣고 궁합 보기"
        sharePath="/compatibility"
        shareParams={{ [COMPAT_INVITE_PARAM]: code }}
        source="compat_invite"
      />

      {pushSupported && (
        <button
          type="button"
          onClick={() => void handleNotify()}
          disabled={notifyState === "working" || notifyState === "done"}
          className="rounded-xl border border-border-subtle px-4 py-3 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft disabled:opacity-70"
        >
          {notifyState === "done"
            ? "🔔 결과가 나오면 알려드릴게요"
            : notifyState === "working"
              ? "알림 신청 중..."
              : notifyState === "denied"
                ? "알림이 꺼져 있어요 · 브라우저 설정에서 켜주세요"
                : notifyState === "error"
                  ? "알림 신청에 실패했어요 · 다시 누르기"
                  : "🔔 결과 나오면 알림 받기"}
        </button>
      )}
      <p className="text-center text-xs text-foreground-muted">
        이 창을 닫아도 궁합 메뉴에 다시 들어오면 이어서 볼 수 있어요.
      </p>
    </div>
  );
}
