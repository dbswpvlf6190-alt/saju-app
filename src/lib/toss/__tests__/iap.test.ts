import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TossIapError,
  corsHeaders,
  fetchTossOrderStatus,
  isPaidStatus,
  miniAppOrigins,
  parseOrderResponse,
  readPemEnv,
} from "../iap";

afterEach(() => vi.unstubAllEnvs());

const ok = (status: string, extra: Record<string, unknown> = {}) => ({
  resultType: "SUCCESS",
  success: { orderId: "ord-12345678", status, sku: "ait.x.manual", ...extra },
});

describe("토스 주문 응답 해석", () => {
  it("결제 완료 주문을 읽는다", () => {
    const r = parseOrderResponse(ok("PAYMENT_COMPLETED"), "ord-12345678");
    expect(r).toEqual({ orderId: "ord-12345678", status: "PAYMENT_COMPLETED", sku: "ait.x.manual" });
  });

  it("실패 응답·모양이 다른 응답은 에러로 막는다", () => {
    expect(() => parseOrderResponse({ resultType: "FAIL", error: { errorCode: "4095" } }, "ord-12345678")).toThrow(TossIapError);
    expect(() => parseOrderResponse(null, "ord-12345678")).toThrow(TossIapError);
    expect(() => parseOrderResponse({ resultType: "SUCCESS", success: {} }, "ord-12345678")).toThrow(TossIapError);
  });

  it("응답의 주문 번호가 요청과 다르면 막는다", () => {
    expect(() => parseOrderResponse(ok("PURCHASED", { orderId: "other-order" }), "ord-12345678")).toThrow(TossIapError);
  });

  it("fetcher를 거쳐 상태를 가져온다", async () => {
    const r = await fetchTossOrderStatus("ord-12345678", async () => ok("PURCHASED"));
    expect(r.status).toBe("PURCHASED");
  });
});

describe("지급 가능한 상태", () => {
  it("결제 완료·구매 완료만 지급한다", () => {
    expect(isPaidStatus("PAYMENT_COMPLETED")).toBe(true);
    expect(isPaidStatus("PURCHASED")).toBe(true);
    for (const s of ["ORDER_IN_PROGRESS", "FAILED", "REFUNDED", "NOT_FOUND", "MINIAPP_MISMATCH", "ERROR"] as const) {
      expect(isPaidStatus(s)).toBe(false);
    }
  });
});

describe("환경 설정", () => {
  it("PEM을 줄바꿈 글자나 base64로 넣어도 읽는다", () => {
    const pem = "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----";
    expect(readPemEnv(pem)).toBe(pem);
    expect(readPemEnv(pem.replace(/\n/g, "\\n"))).toBe(pem);
    expect(readPemEnv(Buffer.from(pem).toString("base64"))).toBe(pem);
    expect(readPemEnv("not a pem")).toBeNull();
    expect(readPemEnv(undefined)).toBeNull();
  });

  it("미니앱 출처만 CORS를 허용한다", () => {
    expect(corsHeaders("https://sajulab-app.apps.tossmini.com")["Access-Control-Allow-Origin"]).toBe("https://sajulab-app.apps.tossmini.com");
    expect(corsHeaders("https://evil.example.com")).toEqual({});
    expect(corsHeaders(null)).toEqual({});
  });

  it("출처 목록을 환경변수로 바꿀 수 있다", () => {
    vi.stubEnv("TOSS_MINIAPP_ORIGINS", "https://a.example, https://b.example");
    expect(miniAppOrigins()).toEqual(["https://a.example", "https://b.example"]);
  });
});
