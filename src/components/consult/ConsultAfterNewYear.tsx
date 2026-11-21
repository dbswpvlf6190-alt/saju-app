"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SajuInput } from "@/lib/saju/types";
import { CONSULT_PLANS } from "@/lib/consult/plans";
import { saveConsultPrefill } from "@/lib/consult/prefill";
import { trackEvent } from "@/lib/analytics/track";

const EXAMPLES = ["좋다는 달에 이사·개업을 해도 될까요?", "조심할 달에는 돈 관리를 어떻게 할까요?", "자녀(배우자)와 2027년에 잘 지내려면요?"];

/**
 * 신년운세를 다 읽은 바로 아래(2026-11-21 주말 경영 C3): 읽고 생긴 궁금증을 AI 상담 5회로 이어 판다.
 * 블로그 손님 4명 모두 신년운세(3,900원)만 사고 끝나 1인당 매출이 3,900원에 멈춰 있었다. 생일은 sessionStorage로 넘겨 다시 입력하지 않게 한다.
 */
export function ConsultAfterNewYear({ input, name, place }: { input: SajuInput | null; name: string; place: "standalone" | "report" | "return" }) {
  const plan = CONSULT_PLANS.consult_5;
  const viewed = useRef(false);
  // input은 부모가 렌더마다 새 객체로 만들 수 있어 내용(문자열)으로 비교한다.
  const inputKey = input ? JSON.stringify(input) : "";
  useEffect(() => {
    if (inputKey) saveConsultPrefill(JSON.parse(inputKey) as SajuInput, name);
  }, [inputKey, name]);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent("consult_upsell_view", { place });
  }, [place]);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent-gold/50 bg-background-elevated p-5">
      <span className="text-sm font-medium text-accent-gold-soft">신년운세를 읽고 궁금한 점이 생겼다면</span>
      <strong className="font-serif text-xl leading-snug text-foreground">내 사주로, 바로 물어보세요</strong>
      <p className="text-base leading-relaxed text-foreground-muted">
        방금 본 2027년 흐름을 바탕으로, 궁금한 것을 적으면 사주명리학 전문 AI가 내 사주에 맞춰 답해 드려요.
      </p>
      <ul className="flex flex-col gap-1.5">
        {EXAMPLES.map((q) => (
          <li key={q} className="rounded-xl bg-background-card/80 px-3.5 py-2.5 text-base text-foreground">
            “{q}”
          </li>
        ))}
      </ul>
      <Link
        href={`/consult?product=consult_5&ref=ny_after_${place}`}
        onClick={() => trackEvent("consult_upsell_click", { place })}
        className="rounded-2xl bg-cta px-4 py-4 text-center text-lg font-bold text-cta-ink"
      >
        {plan.amount.toLocaleString()}원 · 질문 5개 물어보기
      </Link>
      <p className="text-center text-sm text-foreground-muted">
        {input ? "생일은 방금 넣은 그대로 이어져요 · " : ""}1년 안에 나눠서 써도 돼요
      </p>
    </section>
  );
}
