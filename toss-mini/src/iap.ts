import { IAP } from "@apps-in-toss/web-framework";
import type { SajuInput } from "@saju/types";

// 인앱 결제(나 사용설명서 6장). 결제는 토스가 처리하고, 우리 서버는 토스에 주문 상태를 직접 확인한 뒤 리포트 접근 토큰을 준다.
// VITE_IAP_SKU(콘솔에 등록한 상품 SKU)가 없으면 구매 화면은 나오지 않는다.
export const IAP_SKU = import.meta.env.VITE_IAP_SKU as string | undefined;
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://saju-app-three-dusky.vercel.app";
const KEY_PURCHASES = "sajulab:iap:purchases:v2";
const KEY_PENDING = "sajulab:iap:pending:v1";
const T0 = Date.now();

interface LocalPending {
  orderId: string;
  input: SajuInput;
}

function readPending(): LocalPending[] {
  try {
    const arr = JSON.parse(read(KEY_PENDING) ?? "[]") as LocalPending[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function addPending(item: LocalPending) {
  const list = readPending().filter((p) => p.orderId !== item.orderId);
  list.push(item);
  write(KEY_PENDING, JSON.stringify(list));
}

function removePending(orderId: string) {
  write(KEY_PENDING, JSON.stringify(readPending().filter((p) => p.orderId !== orderId)));
}

/** 결제 단계 진단 기록(실패해도 무시). 사전 확인 요청이 없도록 text/plain으로 보낸다. */
function trace(stage: string, extra: Record<string, unknown> = {}) {
  try {
    void fetch(`${API_BASE}/api/toss/iap/trace`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ stage, ms: Date.now() - T0, ...extra }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 기록 실패는 무시 */
  }
}

function describeError(e: unknown): string {
  try {
    if (e instanceof Error) return `${e.name}: ${e.message}`;
    return JSON.stringify(e)?.slice(0, 300) ?? String(e);
  } catch {
    return String(e);
  }
}

export interface Purchase {
  paymentId: string;
  token: string;
}

export const CHAPTER_TITLES: Record<string, string> = {
  overview: "나의 기본 설계도",
  patterns: "내가 반복하는 선택",
  people: "사람 앞에서의 나",
  workmoney: "일과 돈에서의 나",
  timing: "지금 시기 사용법",
  actions: "오늘부터 해볼 3가지",
};

/** 구매 전 카드에 보여 주는 장별 한 줄(무엇을 얻는지). */
export const CHAPTER_PROMISES: Record<string, string> = {
  overview: "타고난 설계도와 내 성향의 근거",
  patterns: "왜 같은 선택을 반복하는지, 다르게 해볼 방법",
  people: "상대가 나를 오해하는 지점과 바로 쓸 말",
  workmoney: "일·돈에서 손해 보는 지점과 나만의 규칙",
  timing: "올해와 앞으로, 시작할 것·미룰 것",
  actions: "오늘 5분 안에 시작할 행동 3가지",
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장 실패해도 이번 화면에서는 그대로 쓴다 */
  }
}

/** 생일·성별이 같으면 같은 키. 구매한 리포트는 그 생일에만 연결된다. */
export function birthKey(i: SajuInput): string {
  return [i.calendarType, i.gender, i.year, i.month, i.day, i.hour ?? "x", i.minute ?? "x"].join("-");
}

function readPurchases(): Record<string, Purchase> {
  try {
    const all = JSON.parse(read(KEY_PURCHASES) ?? "{}") as Record<string, Purchase>;
    return all && typeof all === "object" ? all : {};
  } catch {
    return {};
  }
}

export function savedPurchaseFor(input: SajuInput): Purchase | null {
  const p = readPurchases()[birthKey(input)];
  return p && p.paymentId && p.token ? p : null;
}

function savePurchase(input: SajuInput, purchase: Purchase) {
  const all = readPurchases();
  all[birthKey(input)] = purchase;
  write(KEY_PURCHASES, JSON.stringify(all));
}

export function iapAvailable(): boolean {
  try {
    return !!IAP_SKU && IAP.createOneTimePurchaseOrder.isSupported();
  } catch {
    return false;
  }
}

/** 서버에 주문 번호를 보내 지급(접근 토큰 발급)을 요청한다. 성공해야만 true를 돌려 토스 주문이 "지급 완료"가 된다. */
async function grant(orderId: string, input: SajuInput): Promise<Purchase> {
  const started = Date.now();
  trace("grant_http_start");
  // text/plain은 브라우저의 사전 확인(OPTIONS) 요청 없이 바로 보낼 수 있다(서버는 본문을 JSON으로 읽는다).
  const res = await fetch(`${API_BASE}/api/toss/iap/grant`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ orderId, birthInput: input }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Purchase> & { error?: string };
  trace("grant_http_done", { status: res.status, took: Date.now() - started });
  if (!res.ok || !data.paymentId || !data.token) throw new Error(data.error ?? "지급하지 못했어요.");
  const purchase = { paymentId: data.paymentId, token: data.token };
  savePurchase(input, purchase);
  return purchase;
}

/**
 * 구매 시작. 결제창은 토스가 띄운다.
 * 결제 화면이 떠 있는 동안에는 앱의 통신 응답이 전달되지 않아(2026-10-20 실결제 2회 재현) 지급 콜백에서 서버를 기다리면
 * 토스가 시간 초과로 "문제가 생겼어요"를 띄운다. 그래서 콜백에서는 주문 번호를 기기에 먼저 저장하고 곧바로 true를 돌려주며,
 * 서버 지급(토스에 결제 여부를 직접 확인)은 결제 화면이 닫힌 뒤 success 이벤트에서 한다. 실패하면 미결 목록에 남아 다음에 다시 시도한다.
 */
export function buyManual(
  input: SajuInput,
  handlers: { onSuccess: (p: Purchase) => void; onError: (message: string) => void },
): () => void {
  trace("buy_start");
  try {
    const cleanup = IAP.createOneTimePurchaseOrder({
      options: {
        sku: IAP_SKU as string,
        processProductGrant: ({ orderId }) => {
          addPending({ orderId, input });
          trace("grant_enter_saved", { orderTail: orderId.slice(-6) });
          return true;
        },
      },
      onEvent: (e) => {
        trace("event", { type: e.type });
        if (e.type !== "success") return;
        const orderId = e.data.orderId;
        grant(orderId, input)
          .then((p) => {
            removePending(orderId);
            trace("grant_after_success_ok");
            handlers.onSuccess(p);
          })
          .catch((err) => {
            trace("grant_after_success_fail", { error: describeError(err) });
            handlers.onError("결제는 끝났어요. 사용설명서를 여는 중이에요. 잠시 후 앱을 다시 열면 이어져요.");
          });
      },
      onError: (e) => {
        trace("event_error", { error: describeError(e) });
        handlers.onError(e instanceof Error && e.message ? e.message : `결제를 마치지 못했어요. (${describeError(e).slice(0, 80)})`);
      },
    });
    return cleanup;
  } catch (e) {
    trace("buy_throw", { error: describeError(e) });
    handlers.onError(e instanceof Error ? e.message : "결제를 시작하지 못했어요.");
    return () => {};
  }
}

/**
 * 앱을 열 때 결제는 됐지만 지급이 안 끝난 주문을 찾아 이어서 지급한다(앱 종료·네트워크 오류 대비).
 * 서버는 같은 주문을 두 번 만들지 않으므로 여러 번 불러도 안전하다.
 */
export async function recoverPendingOrders(input: SajuInput | null): Promise<Purchase | null> {
  if (!IAP_SKU) return null;
  let recovered: Purchase | null = null;

  // 1) 기기에 남겨 둔 미결 주문(결제는 끝났지만 서버 지급이 안 끝난 것)
  for (const item of readPending()) {
    try {
      recovered = await grant(item.orderId, item.input);
      removePending(item.orderId);
      trace("recover_local_ok", { orderTail: item.orderId.slice(-6) });
    } catch (e) {
      trace("recover_local_error", { error: describeError(e) });
    }
  }

  // 2) 토스가 알려 주는 미결 주문(지급 완료 처리가 안 된 것)
  try {
    if (input && IAP.getPendingOrders.isSupported()) {
      const { orders } = await IAP.getPendingOrders();
      trace("recover_pending", { count: orders.length });
      for (const order of orders) {
        if (order.sku !== IAP_SKU) continue;
        try {
          recovered = await grant(order.orderId, input);
          if (IAP.completeProductGrant.isSupported()) {
            const done = await IAP.completeProductGrant({ params: { orderId: order.orderId } });
            trace("recover_complete", { done });
          }
        } catch (e) {
          trace("recover_error", { error: describeError(e) });
        }
      }
    }
  } catch {
    /* 복구 실패는 화면에 영향을 주지 않는다 */
  }
  return recovered;
}

export interface ManualProgress {
  done: number;
  total: number;
}

async function getJson(purchase: Purchase, query: string): Promise<{ status?: string; layout?: string; keys?: string[]; sections?: Record<string, string>; error?: string }> {
  const res = await fetch(`${API_BASE}/api/toss/iap/report?paymentId=${encodeURIComponent(purchase.paymentId)}&${query}`, {
    headers: { "x-order-token": purchase.token },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "리포트를 불러오지 못했어요.");
  return data;
}

/** 6장을 순서대로 불러온다(장마다 20~45초). 한 장이 끝날 때마다 onChapter로 알려 먼저 읽을 수 있게 한다. */
export async function loadManual(
  purchase: Purchase,
  onChapter: (key: string, text: string, progress: ManualProgress) => void,
): Promise<void> {
  const layout = await getJson(purchase, "layout=1");
  const keys = layout.keys ?? [];
  let done = 0;
  for (const key of keys) {
    let text = "";
    for (let attempt = 0; attempt < 3 && !text; attempt++) {
      try {
        const data = await getJson(purchase, `section=${encodeURIComponent(key)}`);
        text = data.sections?.[key] ?? "";
      } catch {
        if (attempt === 2) throw new Error("일부 장을 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
      }
    }
    done += 1;
    onChapter(key, text, { done, total: keys.length });
  }
}
