self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Volleyball Update";
  const body = data.body || "You have a new update.";
  const teams = data.teams || [];

  const rootUrl = new URL("./", self.registration.scope).href;
  const options = {
    body,
    badge: "icons/icon-192.svg",
    icon: "icons/icon-192.svg",
    data: {
      url: rootUrl,
      teams
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    event.notification?.data?.url || new URL("./", self.registration.scope).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
