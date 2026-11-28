import { prisma } from "@/lib/db/prisma";
import { isCustomerOrder } from "@/lib/admin/testOrders";

// 관리자 대시보드 데이터(2026-11-28 개편). 큰 숫자 4개 → 확인할 일 → 30일 추이 → 결제 흐름 → 유입·블로그·상품 → 최근 결제·실패 순서로 쓴다.
// 날짜는 모두 한국 시간(KST) 기준. DB의 createdAt은 UTC다.

const KST_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PRODUCT_LABEL: Record<string, string> = {
  new_year_report: "신년운세",
  premium_report: "나 사용설명서",
  single_section: "궁금한 것 하나",
  section_upgrade: "차액 업그레이드",
  compatibility_report: "궁합",
  consult_5: "AI 상담 5회",
  newyear_plus: "신년운세+상담",
  premium_bundle: "평생·가족·상담 묶음",
};

export type RangeKey = "today" | "7d" | "30d";
export const RANGE_LABEL: Record<RangeKey, string> = { today: "오늘", "7d": "최근 7일", "30d": "최근 30일" };

export function parseRange(value: string | undefined): RangeKey {
  return value === "today" || value === "30d" ? value : "7d";
}

/** UTC Date → KST 날짜 문자열(YYYY-MM-DD) */
export function kstDay(d: Date): string {
  return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10);
}

/** KST 기준 오늘 0시의 UTC 시각 */
function kstMidnight(now: Date): Date {
  return new Date(Date.parse(`${kstDay(now)}T00:00:00Z`) - KST_MS);
}

