self.addEventListener('install', (evento) => {
    self.skipWaiting();
    console.log('[GesCar OS] Service Worker instalado correctamente.');
});

self.addEventListener('activate', (evento) => {
    console.log('[GesCar OS] Service Worker activado.');
});

// Chrome requiere que este evento exista para mostrar el botón de instalación
self.addEventListener('fetch', (evento) => {
    // No hacemos nada, solo pasamos la red normal
});
