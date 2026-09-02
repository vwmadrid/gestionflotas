/*
 * Bloqueo por fin del periodo de pruebas.
 * Para desbloquear la app, cambia BLOQUEO_ACTIVO a false.
 */
(function () {
     const BLOQUEO_ACTIVO = true;
     const FECHA_FIN_PRUEBAS = '2026-09-01T23:59:59';
    const MENSAJE = 'El periodo de pruebas ha finalizado. La aplicacion no esta disponible.';

    function mostrarBloqueo() {
        if (document.getElementById('bloqueo-periodo-pruebas')) return;

        const bloqueo = document.createElement('div');
        bloqueo.id = 'bloqueo-periodo-pruebas';
        bloqueo.setAttribute('role', 'alert');
        bloqueo.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483647',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:24px',
            'background:#001e50',
            'color:#fff',
            'font-family:Arial,sans-serif',
            'text-align:center',
            'pointer-events:all'
        ].join(';');
        bloqueo.innerHTML = '<div style="width:min(440px,100%);"><h1 style="margin:0 0 16px;font-size:clamp(24px,5vw,38px);">Fin del periodo de pruebas</h1><p style="margin:0;font-size:17px;line-height:1.5;">' + MENSAJE + '</p></div>';

        document.body.replaceChildren(bloqueo);
        document.documentElement.style.overflow = 'hidden';
    }

    function comprobarPeriodo() {
        if (BLOQUEO_ACTIVO && Date.now() >= new Date(FECHA_FIN_PRUEBAS).getTime()) {
            mostrarBloqueo();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', comprobarPeriodo, { once: true });
    } else {
        comprobarPeriodo();
    }
})();
