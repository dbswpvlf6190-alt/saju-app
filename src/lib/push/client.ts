/** VAPID 공개키(base64url)를 pushManager.subscribe에 필요한 Uint8Array로 변환한다.
 * 웹 푸시 표준에 정해진 변환 방식으로, 라이브러리 없이 직접 구현하는 게 일반적이다. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

/** 알림 권한을 요청하고 이 브라우저의 푸시 구독을 만든다. 거절하면 "denied"를 돌려준다.
 * 구독을 어디에 저장할지(매일 운세 / 궁합 결과 1회 알림)는 호출하는 쪽이 정한다. */
export async function subscribeBrowserPush(): Promise<PushSubscriptionJSON | "denied"> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
  });
  return subscription.toJSON();
}