export function formatKst(d: Date | null): string {
  if (!d) return "-";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function meta(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const v = JSON.parse(json) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

/** 들어온 경로 이름. null이면 사이트 안에서 옮겨 다닌 것(방문으로 세지 않음). */
export function entryChannel(name: string, m: Record<string, unknown>): string | null {
  if (name === "y2027_view") {
    const from = str(m.from);
    if (from === "internal") return null;
    if (from === "blog") return "네이버 블로그";
    if (from === "naver_search") return "네이버 검색";
    if (from === "google") return "구글 검색";
    if (from === "daum") return "다음 검색";
    return "직접·기타";
  }
  // landing_view
  const ref = str(m.ref);
  if (!ref) return "직접·기타";
  if (ref.startsWith("y2027_") || ref === "home") return null; // /2027 페이지에서 넘어온 것 — 이미 y2027_view로 셈
  if (ref.startsWith("threads")) return "Threads";
  if (ref.startsWith("ig_")) return "인스타그램";
  if (ref.startsWith("blog")) return "네이버 블로그";
  if (ref.startsWith("share")) return "공유 링크";
  if (ref.startsWith("toss")) return "토스";
  return "기타 링크";
}

const EVENT_NAMES = [
  "landing_view",
  "y2027_view",
  "free_result_view",
  "premium_offer_seen",
  "premium_cta_click",
  "ny_teaser_view",
  "ny_paycard_seen",
  "ny_pay_open",
  "ny_pay_click",
  "checkout_start",
  "payment_success",
  "payment_fail_detail",
] as const;

export interface FunnelStep {
  label: string;
  count: number;
}

export interface Dashboard {
  range: RangeKey;
  generatedAt: Date;
  kpi: {
    revenue: number;
    revenuePrev: number;
    paid: number;
    paidPrev: number;
    visits: number;
    visitsPrev: number;
    checkouts: number;
    checkoutsPrev: number;
  };
  attention: { label: string; value: string; tone: "warn" | "info" }[];
  trend: { day: string; visits: number; paid: number; revenue: number }[];
  newYearFunnel: FunnelStep[];
  manualFunnel: FunnelStep[];
  channels: { key: string; count: number }[];
  blogPosts: { post: string; views: number; checkouts: number; paid: number }[];
  products: { label: string; web: number; toss: number; revenue: number }[];
  recentPaid: { when: Date | null; product: string; amount: number; where: string }[];
  failures: { when: Date; product: string; amount: number; reason: string }[];
  freeQuestions: number;
}

export async function getDashboard(range: RangeKey, now = new Date()): Promise<Dashboard> {
  const today0 = kstMidnight(now);
  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;
  const start = new Date(today0.getTime() - (days - 1) * DAY_MS);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const prevEnd = range === "today" ? new Date(now.getTime() - DAY_MS) : start; // 오늘은 '어제 같은 시각까지'와 비교
  const trendStart = new Date(today0.getTime() - 29 * DAY_MS);
  const loadFrom = new Date(Math.min(prevStart.getTime(), trendStart.getTime()));

  const [orders, events, pendingCount, recentReviews] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: loadFrom } },
      select: { paymentId: true, status: true, amount: true, productType: true, createdAt: true, paidAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.analyticsEvent.findMany({
      where: { name: { in: [...EVENT_NAMES] }, createdAt: { gte: loadFrom } },
      select: { name: true, metaJson: true, createdAt: true },
    }),
    prisma.order.count({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 30 * 60 * 1000) } } }),
    prisma.review.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
  ]);

  const inCur = (d: Date) => d >= start;
  const inPrev = (d: Date) => d >= prevStart && d < prevEnd;

  const customerPaid = orders.filter((o) => o.status === "PAID" && isCustomerOrder(o));
  const paidAt = (o: (typeof orders)[number]) => o.paidAt ?? o.createdAt;

  // 이벤트 한 번 훑으며 필요한 것 모두 센다.
  const curCount: Record<string, number> = {};
  let visits = 0;
  let visitsPrev = 0;
  let checkouts = 0;
  let checkoutsPrev = 0;
  let nyCheckouts = 0;
  let manualCheckouts = 0;
  const channels = new Map<string, number>();
  const trendVisits = new Map<string, number>();
  const posts = new Map<string, { views: number; checkouts: number; paid: number }>();
  const failReason = new Map<string, string>();
  const postOf = (src: string | undefined) => (src && src.startsWith("blog") && src.includes("~") ? src.split("~")[1] : undefined);
  const bumpPost = (post: string, field: "views" | "checkouts" | "paid") => {
    const row = posts.get(post) ?? { views: 0, checkouts: 0, paid: 0 };
    row[field] += 1;
    posts.set(post, row);
  };

  for (const e of events) {
    const m = meta(e.metaJson);
    const cur = inCur(e.createdAt);
    if (e.name === "payment_fail_detail") {
      const o = str(m.order);
      const r = str(m.reason);
      if (o && r && !failReason.has(o)) failReason.set(o, r);
      continue;
    }
    if (e.name === "landing_view" || e.name === "y2027_view") {
      const ch = entryChannel(e.name, m);
      if (ch) {
        if (cur) {
          visits += 1;
          channels.set(ch, (channels.get(ch) ?? 0) + 1);
        } else if (inPrev(e.createdAt)) visitsPrev += 1;
        if (e.createdAt >= trendStart) {
          const day = kstDay(e.createdAt);
          trendVisits.set(day, (trendVisits.get(day) ?? 0) + 1);
        }
      }
      if (cur && e.name === "y2027_view") bumpPost(str(m.post) ?? "", "views");
    }
    if (e.name === "checkout_start") {
      if (cur) {
        checkouts += 1;
        if (m.productType === "new_year_report") nyCheckouts += 1;
        if (m.productType === "premium_report") manualCheckouts += 1;
        const p = postOf(str(m.src));
        if (p) bumpPost(p, "checkouts");
      } else if (inPrev(e.createdAt)) checkoutsPrev += 1;
    }
    if (e.name === "payment_success" && cur) {
      const p = postOf(str(m.src));
      if (p) bumpPost(p, "paid");
    }
    if (cur) curCount[e.name] = (curCount[e.name] ?? 0) + 1;
  }

  const curPaid = customerPaid.filter((o) => inCur(paidAt(o)));
  const prevPaid = customerPaid.filter((o) => inPrev(paidAt(o)));
  const sum = (list: typeof orders) => list.reduce((a, o) => a + o.amount, 0);

  // 30일 추이(KST 날짜별)
  const trend: Dashboard["trend"] = [];
  for (let i = 0; i < 30; i++) {
    const day = kstDay(new Date(trendStart.getTime() + i * DAY_MS));
    const dayPaid = customerPaid.filter((o) => kstDay(paidAt(o)) === day);
    trend.push({ day, visits: trendVisits.get(day) ?? 0, paid: dayPaid.length, revenue: sum(dayPaid) });
  }

  const c = (n: string) => curCount[n] ?? 0;
  const paidOf = (types: string[]) => curPaid.filter((o) => types.includes(o.productType)).length;

  const productMap = new Map<string, { web: number; toss: number; revenue: number }>();
  for (const o of curPaid) {
    const label = PRODUCT_LABEL[o.productType] ?? o.productType;
    const row = productMap.get(label) ?? { web: 0, toss: 0, revenue: 0 };
    if (o.paymentId.startsWith("toss-")) row.toss += 1;
    else row.web += 1;
    row.revenue += o.amount;
    productMap.set(label, row);
  }

  const curFailed = orders.filter((o) => o.status === "FAILED" && inCur(o.createdAt) && isCustomerOrder(o));
  const curCanceled = orders.filter((o) => o.status === "CANCELED" && inCur(o.createdAt)).length;

  const attention: Dashboard["attention"] = [];
  if (curFailed.length) attention.push({ label: "결제 실패", value: `${curFailed.length}건`, tone: "warn" });
  if (pendingCount) attention.push({ label: "30분 넘게 결제 대기", value: `${pendingCount}건`, tone: "warn" });
  if (curCanceled) attention.push({ label: "취소·환불", value: `${curCanceled}건`, tone: "warn" });
  if (recentReviews) attention.push({ label: "최근 7일 새 후기", value: `${recentReviews}개`, tone: "info" });

  return {
    range,
    generatedAt: now,
    kpi: {
      revenue: sum(curPaid),
      revenuePrev: sum(prevPaid),
      paid: curPaid.length,
      paidPrev: prevPaid.length,
      visits,
      visitsPrev,
      checkouts,
      checkoutsPrev,
    },
    attention,
    trend,
    newYearFunnel: [
      { label: "2027 띠·나이 페이지", count: c("y2027_view") },
      { label: "신년운세 미리보기", count: c("ny_teaser_view") },
      { label: "결제 카드 보임", count: c("ny_paycard_seen") },
      { label: "1단계 버튼", count: c("ny_pay_open") },
      { label: "결제 버튼", count: c("ny_pay_click") },
      { label: "결제창 열림", count: nyCheckouts },
      { label: "결제 완료", count: paidOf(["new_year_report", "newyear_plus"]) },
    ],
    manualFunnel: [
      { label: "무료 결과 봄", count: c("free_result_view") },
      { label: "가격 안내 봄", count: c("premium_offer_seen") },
      { label: "자세히 보기 버튼", count: c("premium_cta_click") },
      { label: "결제창 열림", count: manualCheckouts },
      { label: "결제 완료", count: paidOf(["premium_report"]) },
    ],
    channels: [...channels.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    blogPosts: [...posts.entries()]
      .map(([post, v]) => ({ post: post || "(이름표 없는 옛 글)", ...v }))
      .sort((a, b) => b.paid - a.paid || b.checkouts - a.checkouts || b.views - a.views)
      .slice(0, 12),
    products: [...productMap.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.revenue - a.revenue),
    recentPaid: customerPaid.slice(0, 15).map((o) => ({
      when: o.paidAt,
      product: PRODUCT_LABEL[o.productType] ?? o.productType,
      amount: o.amount,
      where: o.paymentId.startsWith("toss-") ? "토스" : "웹",
    })),
    failures: curFailed.slice(0, 10).map((o) => ({
      when: o.createdAt,
      product: PRODUCT_LABEL[o.productType] ?? o.productType,
      amount: o.amount,
      reason: failReason.get(o.paymentId.slice(-8)) ?? "사유 기록 없음",
    })),
    freeQuestions: orders.filter((o) => o.paymentId.startsWith("tfree-") && inCur(o.createdAt)).length,
  };
}
