self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const notification = {
    title: payload.title || "নতুন অর্ডার",
    body: payload.body || "নতুন অর্ডার এসেছে।",
    icon: "/apple-touch-icon.png",
    badge: "/favicon-32x32.png",
    tag: payload.tag || "new-order",
    data: { url: payload.url || "/admin/orders2" },
  };

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const visibleOrdersPage = windows.find((client) => client.visibilityState === "visible" && new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith("/admin/orders2"));
    if (visibleOrdersPage) {
      visibleOrdersPage.postMessage({ type: "order-push", orderId: payload.orderId, title: notification.title });
      return;
    }
    await self.registration.showNotification(notification.title, notification);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin/orders2", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin && "focus" in client);
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) await existing.navigate(targetUrl);
      return;
    }
    await self.clients.openWindow(targetUrl);
  })());
});
