"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CONSULT_PLANS, type ConsultProductType } from "@/lib/consult/plans";
import { PAYMENTS_PAUSED } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";
import {
  DEFAULT_PERSON_VALUES,
  PersonBirthFields,
  isPersonComplete,
  personToSajuInput,
  type PersonFormValues,
} from "@/components/saju/PersonBirthFields";
import { ConsultConsent } from "./ConsultConsent";

const ORDER: ConsultProductType[] = ["newyear_plus", "premium_bundle", "consult_5"];

const PLAN_POINTS: Record<ConsultProductType, string[]> = {
  consult_5: ["궁금한 것 5가지를 내 사주로 바로 물어보기", "1년 안에 나눠서 써도 돼요"],
  newyear_plus: ["2027 신년운세 리포트(달별 흐름·조심할 시기)", "AI 상담 15회 · 1년 안에 나눠서", "신년운세와 상담을 함께 쓰는 구성"],
  premium_bundle: [
    "평생 사용설명서 6장 + 2027 신년운세",
    "가족 2명까지 함께 상담(배우자·자녀 등)",
    "30일 동안 하루 20개까지 마음껏 질문",
  ],
};

type Status = "idle" | "processing" | "confirming" | "error";

/** AI 사주 상담 상품 고르기 → 생년월일 → 동의 → 포트원 결제 → 상담방으로 이동.
 * 모바일 결제창이 리디렉션으로 돌아오면(?paymentId=) 결제 확인부터 이어서 한다. */
