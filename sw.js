// Archivo: sw.js
// Service Worker básico para mejorar la instalación y carga en móvil.

const CACHE_NAME = 'gescar-os-v8';
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

const OFFLINE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexion</title></head><body style="font-family:system-ui,sans-serif;padding:24px;"><h1>Sin conexion</h1><p>No se pudo cargar la pagina. Revisa tu red e intentalo de nuevo.</p></body></html>`;

function responseVacia(status = 204) {
    return new Response('', { status });
}

function fallbackPorDestino(request) {
    const destination = request.destination || '';

    if (request.mode === 'navigate') {
        return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }

    if (destination === 'script') {
        return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
        });
    }

    if (destination === 'style') {
        return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'text/css; charset=utf-8' }
        });
    }

    if (destination === 'image') {
        return responseVacia(404);
    }

    return responseVacia(204);
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(async (cache) => {
                await Promise.all(APP_SHELL.map(async (asset) => {
                    try {
                        await cache.add(asset);
                    } catch (error) {
                        console.warn('[GesCar OS] No se pudo precachear:', asset, error);
                    }
                }));
            })
            .then(() => self.skipWaiting())
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

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const isSameOrigin = self.location.origin === new URL(request.url).origin;
    if (!isSameOrigin) return;

    const reqPath = new URL(request.url).pathname.toLowerCase();
    if (reqPath.endsWith('/favicon.ico') || reqPath === '/favicon.ico') {
        event.respondWith(
            caches.match('./icon.png')
                .then((cached) => cached || fetch('./icon.png'))
                .catch(() => responseVacia(204))
        );
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => caches.match(request)
                    .then((cached) => cached || caches.match('./movil.html'))
                    .then((cached) => cached || caches.match('./index.html'))
                    .then((cached) => cached || fallbackPorDestino(request)))
        );
        return;
    }

    const destination = request.destination;
    const isAppAsset = destination === 'script' || destination === 'style';
    if (isAppAsset) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || fallbackPorDestino(request)))
        );
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
                    return caches.match('./index.html').then((cached) => cached || fallbackPorDestino(request));
                }
                return fallbackPorDestino(request);
            });
        })
    );
});