/* global self, clients */

/** Installability mínima — mantém handlers de push existentes. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca interceptar chunks do Next.js / Turbopack (HMR, "module factory is not available").
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("turbopack") ||
    url.searchParams.has("_rsc")
  ) {
    return;
  }

  // Pass-through: necessário para critérios de instalabilidade em alguns browsers.
  // Sem Cache API — só reencaminha a rede.
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  let data = { title: "Zé do Corte", body: "Nova notificação", url: "/admin" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data = { ...data, body: text };
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/images/logo.jpeg",
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin";
  const origin = self.location.origin;
  const target = url.startsWith("http") ? url : `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(target);
      }
      return undefined;
    }),
  );
});
