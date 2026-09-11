import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || "admin@example.com";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY 환경변수가 설정되지 않았습니다.");
  }
  webpush.setVapidDetails(`mailto:${CONTACT_EMAIL}`, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
}

/** 만료·구독취소된 브라우저 구독에 보내면 표준적으로 404/410이 온다 — 이 경우 재시도해도
 * 계속 실패하므로 그 자리에서 DB에서 지운다(다음날 또 실패하지 않도록). */
function isGoneStatus(err: unknown): boolean {
  const statusCode = (err as { statusCode?: number } | null)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function sendDailyFortunePush(): Promise<{ sent: number; failed: number; removed: number }> {
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany();
  const payload = JSON.stringify({
    title: "사주랩",
    body: "오늘의 운세가 도착했어요 🔮 지금 바로 확인해보세요",
    url: "/?ref=push_daily",
  });

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      if (isGoneStatus(err)) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        removed++;
      } else {
        failed++;
      }
    }
  }

  return { sent, failed, removed };
}
