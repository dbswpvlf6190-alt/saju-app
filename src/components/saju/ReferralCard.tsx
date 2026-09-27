"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import type { SajuResult } from "@/lib/saju";
import { resultToInput } from "@/lib/saju/types";
import type { WuxingPersona } from "@/lib/saju/persona";
import type { ReferralStatus } from "@/lib/referral/shared";
import { trackEvent } from "@/lib/analytics/track";
import { CopyableCode } from "@/components/admin/CopyableCode";
import { ShareButton } from "./ShareButton";
import { WuxingMascot } from "./WuxingMascot";

type ShareProps = Omit<ComponentProps<typeof ShareButton>, "inviteCode">;

// 처음 보는 브라우저에서 요청이 동시에 두 번 나가면 초대 코드가 두 개 생기고, 쿠키와 화면에
// 서로 다른 코드가 남을 수 있다(개발 모드의 이중 effect 실행이나 재마운트). 진행 중인 요청을
// 공유해서 한 번만 보낸다 — 끝난 뒤에는 비워서, 다시 열 때는 최신 진행 상황을 받는다.
let inflight: { key: string; promise: Promise<ReferralStatus | null> } | null = null;

function loadReferralStatus(result: SajuResult): Promise<ReferralStatus | null> {
  const birthInput = resultToInput(result);
  const key = JSON.stringify(birthInput);
  if (inflight?.key === key) return inflight.promise;

  const promise: Promise<ReferralStatus | null> = fetch("/api/referrals/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ birthInput }),
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then((data: { status: ReferralStatus | null }) => data.status)
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { key, promise };
  return promise;
}

/** 무료 결과 화면의 공유 자리. 공유 링크에 초대 코드를 붙이고, 친구 3명이 그 링크로 무료
 * 결과까지 보면 상세 분석 무료 쿠폰을 보여준다. 진행 상황을 못 불러오면(서버 오류 등)
 * 약속을 지킬 수 없으니 보상 안내 없이 기존 공유 버튼만 보여준다. */
export function ReferralCard({
  result,
  persona,
  share,
}: {
  result: SajuResult;
  persona: WuxingPersona;
  share: ShareProps;
}) {
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const rewardTracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadReferralStatus(result)
      .then((next) => {
        if (cancelled) return;
        setStatus(next);
        setLoadState(next ? "ready" : "failed");
      })
      .catch(() => {
        if (!cancelled) setLoadState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [result]);

  const reward = status?.coupon && !status.coupon.used ? status.coupon : null;

  useEffect(() => {
    if (reward && !rewardTracked.current) {
      rewardTracked.current = true;
      trackEvent("referral_reward_view", {});
    }
  }, [reward]);

  if (loadState === "failed" || status?.coupon?.used) {
    return <ShareButton {...share} />;
  }

  const count = status?.count ?? 0;
  const target = status?.target ?? 3;

  let title = `친구 ${target}명이 보면 상세 분석 무료`;
  if (reward) title = `친구 ${target}명 모두 확인했어요`;
  else if (count > 0) title = `친구 ${count}명 확인! ${target - count}명 남았어요`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-4">
      <h3 className="font-serif text-lg text-accent-gold-soft">{title}</h3>

      <div className="flex items-center gap-2">
        <WuxingMascot wuxing={result.dayPillar.ganWuxing} size={32} />
        <span className="text-xs font-medium text-accent-gold-soft">
          {persona.name} · {persona.role}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground">{reward ? persona.rewardLine : persona.inviteLine}</p>

      <div className="flex items-center gap-2" aria-label={`친구 ${count}명 / ${target}명`}>
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < count
                ? "bg-emerald-400 text-[#0f2216]"
                : "border border-dashed border-border-subtle text-foreground-muted"
            }`}
          >
            {i < count ? "✓" : i + 1}
          </span>
        ))}
        <span className="text-xs tabular-nums text-foreground-muted">
          {count} / {target}명
        </span>
      </div>

      {reward ? (
        <>
          <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-accent-gold bg-background-elevated/60 px-3 py-3">
            <CopyableCode code={reward.code} />
            <span className="text-xs text-foreground-muted">
              {new Date(reward.expiresAt).toLocaleDateString("ko-KR")}까지 · 1회용 · 눌러서 복사
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground-muted">
            위 결제 화면의 &ldquo;쿠폰 코드가 있으신가요?&rdquo;에 넣으면 상세 분석이 바로 열려요.
          </p>
        </>
      ) : (
        <p className="text-xs leading-relaxed text-foreground-muted">
          친구가 내 링크로 들어와 무료 사주 결과까지 보면 1명으로 쳐요. 같은 친구는 한 번만 세요.
        </p>
      )}

      <ShareButton {...share} inviteCode={status?.code} />
    </div>
  );
}
