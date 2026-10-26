import https from "node:https";

// 토스 앱인토스 미니앱의 인앱 결제(IAP) 서버 검증.
// 미니앱이 결제 후 보낸 orderId를 그대로 믿지 않고, 토스 서버에 주문 상태를 직접 물어 확인한다(mTLS 필요).
// https://developers-apps-in-toss.toss.im/api/iap — POST /api-partner/v1/apps-in-toss/order/get-order-status

export type TossOrderStatus =
  | "MINIAPP_MISMATCH"
  | "NOT_FOUND"
  | "ORDER_IN_PROGRESS"
  | "PAYMENT_COMPLETED"
  | "PURCHASED"
  | "FAILED"
  | "REFUNDED"
  | "ERROR";

export interface TossOrderResult {
  orderId: string;
  status: TossOrderStatus;
  sku?: string;
}

export class TossIapError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "network" | "upstream" = "upstream",
  ) {
    super(message);
  }
}

const HOST = "apps-in-toss-api.toss.im";
const PATH = "/api-partner/v1/apps-in-toss/order/get-order-status";

/** 환경변수에서 PEM을 읽는다. 줄바꿈이 \n 글자로 들어와도, base64 한 줄로 넣어도 읽는다. */
export function readPemEnv(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) return trimmed.replace(/\\n/g, "\n");
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf8");
    return decoded.includes("BEGIN") ? decoded : null;
  } catch {
    return null;
  }
}

export function tossIapConfigured(): boolean {
  return !!readPemEnv(process.env.TOSS_MTLS_CERT) && !!readPemEnv(process.env.TOSS_MTLS_KEY) && !!process.env.TOSS_IAP_SKU_MANUAL;
}

/** 토스 서버로 주문 상태를 묻는 함수. 테스트에서는 deps로 대체한다. */
export type OrderStatusFetcher = (orderId: string) => Promise<unknown>;

function mtlsFetcher(orderId: string): Promise<unknown> {
  const cert = readPemEnv(process.env.TOSS_MTLS_CERT);
  const key = readPemEnv(process.env.TOSS_MTLS_KEY);
  if (!cert || !key) throw new TossIapError("토스 mTLS 인증서가 설정되지 않았습니다.", "config");

  const body = JSON.stringify({ orderId });
  const agent = new https.Agent({ cert, key, keepAlive: false });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: HOST,
        path: PATH,
        method: "POST",
        agent,
        timeout: 10_000,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((res.statusCode ?? 500) >= 500) return reject(new TossIapError(`토스 서버 오류(${res.statusCode})`, "upstream"));
          try {
            resolve(JSON.parse(text));
          } catch {
            reject(new TossIapError("토스 응답을 읽지 못했습니다.", "upstream"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new TossIapError("토스 서버 응답 시간 초과", "network")));
    req.on("error", (e) => reject(e instanceof TossIapError ? e : new TossIapError(`토스 서버 연결 실패: ${e.message}`, "network")));
    req.write(body);
    req.end();
  });
}

/** 토스 응답(JSON)을 우리가 쓰는 모양으로 정리한다. 모양이 다르면 에러로 막는다. */
export function parseOrderResponse(raw: unknown, orderId: string): TossOrderResult {
  const r = raw as { resultType?: string; success?: { orderId?: string; status?: string; sku?: string } | null } | null;
  if (!r || r.resultType !== "SUCCESS" || !r.success || typeof r.success.status !== "string") {
    throw new TossIapError("토스에서 주문 상태를 확인하지 못했습니다.", "upstream");
  }
  if (r.success.orderId && r.success.orderId !== orderId) {
    throw new TossIapError("토스 응답의 주문 번호가 요청과 다릅니다.", "upstream");
  }
  return { orderId, status: r.success.status as TossOrderStatus, sku: r.success.sku };
}

export async function fetchTossOrderStatus(orderId: string, fetcher: OrderStatusFetcher = mtlsFetcher): Promise<TossOrderResult> {
  return parseOrderResponse(await fetcher(orderId), orderId);
}

/** 결제가 끝난 주문인지(콘텐츠를 지급해도 되는 상태). 환불·실패·진행 중은 지급하지 않는다. */
export function isPaidStatus(status: TossOrderStatus): boolean {
  return status === "PAYMENT_COMPLETED" || status === "PURCHASED";
}

/** 판매 상품 한 가지(나 사용설명서 6장). 가격은 토스 콘솔에 등록한 판매가와 같아야 기록이 맞는다. */
export const TOSS_MANUAL_PRICE_KRW = 4895;

export function expectedSku(): string | null {
  return process.env.TOSS_IAP_SKU_MANUAL?.trim() || null;
}

// 2027 신년운세. 가격은 토스 콘솔에 등록한 판매가와 같아야 환불 점검·정산 기록이 맞는다.
// 2026-10-23 콘솔 등록: 공급가 3,540원 → 판매가 3,894원(공급가는 10원 단위만 가능해 3,900원은 불가).
// 환경변수 TOSS_IAP_PRICE_NEWYEAR로 재배포 없이 맞출 수도 있다.
export const TOSS_NEWYEAR_PRICE_KRW = 3894;

export interface TossProduct {
  kind: "manual" | "newYear";
  /** 우리 주문(Order)의 상품 타입. 웹과 같은 타입을 써서 기존 리포트 생성·조회 코드를 그대로 쓴다. */
  productType: "premium_report" | "new_year_report";
  amount: number;
}

function newYearPrice(): number {
  const fromEnv = Number(process.env.TOSS_IAP_PRICE_NEWYEAR);
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : TOSS_NEWYEAR_PRICE_KRW;
}

/**
 * 토스가 알려준 상품(sku)으로 어떤 상품인지 정한다. 클라이언트가 보낸 값은 쓰지 않는다.
 * 등록되지 않은 sku는 null — 지급하지 않는다. 환경변수가 비어 있으면 그 상품은 판매되지 않는다.
 */
export function resolveTossProduct(sku: string | undefined | null): TossProduct | null {
  const value = sku?.trim();
  if (!value) return null;
  if (value === expectedSku()) {
    return { kind: "manual", productType: "premium_report", amount: TOSS_MANUAL_PRICE_KRW };
  }
  const newYearSku = process.env.TOSS_IAP_SKU_NEWYEAR?.trim();
  if (newYearSku && value === newYearSku) {
    return { kind: "newYear", productType: "new_year_report", amount: newYearPrice() };
  }
  return null;
}

export function miniAppOrigins(): string[] {
  const fromEnv = (process.env.TOSS_MINIAPP_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return fromEnv.length > 0
    ? fromEnv
    : ["https://sajulab-app.apps.tossmini.com", "https://sajulab-app.private-apps.tossmini.com"];
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && miniAppOrigins().includes(origin) ? origin : null;
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, x-order-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}
