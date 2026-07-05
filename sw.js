// Archivo: sw.js
// Service Worker básico para mejorar la instalación y carga en móvil.

const CACHE_NAME = 'gescar-os-v5';
const APP_SHELL = [
    './',
    './index.html',
    './movil.html',
    './manifest.json',
    './styles.css',
    './app.js',
    './chat.js',
    './dashboard.js',
    './agenda.js',
    './vehiculos.js',
    './icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
    console.log('[GesCar OS] Service Worker instalado correctamente.');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const isSameOrigin = self.location.origin === new URL(request.url).origin;
    if (!isSameOrigin) return;

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match('./movil.html')));
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
                return response;
            }).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return undefined;
            });
        })
    );
});