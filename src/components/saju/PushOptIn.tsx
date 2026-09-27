"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/track";
import { isPushSupported, subscribeBrowserPush } from "@/lib/push/client";

const DISMISS_KEY = "saju:pushOptInDismissed";

type Status = "idle" | "subscribing" | "subscribed" | "denied" | "error";

/** 무료 결과를 다 본 시점(DailyFortuneCard 아래)에만 노출하는 낮은 강도의 재방문 유도
 * 배너 — 매일 아침 "오늘의 운세" 알림을 받을지 물어본다. 카카오톡 알림처럼 별도 사업자
 * 등록·심사가 필요한 채널 없이, 브라우저 표준 웹 푸시만으로 동작한다. */
export function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // 브라우저 지원 여부(navigator/Notification)는 서버에서 판단할 수 없어 마운트 후
    // 클라이언트에서만 확인 가능하다 — 최초 렌더 결과와 다를 수밖에 없는 값이다.
    const isSupported = isPushSupported();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isSupported);
    if (!isSupported) return;

    if (Notification.permission === "granted") {
      setStatus("subscribed");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    trackEvent("push_opt_in_view", {});
  }, []);

  async function handleEnable() {
    setStatus("subscribing");
    try {
      const subscription = await subscribeBrowserPush();
      if (subscription === "denied") {
        trackEvent("push_subscribe_denied", {});
        setStatus("denied");
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error("구독 저장에 실패했습니다.");

      trackEvent("push_subscribe", {});
      setStatus("subscribed");
    } catch {
      setStatus("error");
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (!supported || dismissed || status === "subscribed" || status === "denied") return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4 text-center">
      <p className="text-sm font-medium text-foreground">🔔 매일 아침, 오늘의 운세를 알림으로 받아볼래요?</p>
      <p className="text-xs text-foreground-muted">
        {status === "error" ? "알림 등록에 실패했어요. 잠시 후 다시 시도해 주세요." : "언제든 브라우저 설정에서 끌 수 있어요."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-xl border border-border-subtle px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
        >
          나중에
        </button>
        <button
          type="button"
          onClick={() => void handleEnable()}
          disabled={status === "subscribing"}
          className="rounded-xl bg-accent-gold px-3 py-2.5 text-sm font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "subscribing" ? "등록 중..." : "알림 받기"}
        </button>
      </div>
    </div>
  );
}
