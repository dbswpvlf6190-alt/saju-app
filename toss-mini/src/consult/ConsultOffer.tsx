import { useEffect, useRef, useState } from "react";
import { Analytics } from "@apps-in-toss/web-framework";
import type { SajuInput } from "@saju/types";
import { CONSULT_PRODUCTS, buyProduct, iapAvailable, type ConsultProduct, type Purchase } from "../iap";
import { CONSULT_INFO, CONSULT_PRICE, won } from "./api";
export { consultAvailable } from "./api";

function track(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    void Analytics.log({ log_name: name, log_type: "event", params }).catch(() => {});
  } catch {
    /* 기록 실패는 무시 */
  }
}

function storeLabel(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "App Store 결제창이 열려요. Face ID나 암호로 확인하면 끝나요.";
  return "Google Play 결제창이 열려요. 지문이나 비밀번호로 확인하면 끝나요.";
}

/**
 * v15 AI 사주 상담 판매 카드.
 * 1단계: 상품 고르기 → 2단계: 결제 전 확인(금액 크게, 한 번만 결제·자동결제 없음, 어떤 결제창이 뜨는지, 환불 안내 동의) → 토스 결제.
 * v14까지는 버튼을 누르자마자 Google Play 결제창이 떠서 1~8초 만에 취소됐다(결제 시도 8 · 완료 0, 11/7~8). 결제창을 미리 알리는 단계를 둔다.
 */
export function ConsultOffer({
  input,
  initial = "consultNy",
  title = "내 사주로, 궁금한 것을 물어보세요",
  place,
  onPurchased,
  onFree,
}: {
  input: SajuInput;
  initial?: ConsultProduct;
  title?: string;
  place: string;
  onPurchased: (p: Purchase) => void;
  /** 결제를 그만둔 사람에게 보여 줄 무료 대안(있을 때만) */
  onFree?: () => void;
}) {
  const products = CONSULT_PRODUCTS.filter((p) => iapAvailable(p));
  const [picked, setPicked] = useState<ConsultProduct>(products.includes(initial) ? initial : products[0]);
  const [step, setStep] = useState<"pick" | "confirm">("pick");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  // 단계가 바뀌면 카드 머리(상품명·금액)가 화면에 보이게 올린다.
  useEffect(() => {
    if (step === "confirm") cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);
  if (products.length === 0) return null;
  const info = CONSULT_INFO[picked];
  const price = CONSULT_PRICE[picked];

  function pay() {
    if (!agreed) return;
    setBusy(true);
    setError(null);
    track("pay_notice_continue", { product: picked, place });
    buyProduct(
      picked,
      input,
      {
        onSuccess: (p) => {
          setBusy(false);
          track("consult_purchase", { product: picked, place });
          onPurchased(p);
        },
        onError: (message) => {
          setBusy(false);
          setError(message);
          track("consult_pay_fail", { product: picked, place });
        },
      },
      undefined,
      true,
    );
  }

  if (step === "confirm") {
    return (
      <section className="card consult-card" ref={cardRef}>
        <div className="eyebrow">결제 전에 확인해 주세요</div>
        <h2>{info.name}</h2>
        <p className="consult-price">{won(price)}</p>
        <ul className="consult-checks">
          <li>✓ 한 번만 결제해요 · 자동 결제 없어요</li>
          <li>✓ 결제하면 바로 상담방이 열려요</li>
          <li>✓ {storeLabel()}</li>
        </ul>
        <label className="consult-agree">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            <b>(필수)</b> 결제 즉시 제공이 시작되는 디지털 상품이에요. 열어 본 리포트와 이미 사용한 질문·이용일수는 환불되지 않는다는 점을 확인했어요. 환불은
            Google·Apple 환불 정책을 따라요.
          </span>
        </label>
        <button type="button" className="cta cta-big" disabled={!agreed || busy} onClick={pay}>
          {busy ? "결제창을 여는 중..." : `${won(price)} 결제하기`}
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => setStep("pick")}>
          다른 상품 보기
        </button>
        {error && (
          <div className="consult-fallback">
            <p>{error}</p>
            {onFree && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  track("pay_fallback_free", { place });
                  onFree();
                }}
              >
                괜찮아요, 무료 풀이부터 볼게요
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="card consult-card">
      <div className="eyebrow">사주명리학 전문 AI 상담</div>
      <h2>{title}</h2>
      <p className="muted" style={{ fontSize: 15 }}>묻는 질문마다 내 사주 흐름에 맞춰 바로 답해 드려요. 24시간 언제든, 기다림 없이.</p>
      <div className="consult-sample">
        <p className="q">“내년에 가게를 넓혀도 될까요?”</p>
        <p className="a">늦봄(5~6월)에 사람과 기회가 함께 들어오는 흐름이 보여요. 다만 초겨울엔 돈이 나가는 기운이 겹쳐…</p>
        <span>실제 답변 예시</span>
      </div>
      <div className="consult-options">
        {products.map((p) => (
          <button key={p} type="button" className={`consult-option ${picked === p ? "on" : ""}`} onClick={() => setPicked(p)}>
            <span className="row-top">
              <b>{CONSULT_INFO[p].name}</b>
              <em>{won(CONSULT_PRICE[p])}</em>
            </span>
            {CONSULT_INFO[p].badge && <span className="badge">{CONSULT_INFO[p].badge}</span>}
            <span className="pts">{CONSULT_INFO[p].points.join(" · ")}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="cta cta-big"
        onClick={() => {
          track("pay_notice_view", { product: picked, place });
          setStep("confirm");
        }}
      >
        {won(price)} · 상담 시작하기
      </button>
      <p className="foot" style={{ marginTop: 8 }}>질병·수명·주식 종목·로또 번호는 답하지 않아요 · 참고용이에요</p>
    </section>
  );
}
