import { prisma } from "@/lib/db/prisma";
import { PRODUCT_CATALOG, isProductType } from "@/lib/payment/config";

// ntfy 푸시로 사장님 폰에 결제 알림을 보낸다(scripts/notify.py와 같은 ntfy 앱·주제).
// 카카오 "나에게 보내기"는 refresh_token이 두 달마다 만료돼 8/29 이후 조용히 끊겼던 일이 있어(11/16 확인),
// 만료 없는 ntfy를 함께 보낸다. NTFY_TOPIC이 없으면 아무것도 하지 않고, 실패해도 결제 처리에는 영향이 없다.
// 개인정보(이름·연락처·생년월일)는 절대 넣지 않는다.

const ADMIN_URL = "https://saju-app-three-dusky.vercel.app/admin";

export function productLabel(productType: string): string {
  return isProductType(productType) ? PRODUCT_CATALOG[productType].name : productType;
}

export function paymentChannel(paymentId: string): string {
  return paymentId.startsWith("toss-") ? "토스 앱" : "웹";
}

export function formatPaidMessage(
  order: { amount: number; productType: string; paymentId: string },
  today: { count: number; total: number } | null,
  now: Date = new Date(),
): string {
  const time = now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const lines = [`${order.amount.toLocaleString("ko-KR")}원 · ${productLabel(order.productType)} · ${paymentChannel(order.paymentId)}`];
  if (today) lines.push(`오늘 ${today.count}건 · ${today.total.toLocaleString("ko-KR")}원`);
  lines.push(time);
  return lines.join("\n");
}

export async function sendNtfy(
  title: string,
  message: string,
  opts: { priority?: number; tags?: string[] } = {},
): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return false;
  try {
    const res = await fetch(process.env.NTFY_SERVER || "https://ntfy.sh", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ topic, title, message, priority: opts.priority ?? 4, tags: opts.tags ?? [], click: ADMIN_URL }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (e) {
    console.error("ntfy 알림 전송 실패:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** 오늘(한국 시간) 유료 결제 건수·합계. 조회가 실패해도 알림은 보낸다. */
async function todayPaidSummary(): Promise<{ count: number; total: number } | null> {
  try {
    const kstMidnight = new Date(`${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}T00:00:00+09:00`);
    const agg = await prisma.order.aggregate({
      where: { status: "PAID", amount: { gt: 0 }, paidAt: { gte: kstMidnight } },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return { count: agg._count._all, total: agg._sum.amount ?? 0 };
  } catch {
    return null;
  }
}

export async function notifyPaid(order: { amount: number; productType: string; paymentId: string }): Promise<void> {
  if (order.amount <= 0) return; // 무료 풀이·묶음 내부 주문은 알리지 않는다.
  await sendNtfy("💰 사주랩 결제", formatPaidMessage(order, await todayPaidSummary()), { tags: ["moneybag"] });
}

export async function notifyPaymentFailed(order: { amount: number; productType: string }, reason: string): Promise<void> {
  const r = reason.length > 120 ? `${reason.slice(0, 120)}…` : reason;
  await sendNtfy("⚠️ 사주랩 결제 실패", `${order.amount.toLocaleString("ko-KR")}원 · ${productLabel(order.productType)}\n${r}`, {
    priority: 3,
    tags: ["warning"],
  });
}
