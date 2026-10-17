self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Akata Life — Benachrichtigung",
    body: "Neue Mitteilung von Hermes Agent.",
    url: "/",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.message || parsed.body || payload.body,
        url: parsed.actionUrl || parsed.url || "/",
      };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      vibrate: [200, 100, 200],
      data: { url: payload.url },
    })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (data && data.type === "SHOW_NOTIFICATION") {
    const title = data.title || "Akata Life";
    const body = data.message || data.body || "";
    const url = data.actionUrl || data.url || "/";
    self.registration.showNotification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      vibrate: [200, 100, 200],
      tag: data.id || undefined,
      data: { url },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
