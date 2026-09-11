// 재방문 유도(매일 오늘의 운세) 알림 전용 최소 서비스워커.
// 오프라인 캐싱 등은 하지 않는다 — 이 앱은 PWA 전면 오프라인 지원이 목표가 아니라
// 웹 푸시 수신 창구만 필요하기 때문이다.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "사주랩";
  const body = payload.body || "오늘의 운세를 확인해보세요 🔮";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
