import { IAP, getAnonymousKey } from "@apps-in-toss/web-framework";
import type { SajuInput } from "@saju/types";

// 인앱 결제(나 사용설명서 6장). 결제는 토스가 처리하고, 우리 서버는 토스에 주문 상태를 직접 확인한 뒤 리포트 접근 토큰을 준다.
// VITE_IAP_SKU(콘솔에 등록한 상품 SKU)가 없으면 구매 화면은 나오지 않는다.
export const IAP_SKU = import.meta.env.VITE_IAP_SKU as string | undefined;
// v11(2026-10-26): 상품이 둘이 됐다. manual = 나 사용설명서(위 SKU), newYear = 2027 신년운세(VITE_IAP_SKU_NEWYEAR, 콘솔 등록 SKU).
// 어떤 상품인지는 서버가 토스에서 받은 sku로 정하므로 앱은 "기기에 어느 칸에 저장할지"만 구분한다.
// v13(2026-11-05): newYearFirst = 신년운세 첫 구매 특가(같은 리포트, 낮은 가격 SKU, 이 기기에서 신년운세를 산 적 없을 때만),
// section = 궁금한 것 하나 풀이(주제 1가지, 첫 질문 무료). 둘 다 SKU가 없으면 화면에 나오지 않는다.
// v15(2026-11-08): AI 사주 상담 3종(consult5 4,950원 · consultNy 14,850원 · consultBundle 29,700원). 상담권은 서버(웹과 같은 상담방)에 있고,
// 묶음 리포트(신년운세·사용설명서)는 지급 응답의 토큰으로 기존 화면에서 연다.
export type Product = "manual" | "newYear" | "newYearFirst" | "section" | ConsultProduct;
export type ConsultProduct = "consult5" | "consultNy" | "consultBundle";
// 화면 순서(11/9 사장님): 비싼 묶음을 먼저 보여 주고, 가운데 신년운세+상담 15회를 추천·기본 선택으로 둔다.
export const CONSULT_PRODUCTS: ConsultProduct[] = ["consultBundle", "consultNy", "consult5"];
export const IAP_SKU_NEWYEAR = import.meta.env.VITE_IAP_SKU_NEWYEAR as string | undefined;
const IAP_SKU_NEWYEAR_FIRST = import.meta.env.VITE_IAP_SKU_NEWYEAR_FIRST as string | undefined;
const IAP_SKU_SECTION = import.meta.env.VITE_IAP_SKU_SECTION as string | undefined;
const SKU_OF: Record<Product, string | undefined> = {
  manual: IAP_SKU,
  newYear: IAP_SKU_NEWYEAR,
  newYearFirst: IAP_SKU_NEWYEAR_FIRST,
  section: IAP_SKU_SECTION,
  consult5: import.meta.env.VITE_IAP_SKU_CONSULT5 as string | undefined,
  consultNy: import.meta.env.VITE_IAP_SKU_CONSULT_NY as string | undefined,
  consultBundle: import.meta.env.VITE_IAP_SKU_CONSULT_BUNDLE as string | undefined,
};
export function isConsultProduct(p: Product): p is ConsultProduct {
  return p === "consult5" || p === "consultNy" || p === "consultBundle";
}
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://saju-app-three-dusky.vercel.app";
export const API_BASE_URL = API_BASE;
// 첫 구매 특가로 산 신년운세도 같은 칸(newYear)에 저장한다 — 화면에서는 똑같은 신년운세다.
const KEY_PURCHASES_OF: Record<Product, string> = {
  manual: "sajulab:iap:purchases:v2",
  newYear: "sajulab:iap:purchases:newyear:v1",
  newYearFirst: "sajulab:iap:purchases:newyear:v1",
  section: "sajulab:iap:purchases:section:v1",
  // 상담 상품은 생일별 칸 대신 상담권 목록(KEY_CONSULT_PASSES)에 저장한다. 이 칸은 쓰지 않는다.
  consult5: "sajulab:iap:purchases:consult:v1",
  consultNy: "sajulab:iap:purchases:consult:v1",
  consultBundle: "sajulab:iap:purchases:consult:v1",
};
const KEY_CONSULT_PASSES = "sajulab:consult:passes:v1";
const KEY_PENDING = "sajulab:iap:pending:v1";
const KEY_LAST_SECTION = "sajulab:iap:lastSection";
const KEY_FREE_SECTION = "sajulab:free-section:v1";

