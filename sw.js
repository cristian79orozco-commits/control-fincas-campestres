// Service Worker para Fincas Campestres
// Permite instalación como PWA en Windows y gestión de notificaciones nativas

const CACHE_NAME = 'fc-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Fallo parcial en precaching:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Manejo de clics en Notificaciones Nativas del Sistema Operativo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Enfocar ventana activa de la aplicación o abrirla si está cerrada
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // Indicar a la ventana activa que cambie a la sección de cotizaciones
          try {
            client.postMessage({ type: 'FOCUS_COTIZACIONES' });
          } catch {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// Estrategia de red con fallback a caché para navegación fluida
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a Supabase y APIs externas
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Ignorar métodos no GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
