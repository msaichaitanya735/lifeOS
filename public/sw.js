// LifeOS Service Worker
const CACHE_NAME = 'lifeos-v1'
const OFFLINE_URL = '/offline.html'

const PRECACHE = [
  '/',
  '/plan',
  '/log',
  '/stats',
  '/settings',
  '/manifest.json',
]

// ---- Install: pre-cache shell ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ---- Fetch: network-first for API, cache-first for assets ----
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API calls — always network, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Navigation — network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/')))
    )
    return
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return res
      })
    })
  )
})

// ---- Push notifications ----
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'LifeOS', body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: data.icon ?? '/icons/icon-192.png',
    badge: data.badge ?? '/icons/badge-72.png',
    data: data.data ?? {},
    tag: data.tag ?? 'lifeos',
    renotify: true,
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// ---- Notification click: open app ----
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

// ---- Background sync (future use) ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-logs') {
    // TODO: flush offline queue
    console.log('[SW] Background sync: sync-logs')
  }
})