/** 궁금한 것 하나 풀이 주제(서버 single_section과 같은 키). 50대 이상이 많이 찾는 순서로 둔다. */
export type SectionTopic = "wealth" | "relationship" | "career" | "yearly" | "love";
export const SECTION_TOPICS: { key: SectionTopic; label: string; ask: string }[] = [
  { key: "wealth", label: "재물·돈", ask: "돈이 모이는 때와 새는 때가 궁금해요" },
  { key: "relationship", label: "가족·사람", ask: "가족·주변 사람과의 관계가 궁금해요" },
  { key: "career", label: "일·사업", ask: "일과 사업을 넓힐 때인지 궁금해요" },
  { key: "yearly", label: "올해 흐름", ask: "올해 무엇을 하고 무엇을 미룰지 궁금해요" },
  { key: "love", label: "연애·부부", ask: "연애·부부 사이가 궁금해요" },
];
const T0 = Date.now();

interface LocalPending {
  orderId: string;
  input: SajuInput;
  /** v11부터 기록. 없으면(v10까지 저장된 미결 주문) 사용설명서. */
  product?: Product;
  /** v13 궁금한 것 하나 풀이에서 고른 주제 */
  sectionKey?: SectionTopic;
  /** v15 상담 상품: 결제 전 확인 단계에서 환불 안내를 확인함 */
  refundConsent?: boolean;
}

