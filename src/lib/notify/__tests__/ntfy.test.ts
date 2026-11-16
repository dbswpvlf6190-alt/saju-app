import { describe, expect, it, vi, afterEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: { order: { aggregate: vi.fn() } } }));

import { formatPaidMessage, paymentChannel, productLabel, sendNtfy } from "../ntfy";

describe("ntfy 결제 알림", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("상품 이름과 결제 경로를 사람이 읽는 말로 바꾼다", () => {
    expect(productLabel("new_year_report")).toContain("신년운세");
    expect(productLabel("unknown_x")).toBe("unknown_x");
    expect(paymentChannel("toss-abc")).toBe("토스 앱");
    expect(paymentChannel("3429f-xyz")).toBe("웹");
  });

  it("금액·상품·경로·오늘 누적·시각만 담고 주문번호는 넣지 않는다", () => {
    const msg = formatPaidMessage(
      { amount: 3900, productType: "new_year_report", paymentId: "99fb2-secret-68314da1" },
      { count: 2, total: 7800 },
      new Date("2026-11-15T12:29:00Z"),
    );
    expect(msg).toContain("3,900원");
    expect(msg).toContain("웹");
    expect(msg).toContain("오늘 2건 · 7,800원");
    expect(msg).toContain("21:29");
    expect(msg).not.toContain("68314da1");
  });

  it("NTFY_TOPIC이 없으면 보내지 않는다", async () => {
    vi.stubEnv("NTFY_TOPIC", "");
    const spy = vi.spyOn(globalThis, "fetch");
    expect(await sendNtfy("t", "m")).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it("전송이 실패해도 예외를 던지지 않는다", async () => {
    vi.stubEnv("NTFY_TOPIC", "x");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendNtfy("t", "m")).toBe(false);
  });
});