export function ConsultCheckout({ initialProduct }: { initialProduct?: ConsultProductType }) {
  const router = useRouter();
  const [product, setProduct] = useState<ConsultProductType>(initialProduct ?? "newyear_plus");
  const [forGift, setForGift] = useState(false);
  const [person, setPerson] = useState<PersonFormValues>(DEFAULT_PERSON_VALUES);
  const [giftFrom, setGiftFrom] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payMethod, setPayMethod] = useState<"CARD" | "EASY_PAY">("CARD");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resumed = useRef(false);

  async function complete(paymentId: string) {
    setStatus("confirming");
    const res = await fetch(`/api/orders/${encodeURIComponent(paymentId)}/complete`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.consultUrl) throw new Error(data.error ?? "결제 확인에 실패했어요. 잠시 후 새로고침해 주세요.");
    trackEvent("payment_success", { productType: data.productType ?? product });
    try {
      const saved = JSON.parse(localStorage.getItem("saju:consultPasses") ?? "[]") as string[];
      localStorage.setItem("saju:consultPasses", JSON.stringify([data.consultUrl, ...saved.filter((u) => u !== data.consultUrl)].slice(0, 10)));
    } catch {
      /* 저장소를 못 쓰는 브라우저면 넘어간다(상담방에서 링크 저장을 안내한다) */
    }
    router.push(`${data.consultUrl}&new=1`);
  }

  // 모바일 리디렉션 결제에서 돌아온 경우
  useEffect(() => {
    if (resumed.current) return;
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("paymentId");
    if (!paymentId) return;
    resumed.current = true;
    if (params.get("code")) {
      // 결제창에서 취소하고 돌아온 경우: 돌아온 주소의 값으로 한 번만 안내한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("error");
      setErrorMessage(params.get("message") ?? "결제가 취소되었어요.");
      return;
    }
    complete(paymentId).catch((e) => {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "결제 확인 중 오류가 발생했어요.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePurchase() {
    if (!agreed || !isPersonComplete(person)) return;
    const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
    const fail = (m: string) => {
      setStatus("error");
      setErrorMessage(m);
    };
    if (!storeId || !channelKey) return fail("결제 연동 준비중이에요.");
    if (!fullName.trim()) return fail("결제하시는 분 이름을 넣어 주세요.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("결제 확인 메일을 받을 이메일 주소를 넣어 주세요.");
    if (!/^01[0-9]{8,9}$/.test(phoneNumber.replace(/-/g, ""))) return fail("휴대폰 번호를 '-' 없이 정확히 넣어 주세요. (예: 01012345678)");

    trackEvent("checkout_start", { productType: product });
    setStatus("processing");
    setErrorMessage(null);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: product,
          birthInput: personToSajuInput(person),
          recipientName: person.name.trim() || undefined,
          giftFrom: forGift ? giftFrom.trim() || fullName.trim() : undefined,
          refundConsent: true,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "주문을 만들지 못했어요.");

      const { requestPayment } = await import("@portone/browser-sdk/v2");
      const response = await requestPayment({
        storeId,
        channelKey,
        paymentId: order.paymentId,
        orderName: order.orderName,
        totalAmount: order.amount,
        currency: "KRW",
        payMethod,
        ...(payMethod === "EASY_PAY" ? { easyPay: { easyPayProvider: "KAKAOPAY" } } : {}),
        customer: { email, phoneNumber: phoneNumber.replace(/-/g, ""), fullName: fullName.trim() },
        redirectUrl: `${window.location.origin}/consult?product=${product}`,
      });
      if (!response || response.code) throw new Error(response?.message ?? "결제가 취소되었어요.");
      await complete(response.paymentId);
    } catch (e) {
      fail(e instanceof Error ? e.message : "결제 중 오류가 발생했어요.");
      trackEvent("payment_fail", { productType: product });
    }
  }

  if (status === "confirming") {
    return (
      <div className="rounded-2xl border border-accent-gold/40 bg-accent-gold/10 px-4 py-8 text-center text-base text-foreground">
        결제를 확인하고 상담방을 여는 중이에요…
      </div>
    );
  }

  const plan = CONSULT_PLANS[product];
  const canPay = agreed && isPersonComplete(person) && status !== "processing" && !PAYMENTS_PAUSED;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        {ORDER.map((key) => {
          const p = CONSULT_PLANS[key];
          const selected = key === product;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setProduct(key)}
              aria-pressed={selected}
              className={`flex flex-col gap-1.5 rounded-2xl border px-4 py-4 text-left transition-colors ${
                selected ? "border-accent-gold bg-accent-gold/10" : "border-border-subtle bg-background-card/70"
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-foreground">{p.name}</span>
                <span className="shrink-0 text-lg font-bold text-accent-gold-soft">{p.amount.toLocaleString()}원</span>
              </span>
              <ul className="flex flex-col gap-0.5 text-sm leading-relaxed text-foreground-muted">
                {PLAN_POINTS[key].map((t) => (
                  <li key={t}>· {t}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {([
          [false, "내가 볼게요"],
          [true, "부모님·가족께 선물"],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setForGift(value)}
            aria-pressed={forGift === value}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium ${
              forGift === value ? "border-accent-gold bg-accent-gold/10 text-accent-gold-soft" : "border-border-subtle text-foreground-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <PersonBirthFields
        idPrefix="consult"
        title={forGift ? "선물 받으실 분의 생년월일" : "나의 생년월일"}
        nameOptionalLabel={forGift ? "받으실 분 성함 (선택)" : "이름 (선택)"}
        namePlaceholder="상담방에 이 이름으로 불러 드려요"
        value={person}
        onChange={setPerson}
      />

      {forGift && (
        <label className="flex flex-col gap-1.5 text-sm text-foreground-muted">
          보내는 사람 (상담방 첫 화면에 보여요)
          <input
            value={giftFrom}
            onChange={(e) => setGiftFrom(e.target.value)}
            maxLength={20}
            placeholder="예: 큰딸 민지"
            className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
          />
        </label>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">결제하시는 분</span>
        {[
          { v: fullName, set: setFullName, ph: "이름", type: "text", ac: "name" },
          { v: email, set: setEmail, ph: "이메일 (결제 확인용)", type: "email", ac: "email" },
          { v: phoneNumber, set: setPhoneNumber, ph: "휴대폰 번호 (01012345678)", type: "tel", ac: "tel" },
        ].map((f) => (
          <input
            key={f.ph}
            type={f.type}
            autoComplete={f.ac}
            value={f.v}
            onChange={(e) => f.set(e.target.value)}
            placeholder={f.ph}
            className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
          />
        ))}
        <div className="flex gap-2">
          {([
            ["CARD", "카드"],
            ["EASY_PAY", "카카오페이"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPayMethod(value)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                payMethod === value ? "border-accent-gold bg-accent-gold/10 text-accent-gold-soft" : "border-border-subtle text-foreground-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ConsultConsent checked={agreed} onChange={setAgreed} />

      {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
      {PAYMENTS_PAUSED && <p className="text-sm text-foreground-muted">지금은 결제를 잠시 멈췄어요. 곧 다시 열게요.</p>}

      <button
        type="button"
        onClick={() => void handlePurchase()}
        disabled={!canPay}
        className="rounded-2xl bg-accent-gold px-4 py-4 text-center text-lg font-bold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status === "processing" ? "처리 중..." : `${plan.amount.toLocaleString()}원 결제하고 상담 시작`}
      </button>
      {!isPersonComplete(person) && (
        <p className="-mt-3 text-center text-xs text-foreground-muted">생년월일·성별(시간을 모르면 ‘모름’ 체크)을 넣으면 결제할 수 있어요.</p>
      )}
    </div>
  );
}