/** v15 이 기기에 저장한 상담권(상담방 주소 값). 최근 것이 앞. */
export interface ConsultPassRef {
  passId: string;
  k: string;
  product: ConsultProduct;
  savedAt: string;
  /** 산 사람의 생일(v16). 다른 생일을 조회한 뒤에도 상담방의 묶음 리포트를 이 생일로 연다. */
  input?: SajuInput;
}
export function savedConsultPasses(): ConsultPassRef[] {
  try {
    const arr = JSON.parse(read(KEY_CONSULT_PASSES) ?? "[]") as ConsultPassRef[];
    return Array.isArray(arr) ? arr.filter((p) => p && p.passId && p.k) : [];
  } catch {
    return [];
  }
}
function saveConsultPass(ref: ConsultPassRef) {
  write(KEY_CONSULT_PASSES, JSON.stringify([ref, ...savedConsultPasses().filter((p) => p.passId !== ref.passId)].slice(0, 20)));
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

/** 손님에게 보이는 결제 오류 문구(11/7 v14). 토스 SDK가 준 한국어 문구는 그대로, 영어 오류 코드는 쉬운 문장으로 바꾼다. */
const FRIENDLY_PAY_ERROR = "결제창을 열지 못했어요. 토스 앱을 최신 버전으로 업데이트한 뒤 다시 눌러 주세요.";
function friendlyPayError(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  return /[가-힣]/.test(msg) ? msg : FRIENDLY_PAY_ERROR;
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
  /** v15 상담 상품을 샀을 때만: 상담방 주소 값 */
  consult?: { passId: string; k: string };
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

function readPurchases(product: Product): Record<string, Purchase> {
  try {
    const all = JSON.parse(read(KEY_PURCHASES_OF[product]) ?? "{}") as Record<string, Purchase>;
    return all && typeof all === "object" ? all : {};
  } catch {
    return {};
  }
}

/** 저장 칸 안의 키. 풀이(section)는 생일 + 주제마다 따로 산다. */
function slotKey(input: SajuInput, sectionKey?: SectionTopic): string {
  return sectionKey ? `${birthKey(input)}|${sectionKey}` : birthKey(input);
}

export function savedPurchaseFor(input: SajuInput, product: Product = "manual", sectionKey?: SectionTopic): Purchase | null {
  const p = readPurchases(product)[slotKey(input, product === "section" ? sectionKey : undefined)];
  return p && p.paymentId && p.token ? p : null;
}

function savePurchase(input: SajuInput, purchase: Purchase, product: Product, sectionKey?: SectionTopic) {
  const all = readPurchases(product);
  all[slotKey(input, product === "section" ? sectionKey : undefined)] = purchase;
  write(KEY_PURCHASES_OF[product], JSON.stringify(all));
}

/** 이 기기에서 신년운세를 한 번도 산 적이 없으면 첫 구매 특가를 보여 준다(특가 SKU가 있을 때만). */
export function firstNewYearOfferAvailable(): boolean {
  return iapAvailable("newYearFirst") && Object.keys(readPurchases("newYear")).length === 0;
}

/** 첫 질문 무료를 이미 받았는지(기기 기준. 서버도 토스 사용자 식별키로 한 번만 준다). */
export function freeSectionUsed(): boolean {
  return read(KEY_FREE_SECTION) === "used";
}

export function iapAvailable(product: Product = "manual"): boolean {
  // 개발 화면 전용: ?ny=1 이면 토스 밖에서도 신년운세가 켜진 화면을 미리 본다(배포 번들에는 영향 없음, 결제는 안 됨).
  if (import.meta.env.DEV && product !== "manual" && new URLSearchParams(location.search).get("ny") === "1") return true;
  try {
    return !!SKU_OF[product] && IAP.createOneTimePurchaseOrder.isSupported();
  } catch {
    return false;
  }
}

/** 토스가 알려 주는 미결 주문의 sku로 어느 상품인지 알아낸다. 모르는 sku면 null(건드리지 않는다). */
function productOfSku(sku: string | undefined): Product | null {
  if (sku && sku === IAP_SKU) return "manual";
  if (sku && sku === IAP_SKU_NEWYEAR) return "newYear";
  if (sku && sku === IAP_SKU_NEWYEAR_FIRST) return "newYearFirst";
  if (sku && sku === IAP_SKU_SECTION) return "section";
  for (const c of CONSULT_PRODUCTS) if (sku && sku === SKU_OF[c]) return c;
  return null;
}

/** 서버에 주문 번호를 보내 지급(접근 토큰 발급)을 요청한다. 성공해야만 true를 돌려 토스 주문이 "지급 완료"가 된다. */
async function grant(orderId: string, input: SajuInput, product: Product = "manual", sectionKey?: SectionTopic, refundConsent?: boolean): Promise<Purchase> {
  const started = Date.now();
  trace("grant_http_start");
  // text/plain은 브라우저의 사전 확인(OPTIONS) 요청 없이 바로 보낼 수 있다(서버는 본문을 JSON으로 읽는다).
  const res = await fetch(`${API_BASE}/api/toss/iap/grant`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      orderId,
      birthInput: input,
      ...(product === "section" ? { sectionKey } : {}),
      ...(isConsultProduct(product) ? { refundConsent: refundConsent === true } : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Purchase> & {
    error?: string;
    consult?: { passId: string; k: string };
    reports?: { newYear?: Purchase; manual?: Purchase };
  };
  trace("grant_http_done", { status: res.status, took: Date.now() - started });
  if (!res.ok || !data.paymentId || !data.token) throw new Error(data.error ?? "지급하지 못했어요.");
  const purchase: Purchase = { paymentId: data.paymentId, token: data.token };
  if (isConsultProduct(product)) {
    if (!data.consult) throw new Error("상담방을 만들지 못했어요. 잠시 후 앱을 다시 열면 이어져요.");
    saveConsultPass({ passId: data.consult.passId, k: data.consult.k, product, savedAt: new Date().toISOString(), input });
    // 묶음 리포트는 기존 신년운세·사용설명서 칸에 넣어, 결과 화면의 "열기" 버튼이 그대로 동작하게 한다.
    if (data.reports?.newYear) savePurchase(input, data.reports.newYear, "newYear");
    if (data.reports?.manual) savePurchase(input, data.reports.manual, "manual");
    return { ...purchase, consult: data.consult };
  }
  savePurchase(input, purchase, product, sectionKey);
  return purchase;
}

/**
 * 구매 시작. 결제창은 토스가 띄운다.
 * 결제 화면이 떠 있는 동안에는 앱의 통신 응답이 전달되지 않아(2026-10-20 실결제 2회 재현) 지급 콜백에서 서버를 기다리면
 * 토스가 시간 초과로 "문제가 생겼어요"를 띄운다. 그래서 콜백에서는 주문 번호를 기기에 먼저 저장하고 곧바로 true를 돌려주며,
 * 서버 지급(토스에 결제 여부를 직접 확인)은 결제 화면이 닫힌 뒤 success 이벤트에서 한다. 실패하면 미결 목록에 남아 다음에 다시 시도한다.
 */
export function buyProduct(
  product: Product,
  input: SajuInput,
  handlers: { onSuccess: (p: Purchase) => void; onError: (message: string) => void },
  sectionKey?: SectionTopic,
  refundConsent?: boolean,
): () => void {
  trace("buy_start", product === "manual" ? {} : { product });
  if (product === "section" && sectionKey) write(KEY_LAST_SECTION, sectionKey);
  try {
    const cleanup = IAP.createOneTimePurchaseOrder({
      options: {
        sku: SKU_OF[product] as string,
        processProductGrant: ({ orderId }) => {
          addPending({ orderId, input, product, sectionKey, refundConsent });
          trace("grant_enter_saved", { orderTail: orderId.slice(-6) });
          return true;
        },
      },
      onEvent: (e) => {
        trace("event", { type: e.type });
        if (e.type !== "success") return;
        const orderId = e.data.orderId;
        grant(orderId, input, product, sectionKey, refundConsent)
          .then((p) => {
            removePending(orderId);
            trace("grant_after_success_ok");
            handlers.onSuccess(p);
          })
          .catch((err) => {
            trace("grant_after_success_fail", { error: describeError(err) });
            handlers.onError(`결제는 끝났어요. ${PRODUCT_NAME[product]}를 여는 중이에요. 잠시 후 앱을 다시 열면 이어져요.`);
          });
      },
      onError: (e) => {
        trace("event_error", { error: describeError(e) });
        handlers.onError(friendlyPayError(e));
      },
    });
    return cleanup;
  } catch (e) {
    trace("buy_throw", { error: describeError(e) });
    handlers.onError(friendlyPayError(e));
    return () => {};
  }
}

const PRODUCT_NAME: Record<Product, string> = {
  manual: "사용설명서",
  newYear: "신년운세",
  newYearFirst: "신년운세",
  section: "풀이",
  consult5: "상담방",
  consultNy: "상담방",
  consultBundle: "상담방",
};

/** v10까지의 호출을 그대로 쓰는 사용설명서 구매. */
export function buyManual(
  input: SajuInput,
  handlers: { onSuccess: (p: Purchase) => void; onError: (message: string) => void },
): () => void {
  return buyProduct("manual", input, handlers);
}

/**
 * 앱을 열 때 결제는 됐지만 지급이 안 끝난 주문을 찾아 이어서 지급한다(앱 종료·네트워크 오류 대비).
 * 서버는 같은 주문을 두 번 만들지 않으므로 여러 번 불러도 안전하다.
 */
export async function recoverPendingOrders(input: SajuInput | null): Promise<Purchase | null> {
  if (!Object.values(SKU_OF).some(Boolean)) return null;
  let recovered: Purchase | null = null;

  // 1) 기기에 남겨 둔 미결 주문(결제는 끝났지만 서버 지급이 안 끝난 것). 상품 기록이 없는 옛 미결은 사용설명서.
  for (const item of readPending()) {
    try {
      recovered = await grant(item.orderId, item.input, item.product ?? "manual", item.sectionKey, item.refundConsent);
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
        const product = productOfSku(order.sku);
        if (!product) continue;
        try {
          // 토스 미결 목록에는 주제가 없어 마지막으로 고른 주제로 지급한다(기기 미결 목록이 있으면 위 1)에서 이미 처리됨).
          const lastSection = (read(KEY_LAST_SECTION) as SectionTopic | null) ?? "yearly";
          recovered = await grant(order.orderId, input, product, product === "section" ? lastSection : undefined);
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

/**
 * 신년운세 AI 글을 불러온다(한 번에 20~45초, 서버가 생성·저장하고 같은 글을 다시 돌려준다). 실패하면 두 번 더 시도한 뒤 에러.
 * 달별 카드(좋은 날짜·재물·가족·할 일)는 이 글과 상관없이 기기에서 바로 계산해 보여 주므로, 이 호출이 느려도 화면은 비지 않는다.
 */
export async function loadNewYear(purchase: Purchase): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await getJson(purchase, "section=newYear");
      const text = data.sections?.newYear ?? "";
      if (text) return text;
    } catch {
      /* 아래에서 다시 시도 */
    }
  }
  throw new Error("풀이 글을 아직 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
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

/**
 * 첫 질문 무료(v13): 토스 사용자 식별키로 서버에 0원 풀이를 한 번 받는다. 이미 받은 사람이면 처음 받은 주제의 풀이를 돌려준다.
 * 식별키를 못 받는 옛 토스 버전이면 무료 없이 유료 구매만 보인다.
 */
export async function claimFreeSection(input: SajuInput, sectionKey: SectionTopic): Promise<{ purchase: Purchase; sectionKey: SectionTopic }> {
  let anonKey = "";
  try {
    if (getAnonymousKey.isSupported()) {
      const r = await getAnonymousKey();
      if (r && typeof r === "object" && r.hash) anonKey = r.hash;
    }
  } catch {
    /* 아래에서 안내 */
  }
  if (!anonKey) throw new Error("이 토스 버전에서는 무료 풀이를 받을 수 없어요.");
  const res = await fetch(`${API_BASE}/api/toss/section/free`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ anonKey, birthInput: input, sectionKey }),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<Purchase> & { error?: string; sectionKey?: SectionTopic };
  if (!res.ok || !data.paymentId || !data.token) throw new Error(data.error ?? "무료 풀이를 받지 못했어요.");
  const got = data.sectionKey ?? sectionKey;
  const purchase = { paymentId: data.paymentId, token: data.token };
  savePurchase(input, purchase, "section", got);
  write(KEY_FREE_SECTION, "used");
  return { purchase, sectionKey: got };
}

export function freeSectionAvailable(): boolean {
  try {
    return !freeSectionUsed() && getAnonymousKey.isSupported();
  } catch {
    return false;
  }
}

/** 주제 하나 풀이 글(20~45초 생성). 실패하면 두 번 더 시도한다. */
export async function loadSection(purchase: Purchase, sectionKey: SectionTopic): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await getJson(purchase, `section=${encodeURIComponent(sectionKey)}`);
      const text = data.sections?.[sectionKey] ?? "";
      if (text) return text;
    } catch {
      /* 아래에서 다시 시도 */
    }
  }
  throw new Error("풀이 글을 아직 불러오지 못했어요. 잠시 후 다시 열어 주세요.");
}
