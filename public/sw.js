// TulipDay Service Worker — Push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title ?? "TulipDay 🌷", {
      body:    data.body   ?? "",
      icon:    data.icon   ?? "/icons/icon-192.png",
      badge:   "/icons/icon-192.png",
      image:   data.image  ?? undefined,
      data:    { url: data.url ?? "/" },
      vibrate: [100, 50, 100],
      tag:     data.tag    ?? "tulipday",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
