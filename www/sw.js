// Archivo: sw.js
// Service Worker básico para cumplir los requisitos de instalación PWA

self.addEventListener('install', (evento) => {
    console.log('[GesCar OS] Service Worker instalado correctamente.');
});

self.addEventListener('fetch', (evento) => {
    // Aquí en el futuro podríamos programar el modo sin conexión, 
    // pero por ahora lo dejamos pasar todo para que funcione normal.
});