// Service Worker my Wahou v6 : Auto-désinstallation en Dev Preview + Notifications Push/Arrière-plan en Production sans bloquer les navigations iframe
const CACHE_NAME = 'mywahou-cache-v6';
const STATIC_ICON_ASSETS = [
  '/manifest.json',
  '/bird-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

function isDevOrPreviewHost() {
  const host = (self.location && self.location.hostname) || '';
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('ais-dev-')
  );
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (!isDevOrPreviewHost()) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ICON_ASSETS).catch(() => {}))
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (isDevOrPreviewHost() || key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      } catch {}

      try {
        await self.clients.claim();
      } catch {}

      // En Preview AI Studio (ais-dev-* / localhost), se désenregistrer proprement pour ne jamais perturber l'iframe iOS/Safari
      if (isDevOrPreviewHost()) {
        try {
          await self.registration.unregister();
        } catch {}
      }
    })()
  );
});

// Réception de notifications Push même quand l'utilisateur n'est pas connecté / app fermée
self.addEventListener('push', (event) => {
  let payload = {
    title: 'my Wahou',
    body: 'Vous avez reçu un nouveau message ou appel sur my Wahou.',
    icon: '/bird-logo.png',
    badge: '/icon-192.png',
    tag: 'mywahou-push',
    url: '/'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    try {
      const text = event.data ? event.data.text() : '';
      if (text) payload.body = text;
    } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/bird-logo.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'mywahou-push',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: payload.url || '/' }
    })
  );
});

// Clic sur une notification système : ouvre ou ramène my Wahou au premier plan
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Messages envoyés depuis l'application pour déclencher des notifications OS fiables
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, url } = event.data.payload || {};
    event.waitUntil(
      self.registration.showNotification(title || 'my Wahou', {
        body: body || 'Nouvelle activité sur my Wahou',
        icon: icon || '/bird-logo.png',
        badge: '/icon-192.png',
        tag: tag || 'mywahou-msg',
        renotify: true,
        vibrate: [180, 90, 180],
        data: { url: url || '/' }
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  // Ne jamais intercepter les navigations HTML ni le mode Dev Preview :
  // garantit que les redirections d'authentification / iframe iOS Safari et Vite fonctionnent toujours à 100%
  if (isDevOrPreviewHost() || event.request.method !== 'GET' || event.request.mode === 'navigate') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.startsWith('/@') ||
    requestUrl.pathname.startsWith('/__') ||
    requestUrl.pathname.startsWith('/_aistudio') ||
    requestUrl.pathname.includes('node_modules') ||
    requestUrl.pathname.includes('/src/') ||
    requestUrl.search.includes('t=') ||
    requestUrl.search.includes('import')
  ) {
    return;
  }

  if (
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.ico') ||
    requestUrl.pathname === '/manifest.json'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || Response.error();
        })
    );
  }
});
