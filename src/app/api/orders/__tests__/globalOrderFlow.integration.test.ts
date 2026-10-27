import fs from "fs";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

// 해외 주문 전체 흐름(주문 생성 → 결제 확인 → 리포트 열람)을 로컬 테스트 DB로 확인하는 opt-in 통합 테스트.
// 실행: GLOBAL_E2E=1 npx vitest run src/app/api/orders/__tests__/globalOrderFlow.integration.test.ts
// .env.development.local의 DATABASE_URL이 노트북 안의 테스트 DB(localhost)일 때만 돈다. 포트원 결제 조회만 가짜로 대체하고
// 나머지(주문·검증·AI 생성·접근 토큰)는 실제 코드가 돈다. AI 호출 비용이 들어서 기본 실행에서는 건너뛴다.
const ENABLED = Boolean(process.env.GLOBAL_E2E);

vi.mock("@/lib/payment/config", async (orig) => ({ ...(await orig<typeof import("@/lib/payment/config")>()), GLOBAL_PAYMENTS_ENABLED: true }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }));

let portOneCurrency: string | undefined;
vi.mock("@/lib/payment/verify", async (orig) => ({
  ...(await orig<typeof import("@/lib/payment/verify")>()),
  // 방금 만든 주문과 같은 금액으로 결제가 끝났다고 답한다. 통화는 테스트가 바꿔 가며 확인한다.
  fetchPortOnePayment: async (paymentId: string) => {
    const { prisma } = await import("@/lib/db/prisma");
    const order = await prisma.order.findUniqueOrThrow({ where: { paymentId } });
    return { id: paymentId, status: "PAID", amount: { total: order.amount }, currency: portOneCurrency ?? order.currency };
  },
}));

const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
const BIRTH = { calendarType: "solar", gender: "female", year: 1992, month: 3, day: 14, hour: 14, minute: 0 };
const OUT = process.env.LIVE_OUT ?? "";

function cookieOf(res: Response): string {
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

describe.skipIf(!ENABLED)("해외 주문 전체 흐름 (로컬 테스트 DB)", () => {
  let orders: typeof import("@/app/api/orders/route");
  let detail: typeof import("@/app/api/orders/[paymentId]/route");
  let complete: typeof import("@/app/api/orders/[paymentId]/complete/route");
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let ip = 0;

  beforeAll(async () => {
    const env = fs.readFileSync(".env.development.local", "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && m[2] && !line.startsWith("#")) process.env[m[1]] = m[2];
    }
    if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? "")) throw new Error("테스트 DB(localhost)가 아니어서 중단합니다.");
    orders = await import("@/app/api/orders/route");
    detail = await import("@/app/api/orders/[paymentId]/route");
    complete = await import("@/app/api/orders/[paymentId]/complete/route");
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  const post = (body: unknown) =>
    orders.POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${++ip}` },
        body: JSON.stringify(body),
      }),
    );
  const get = (id: string, query = "", cookie = "") =>
    detail.GET(new NextRequest(`http://localhost/api/orders/${id}${query}`, { headers: cookie ? { cookie } : {} }), {
      params: Promise.resolve({ paymentId: id }),
    });
  const pay = (id: string, cookie: string) =>
    complete.POST(new NextRequest(`http://localhost/api/orders/${id}/complete`, { method: "POST", headers: { cookie, "x-forwarded-for": `10.1.0.${++ip}` } }), {
      params: Promise.resolve({ paymentId: id }),
    });

  it("잘못된 해외 요청은 거부한다(언어·상품)", async () => {
    expect((await post({ productType: "premium_report", locale: "fr", birthInput: BIRTH })).status).toBe(400);
    expect((await post({ productType: "compatibility_report", locale: "en", birthInput: BIRTH })).status).toBe(400);
    expect((await post({ productType: "single_section", locale: "ja", birthInput: BIRTH, sectionKey: "love" })).status).toBe(400);
  });

  it("국내(원화) 주문은 그대로: 통화 KRW, 4,900원, 링크 키 없음, ?k= 토큰으로는 못 연다", async () => {
    const res = await post({ productType: "premium_report", birthInput: BIRTH });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.currency).toBe("KRW");
    expect(data.amount).toBe(4900);
    expect(data.accessKey).toBeUndefined();
    const { signOrderAccessToken } = await import("@/lib/payment/orderAccess");
    const token = await signOrderAccessToken(data.paymentId);
    expect((await get(data.paymentId, `?layout=1&k=${token}`)).status).toBe(403);
  });

  it("결제 통화가 주문과 다르면 실패로 처리한다", async () => {
    const res = await post({ productType: "premium_report", locale: "en", birthInput: BIRTH });
    const data = await res.json();
    portOneCurrency = "KRW";
    const r = await pay(data.paymentId, cookieOf(res));
    portOneCurrency = undefined;
    expect(r.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { paymentId: data.paymentId } })).status).toBe("FAILED");
  });

  for (const [locale, currency, amount] of [
    ["en", "USD", 399],
    ["ja", "JPY", 580],
  ] as const) {
    it(`${locale}: 주문 → 결제 확인 → 링크 키로 6장 열람(${currency} ${amount})`, async () => {
      const res = await post({ productType: "premium_report", locale, birthInput: BIRTH });
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.currency).toBe(currency);
      expect(data.amount).toBe(amount);
      expect(typeof data.accessKey).toBe("string");
      const cookie = cookieOf(res);
      const row = await prisma.order.findUniqueOrThrow({ where: { paymentId: data.paymentId } });
      expect([row.currency, row.amount, row.status]).toEqual([currency, amount, "PENDING"]);

      expect((await pay(data.paymentId, cookie)).status).toBe(200);
      expect((await prisma.order.findUniqueOrThrow({ where: { paymentId: data.paymentId } })).status).toBe("PAID");

      // 쿠키 없이 링크 키만으로 연다(재열람). 키가 틀리면 막힌다.
      expect((await get(data.paymentId, "?layout=1&k=wrong")).status).toBe(403);
      const layout = await (await get(data.paymentId, `?layout=1&k=${data.accessKey}`)).json();
      expect(layout.layout).toBe("manual");
      expect(layout.keys).toHaveLength(6);

      const texts: Record<string, string> = {};
      const results = await Promise.all(
        layout.keys.map(async (key: string) => {
          const r = await get(data.paymentId, `?section=${key}&k=${data.accessKey}`);
          const body = await r.json();
          texts[key] = body.sections?.[key] ?? `FAILED ${r.status} ${body.error ?? ""}`;
          return r.status;
        }),
      );
      if (OUT) fs.writeFileSync(`${OUT}/e2e_${locale}.json`, JSON.stringify(texts, null, 2), "utf8");
      expect(results, JSON.stringify(Object.entries(texts).filter(([, v]) => v.startsWith("FAILED")))).toEqual([200, 200, 200, 200, 200, 200]);
      for (const key of layout.keys) expect(texts[key], `${locale}.${key}`).not.toMatch(HANGUL);

      // 두 번째 열람은 캐시에서 나와 같은 글이다(재생성하지 않는다).
      const again = await (await get(data.paymentId, `?section=overview&k=${data.accessKey}`)).json();
      expect(again.sections.overview).toBe(texts.overview);
    }, 300000);
  }
});
