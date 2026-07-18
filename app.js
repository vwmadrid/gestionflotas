/**
 * ============================================================================
 * PROYECTO: GesCar OS
 * COMPONENTES: GesCar OS Core, App GesCar OS Clientes, GesCar OS Renting
 * AUTORES: Manuel Arjona Carrera y Miriam Olmo Fernández (M2 Code Systems)
 * AÑO: 2026
 * ============================================================================
 * * Todos los derechos reservados.
 * Este código fuente es propiedad intelectual de M2 Code Systems.
 * Queda estrictamente prohibida su copia, distribución, modificación 
 * o uso no autorizado, total o parcial, sin el consentimiento expreso 
 * de los autores originales.
 * * ============================================================================
 */
// ==========================================
// ⚙️ NÚCLEO DE LA APLICACIÓN (APP.JS)
// ==========================================

// Variables globales de sesión y estado
window.usuarioActivo = "";
window.rolActivo = "";
window.userRole = ""; // Puente de compatibilidad
window.tabActiva = "logistica";

let activeTab = 'logistica'; 
let modoVistaActual = 'tarjetas'; 
let primeraCargaDb = true;
let unsubscribeFirebase = null; 
let unsubscribeMovimientos = null;
let todosLosCoches = []; 
let filtroActual = 'todos';
window.chatDestinoActual = ""; // Variable para el chat global
window.movimientosHistorial = [];


// 🔥 HERRAMIENTA CLAVE: Escapar variables
window.escapeJS = function(str) {
    return String(str || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
};

window.obtenerTimestamp = function() {
    return Date.now();
};

window.formatearFechaES = function(valor) {
    const fecha = valor instanceof Date ? valor : new Date(valor || Date.now());
    if (isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-ES');
};

window.matrizPermisosRoles = {
    entregas: { adelantar_peticion_transito: true, flujo_interdepartamental_transito: false },
    backoffice: { adelantar_peticion_transito: true, flujo_interdepartamental_transito: false },
    administracion: { adelantar_peticion_transito: true, flujo_interdepartamental_transito: false },
    admin: { adelantar_peticion_transito: true, flujo_interdepartamental_transito: false },
    taller: { adelantar_peticion_transito: false, flujo_interdepartamental_transito: true },
    recambios: { adelantar_peticion_transito: false, flujo_interdepartamental_transito: true }
};

window.esAdminGlobal = function() {
    const rol = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
    return rol === 'entregas';
};

window.tienePermiso = function(accion, contexto) {
    if (typeof window.esAdminGlobal === 'function' && window.esAdminGlobal()) return true;

    const rol = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
    const base = (window.matrizPermisosRoles[rol] && window.matrizPermisosRoles[rol][accion]) === true;
    if (!base) return false;

    if (accion !== 'flujo_interdepartamental_transito') return true;

    const ctx = contexto || {};
    const coche = ctx.coche || null;
    const deptoDestino = String(ctx.deptoDestino || '').toLowerCase().trim();

    if (!coche) return false;
    if (rol === 'taller') return deptoDestino === 'recambios' && coche.enTaller === true && coche.finTaller !== true;
    if (rol === 'recambios') return deptoDestino === 'taller' && coche.enRecambios === true && coche.finRecambios !== true;
    return false;
};

window.registrarMovimientoHistorial = async function(payload) {
    if (!window.db || !window.collection || !window.doc || !window.setDoc) return false;

    try {
        const ts = window.obtenerTimestamp();
        const ref = window.doc(window.collection(window.db, 'movimientos_historial'));
        const dataBase = {
            ts,
            fechaTexto: window.formatearFechaES(ts),
            usuario: window.usuarioActivo || 'SISTEMA',
            rol: window.rolActivo || '',
            origen: 'GesCar OS'
        };

        await window.setDoc(ref, Object.assign(dataBase, payload || {}));
        return true;
    } catch (errorMov) {
        console.warn('No se pudo registrar el movimiento en paralelo.', errorMov);
        return false;
    }
};

// Controla qué campos se muestran según el tipo de bloqueo
window.toggleBloqueoForm = function(val) {
    const campoFechaFin = document.getElementById('bv-fecha-fin');
    const contenedorHoras = document.getElementById('bv-hora-container');
    
    if (val === 'hora_suelta') {
        if (campoFechaFin) campoFechaFin.style.display = 'none';
        if (contenedorHoras) contenedorHoras.style.display = 'block';
    } else {
        if (campoFechaFin) campoFechaFin.style.display = 'inline-block';
        if (contenedorHoras) contenedorHoras.style.display = 'none';
    }
};

// ==========================================
// 🔒 SISTEMA DE ACCESO Y ROLES (ANTIBALAS)
// ==========================================

window.gestionarCamposLogin = function() {
    const depto = document.getElementById('selectDepartamento').value;
    const inputUser = document.getElementById('userLogin');
    const inputPass = document.getElementById('userPass');
    const btnLogin = document.getElementById('btnLoginAction');

    inputPass.classList.remove('hidden');
    btnLogin.classList.remove('hidden');
    inputUser.classList.remove('hidden');
    inputUser.value = ""; 

    if (depto === 'entregas') inputUser.placeholder = "Nombre (Ej: MANUEL, ANTONIO)";
    else if (depto === 'taller') inputUser.placeholder = "Operario Taller (Ej: MANUEL, ALVARO)";
    else if (depto === 'recambios') inputUser.placeholder = "Operario Recambios (Ej: JUAN, LUIS)";
    else if (depto === 'backoffice') inputUser.placeholder = "Nombre de Usuario";
    else if (depto === 'comercial') inputUser.placeholder = "Nombre Comercial (Ej: ROBERTO, MARINA)";
};

window.normalizarUsuarioLogin = function(valor) {
    return String(valor || '')
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
};

window.iniciar = async function() {
    const depto = document.getElementById('selectDepartamento').value;
    const usuarioInput = window.normalizarUsuarioLogin(document.getElementById('userLogin').value);
    const passInput = document.getElementById('userPass').value.trim();

    if (!depto || !usuarioInput || !passInput) {
        return Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor, completa la información requerida.' });
    }

    // 🔥 DICCIONARIO DE SEGURIDAD VIP
    const directorioPersonal = {
        "MANUEL.ARJONA": "entregas",
        "ANTONIO.BERMEJO": "entregas",
        "MANUEL.LOPEZ": "taller",
        "ALVARO.BELTRAN": "taller",
        "LORENA.LEOVEANU": "taller",
        "SERGIO.CABALLERO": "recambios",
        "FERNANDO.CRESPO": "recambios",
        "JAIME.JORGE": "recambios",
        "FERNANDO.REMON": "recambios",
        "ABRAHAM.CANIZARES": "recambios",
        "FATIMA.GARCIA": "backoffice",
        "GEMA.GOMEZ": "backoffice",
        "ALBERTO.GUTIERREZ": "backoffice",
        "RABAB.JAADAR": "backoffice",
        "RUBEN.GARCIA": "backoffice",
        "ROBERTO.ABAD": "comercial",
        "JORGE.AGUDO": "comercial",
        "BLANCA.SANCHEZ": "comercial",
        "ADRIA.HUGAS": "comercial",
        "JAVIER.MARTINEZ": "comercial",
        "MARINA.RODRIGUEZ": "comercial",
        "ALBA.DORIA": "comercial",
        "JOSEMARIA.MARTINEZ": "comercial",
    };
    
    let rolVerdadero = directorioPersonal[usuarioInput];

    // 🔥 EL TRUCO DEL USUARIO UNIVERSAL (CAMALEÓN)
    if (usuarioInput === "PRUEBAS") {
        rolVerdadero = depto; // El usuario maestro adopta automáticamente el rol del desplegable
    } else {
        // Para el resto del personal, aplicamos la seguridad estricta normal
        if (!rolVerdadero) {
            return Swal.fire({ icon: 'error', title: 'Usuario no reconocido', text: 'El nombre de usuario no está registrado en el sistema interno.' });
        }
        if (rolVerdadero !== depto) {
            return Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: `Seguridad: El usuario ${usuarioInput} no tiene permisos para entrar en el departamento de ${depto.toUpperCase()}.` });
        }
    }
    let emailSeguro = `${usuarioInput.toLowerCase()}@b2b.castellanawagen.es`;
    window.rolActivo = rolVerdadero; 
    window.usuarioActivo = usuarioInput;

    let btn = document.getElementById('btnLoginAction');
    let textoOriginal = btn.innerText;
    btn.innerText = "VERIFICANDO...";

    try {
        const userCredential = await window.signInWithEmailAndPassword(window.auth, emailSeguro, passInput);
        const user = userCredential.user;

        // 🔒 DETECTOR DE PRIMER ACCESO / CONTRASEÑA TEMPORAL
        if (passInput === "Castellana2026!" || passInput === "provisional123") { 
            const { value: nuevaPassword } = await Swal.fire({
                title: '🔑 Cambio de Clave Obligatorio',
                text: 'Por seguridad, debes sustituir la contraseña provisional por una clave secreta personal.',
                input: 'password',
                inputPlaceholder: 'Introduce tu nueva contraseña',
                allowOutsideClick: false,
                allowEscapeKey: false,
                confirmButtonColor: '#001e50',
                confirmButtonText: 'Actualizar Contraseña',
                inputValidator: (value) => {
                    if (!value || value.length < 6) {
                        return 'La contraseña debe tener al menos 6 caracteres';
                    }
                }
            });

            if (nuevaPassword) {
                await window.updatePassword(user, nuevaPassword);
                await Swal.fire('¡Actualizada!', 'Tu contraseña personal ha sido guardada de forma segura.', 'success');
            }
        }
        
        localStorage.setItem('vw_departamento', window.rolActivo);
        localStorage.setItem('vw_usuario', window.usuarioActivo);

        window.iniciarAppDirectamente(window.rolActivo, window.usuarioActivo);

    } catch (error) {
        console.error(error);
        let tituloError = 'Acceso Denegado';
        let textoError = 'No se ha podido iniciar sesión.';

        if (error?.code === 'auth/invalid-email') {
            textoError = `El usuario ${usuarioInput} no genera un correo válido de acceso.`;
        } else if (error?.code === 'auth/user-not-found') {
            textoError = `La cuenta ${emailSeguro} no existe en Firebase Auth. Revisa que esté creada exactamente con ese email.`;
        } else if (error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
            textoError = `La contraseña de ${emailSeguro} no es correcta.`;
        } else if (error?.code === 'auth/too-many-requests') {
            textoError = 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
        } else {
            textoError = `No se ha podido iniciar sesión con ${emailSeguro}. Verifica usuario, rol y contraseña.`;
        }

        Swal.fire({ icon: 'error', title: tituloError, text: textoError });
        btn.innerText = textoOriginal;
    }
};

window.aplicarPermisosPorRol = function() {
   if (window.rolActivo === "backoffice" || window.rolActivo === "comercial") {
        const botonesOcultar = document.querySelectorAll('#botonesLogistica, .btn-guardar, button[onclick*="guardar"], button[onclick*="eliminar"], button[onclick*="anadirVehiculoManual"], button[onclick*="abrirGestorVacaciones"], button[onclick*="generarListadoDiario"], #contenedorPendientesPedir, .seccion-pedir-campa');
        botonesOcultar.forEach(btn => {
            btn.style.setProperty('display', 'none', 'important');
        });
        
        const contenedoresMesa = document.querySelectorAll('#contenedorLogistica, #contenedorTarjetas, #contenedorTabla, #contenedorAgenda');
        contenedoresMesa.forEach(contenedor => {
            if (!contenedor) return;
            
            const campos = contenedor.querySelectorAll('input, select, textarea');
            campos.forEach(campo => {
                const idCampo = (campo.id || "").toLowerCase();
                const claseCampo = (campo.className || "").toLowerCase();
                
                if (idCampo !== 'buscadorinput' && !idCampo.includes('nota') && !claseCampo.includes('nota') && !idCampo.includes('chat')) {
                    campo.disabled = true;
                    campo.style.cursor = 'not-allowed';
                }
            });

            const botonesInternos = contenedor.querySelectorAll('button');
            botonesInternos.forEach(btn => {
                const clickAccion = (btn.getAttribute('onclick') || '').toLowerCase();
                
                // 🔥 SALVOCONDUCTO: Permitimos abrir chat, notas, citas y COPIAR al portapapeles
                if (!clickAccion.includes('abrirchat') && 
                    !clickAccion.includes('nota') && 
                    !clickAccion.includes('crearcitamanual') &&
                    !clickAccion.includes('pedirinst') &&
                    !clickAccion.includes('copiaralportapapeles')) { // <-- ¡Salvoconducto añadido!
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                    btn.style.cursor = 'not-allowed';
                    btn.style.pointerEvents = 'none';
                }
            });
        });
    }
};

window.iniciarAppDirectamente = function(rol, usuario) {
    const esDispositivoMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const esRutaMovil = window.location.pathname.toLowerCase().includes('movil.html');
    
    if (esDispositivoMovil && rol === 'entregas' && !esRutaMovil) {
        window.location.replace('./movil.html?v=8');
        return;
    }

    window.rolActivo = rol;
    window.userRole = rol; 
    window.usuarioActivo = usuario || rol;
    
    const roleBadge = document.getElementById('roleBadge');
    if (roleBadge) roleBadge.innerText = `${window.usuarioActivo} (${window.rolActivo})`;

    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) loginScreen.style.display = 'none';

    const sidebarApp = document.getElementById('sidebarApp');
    if (sidebarApp) sidebarApp.style.display = 'flex';

    const mainApp = document.getElementById('mainApp');
    if (mainApp) mainApp.style.display = 'flex';

    const contenedorTarjetas = document.getElementById('contenedorTarjetas');
    if (contenedorTarjetas) {
        contenedorTarjetas.style.display = 'grid';
        contenedorTarjetas.innerHTML = '<div class="text-center text-gray-500 py-8">Cargando vehículos...</div>';
    }
    
    window.cargar(); // Carga los coches de la app de forma normal
    if (typeof window.suscribirMovimientosHistorial === 'function') window.suscribirMovimientosHistorial();

    if (document.body?.dataset?.vista === 'movil' && typeof window.cambiarPestana === 'function') {
        setTimeout(() => window.cambiarPestana('agenda'), 250);
    }
    
    // 🔥 AQUÍ ESTÁ LA CLAVE: Enciende el chat general ahora que ya sabemos quién eres
    if (typeof window.cargarChatGlobal === 'function') {
        window.cargarChatGlobal();
    }

    if (rol === 'entregas' || rol === 'backoffice' || rol === 'comercial') {
        if (typeof window.iniciarMotorAlertas === 'function') { window.iniciarMotorAlertas(); }
        if (rol === 'backoffice' && typeof window.escucharNotificacionesBackOffice === 'function') {
            window.escucharNotificacionesBackOffice();
        }

        const tabsDpto = document.getElementById('tabsDpto');
        const tabsEntregas = document.getElementById('tabsEntregas');
        if (tabsDpto && tabsEntregas) {
            tabsDpto.classList.replace('flex', 'hidden');
            tabsEntregas.classList.replace('hidden', 'flex');
        }

        const botonesLogistica = document.getElementById('botonesLogistica');
        if (rol === 'entregas' && botonesLogistica) {
            botonesLogistica.classList.replace('hidden', 'flex');
        }

        window.cambiarPestana('todos');
    } else { 
        const tabsEntregas = document.getElementById('tabsEntregas');
        const tabsDpto = document.getElementById('tabsDpto');
        if (tabsEntregas) tabsEntregas.classList.replace('flex', 'hidden');
        if (tabsDpto) tabsDpto.classList.replace('hidden', 'flex');

        let icono = rol === 'taller' ? 'ph-wrench' : 'ph-package';
        const iconoDptoCurso = document.getElementById('iconoDptoCurso');
        if (iconoDptoCurso) iconoDptoCurso.className = `ph-bold ${icono} text-lg`;
        window.cambiarPestana('global-' + rol);
    }
};

window.cerrarSesion = function() { 
    localStorage.removeItem('vw_departamento'); 
    localStorage.removeItem('vw_usuario');
    location.reload(); 
};

// ==========================================
// 🚀 INICIO Y EVENTOS GLOBALES
// ==========================================

window.onload = function() {
    const rol = localStorage.getItem('vw_departamento');
    const usr = localStorage.getItem('vw_usuario');
    if (rol) { 
        window.iniciarAppDirectamente(rol, usr); 
    } else {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) loginScreen.style.display = 'flex';
        const mainApp = document.getElementById('mainApp');
        if (mainApp) mainApp.style.display = 'none';
    }

    const btnAbout = document.getElementById("btnAbout");
    const btnClose = document.getElementById("btnClose");
    const aboutModal = document.getElementById("aboutModal");

    if (btnAbout && aboutModal) {
        btnAbout.onclick = function() { aboutModal.style.display = "block"; };
    }
    if (btnClose && aboutModal) {
        btnClose.onclick = function() { aboutModal.style.display = "none"; };
    }
    if (aboutModal) {
        window.onclick = function(event) { if (event.target == aboutModal) { aboutModal.style.display = "none"; } };
    }

    window.addEventListener('error', function(event) {
        console.error('Global JS error:', event.error || event.message);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
    });
}; // <---- AQUÍ SE CIERRA CORRECTAMENTE EL ONLOAD

window.safeISOString = function(value) {
    let date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
};

window.mostrarErrorFirebase = function(error, titulo) {
    console.error('Alerta capturada:', error);
    let esErrorCritico = error && error.code === 'permission-denied';
    let mensaje = esErrorCritico 
        ? 'Permiso denegado en Firebase. Tu sesión podría haber caducado.' 
        : 'Se ha producido un pequeño error de interfaz. Revisa la consola (F12).';

    Swal.fire({
        icon: esErrorCritico ? 'error' : 'warning',
        title: titulo || 'Aviso del Sistema',
        text: mensaje,
        toast: !esErrorCritico,
        position: esErrorCritico ? 'center' : 'bottom-end',
        showConfirmButton: esErrorCritico,
        timer: esErrorCritico ? undefined : 4000
    });

    if (esErrorCritico) {
        if (document.getElementById('mainApp')) document.getElementById('mainApp').style.display = 'none';
        if (document.getElementById('sidebarApp')) document.getElementById('sidebarApp').style.display = 'none';
        if (document.getElementById('loginScreen')) document.getElementById('loginScreen').style.display = 'flex';
    }
};

window.toggleSubmenu = function(menuId, btnElement) {
    const menu = document.getElementById(menuId);
    const chevron = btnElement.querySelector('.chevron-icon');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
        chevron.style.transform = 'rotate(180deg)'; 
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        chevron.style.transform = 'rotate(0deg)'; 
    }
};
// ==========================================
// 🕵️ ANALÍTICA SILENCIOSA (M2 CODE SYSTEMS)
// ==========================================
window.registrarMetricaM2 = async function(campo) {
    try {
        // Apuntamos a un documento oculto exclusivo para vosotros
        const docRef = window.doc(window.db, "m2_estadisticas", "global");
        
        let updateData = {};
        updateData[campo] = window.increment(1); // Suma +1 automáticamente
        updateData['ultimaActualizacion'] = new Date().getTime();

        try {
            await window.updateDoc(docRef, updateData);
        } catch (e) {
            // Si el documento no existe aún (la primera vez), lo creamos
            let newData = { ultimaActualizacion: new Date().getTime() };
            newData[campo] = 1;
            await window.setDoc(docRef, newData);
        }
    } catch (err) {
        // Es un proceso ninja: si falla por falta de internet, no molesta al usuario
        console.warn("Tracker M2 Oculto:", err);
    }
};
// ========================================================
// 🔄 INTERRUPTOR DE PESTAÑAS SEGURO (M2 CODE SYSTEMS)
// ========================================================
window.cambiarPestana = function(pestana) {
    activeTab = pestana;
    window.tabActiva = pestana;
    
    // 1. Gestión de estilos en botones de navegación (con protección contra elementos nulos)
    try {
        const botones = document.querySelectorAll('#tabsEntregas .submenu-container button');
        botones.forEach(b => { 
            b.classList.remove('bg-white/10', 'text-white', 'text-amber-300', 'bg-emerald-400'); 
            b.classList.add('text-gray-400');
        });

        const botonesDpto = document.querySelectorAll('#tabsDpto button');
        if (botonesDpto) {
            botonesDpto.forEach(b => {
                b.classList.remove('bg-white/10', 'text-white');
                b.classList.add('text-gray-300');
            });
        }
        
        if (botones && botones.length > 0) {
            if (pestana === 'logistica' && botones[0]) { botones[0].classList.remove('text-gray-400'); botones[0].classList.add('text-amber-300', 'bg-white/10'); }
            else if (pestana === 'todos' && botones[1]) { botones[1].classList.remove('text-gray-400'); botones[1].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'agenda' && botones[2]) { botones[2].classList.remove('text-gray-400'); botones[2].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'global-taller' && botones[3]) {
                botones[3].classList.remove('text-gray-400'); botones[3].classList.add('text-white', 'bg-white/10');
                if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white');
            }
            else if (pestana === 'global-recambios' && botones[4]) {
                botones[4].classList.remove('text-gray-400'); botones[4].classList.add('text-white', 'bg-white/10');
                if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white');
            }
            else if (pestana === 'entregados' && botones[5]) { botones[5].classList.remove('text-gray-400'); botones[5].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'dashboard' && botones[6]) { botones[6].classList.remove('text-gray-400'); botones[6].classList.add('text-emerald-400', 'bg-white/10'); }
            else if (pestana === 'encuestas' && botones[7]) { botones[7].classList.remove('text-gray-400'); botones[7].classList.add('text-white', 'bg-white/10'); }
        }  
        
        if (pestana === 'historial-dpto') {
            if(botonesDpto && botonesDpto[1]) botonesDpto[1].classList.add('bg-white/10', 'text-white'); 
        }
    } catch (e) {
        console.warn("Aviso en el decorado de botones de navegación:", e);
    }

    // 2. Apagar absolutamente todas las pantallas de forma segura antes de activar la nueva
    const elementosOcultar = [
        'contenedorLogistica', 'contenedorTarjetas', 'contenedorTabla', 
        'contenedorAgenda', 'contenedorEntregados', 'contenedorDashboard', 
        'contenedorEncuestas', 'contenedorHistorialDpto', 'filtrosVisuales', 
        'controlesVistaExcel', 'botonesLogistica', 'botonesAgenda'
    ];

    elementosOcultar.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none'; // Solo altera el estilo si el div existe realmente
    });
    
    // El buscador superior vuelve a estar visible por defecto
    const buscador = document.getElementById('buscadorInput');
    if (buscador) buscador.style.display = 'block';

    // 3. Encender la pantalla correspondiente de forma aislada e independiente
    try {
        if (pestana === 'logistica') {
            const c = document.getElementById('contenedorLogistica'); if (c) c.style.display = 'grid';
            const b = document.getElementById('botonesLogistica'); if (b) b.style.display = 'flex'; 
        } else if (pestana === 'todos') {
            const c = document.getElementById('controlesVistaExcel'); if (c) c.style.display = 'flex';
            const f = document.getElementById('filtrosVisuales'); if (f) f.style.display = 'flex';
            if (typeof window.cambiarModoVisualizacion === 'function') window.cambiarModoVisualizacion(modoVistaActual);
        } else if (pestana === 'global-taller' || pestana === 'global-recambios') {
            const c = document.getElementById('contenedorTarjetas'); if (c) c.style.display = 'grid';
        } else if (pestana === 'agenda') {
            const c = document.getElementById('contenedorAgenda');
            if (c) {
                c.style.display = 'block';
                c.classList.remove('hidden');
            }
            if (buscador) buscador.style.display = 'none';
            const b = document.getElementById('botonesAgenda'); if (b) b.style.display = 'flex';
            const esBackoffice = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '') === 'backoffice';
            const btnListado = document.getElementById('btnAgendaListado');
            const btnNuevaCita = document.getElementById('btnAgendaNuevaCita');
            const btnBloqueos = document.getElementById('btnAgendaBloqueos');
            if (btnListado) btnListado.style.display = esBackoffice ? 'none' : 'inline-flex';
            if (btnBloqueos) btnBloqueos.style.display = esBackoffice ? 'none' : 'inline-flex';
            if (btnNuevaCita) btnNuevaCita.style.display = 'inline-flex';
            if (typeof window.renderAgenda === 'function') window.renderAgenda();
        } else if (pestana === 'entregados') {
            const c = document.getElementById('contenedorEntregados'); if (c) c.style.display = 'block';
            if (buscador) buscador.style.display = 'none';
            if (typeof window.renderEntregados === 'function') window.renderEntregados();
        } else if (pestana === 'dashboard') {
            const c = document.getElementById('contenedorDashboard'); if (c) c.style.display = 'block';
            if (buscador) buscador.style.display = 'none';
            if (typeof window.renderizarDashboard === 'function') window.renderizarDashboard();
        } else if (pestana === 'encuestas') { 
            const c = document.getElementById('contenedorEncuestas'); if (c) c.style.display = 'block';
            if (buscador) buscador.style.display = 'none';
            if (typeof window.renderEncuestas === 'function') window.renderEncuestas();
        } else if (pestana === 'historial-dpto') {
            const c = document.getElementById('contenedorHistorialDpto'); 
            if (c) {
                c.style.display = 'flex';
            } else {
                console.warn("Aviso: 'contenedorHistorialDpto' no existe en el HTML.");
            }
            if (buscador) buscador.style.display = 'none';
            if (typeof window.cargarUltimosHistorialDpto === 'function') window.cargarUltimosHistorialDpto();
        }
    } catch (e) {
        console.error("Error crítico al encender la pestaña solicitada:", e);
    }
    
    // 4. Refrescar la base de datos si no estamos en secciones estáticas especiales
    if (pestana !== 'dashboard' && pestana !== 'encuestas' && pestana !== 'historial-dpto') {
        if (typeof window.cargar === 'function') window.cargar();
    }
    
    if (typeof window.aplicarPermisosPorRol === 'function') window.aplicarPermisosPorRol();
};
// ========================================================
// 🚀 MOTOR PRINCIPAL: DESCARGA DE COCHES DESDE FIREBASE
// ========================================================
window.cargar = function() {
    if(unsubscribeFirebase) unsubscribeFirebase();
    
    unsubscribeFirebase = window.onSnapshot(window.collection(window.db, "vehiculos"), (snapshot) => {
        todosLosCoches = [];
        snapshot.forEach(doc => { 
            let c = doc.data(); 
            
            // 🔥 ESCUDO ANTIFANTASMAS: Comprobamos que el documento tenga información real
            let tieneBastidor = c.bastidor && String(c.bastidor).trim() !== '';
            let tieneMatricula = (c.matricula && String(c.matricula).trim() !== '') || (c.Matricula && String(c.Matricula).trim() !== '');
            let esValido = tieneBastidor || tieneMatricula;

            // Solo metemos el coche en la app si pasó la prueba
            if (esValido) {
                c.fila = doc.id; 
                c.A = c.bastidor || "Sin Bastidor"; 
                c.B = c.matricula || c.Matricula || "S/M"; 
                c.C = c.modelo || "VW"; 
                
                let chatProcess = c.chatInfo;
                if (!chatProcess && c.chat && typeof c.chat === 'string') {
                    try { chatProcess = JSON.parse(c.chat); } catch(e) {}
                }
                c.chatData = chatProcess || {history: [], lastOpened: {}};
                
                todosLosCoches.push(c); 
            } else {
                console.warn("Se ha ignorado un vehículo fantasma en Firebase con ID:", doc.id);
            }
        });
        
        todosLosCoches.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));

        // ... (El resto de tu función window.cargar sigue exactamente igual hacia abajo con la distribución por departamentos)
        // 🔥 DISTRIBUCIÓN DE DATOS SEGÚN EL DEPARTAMENTO
        if (window.rolActivo === 'taller' || window.rolActivo === 'recambios') {
            if(typeof window.renderizarDepartamentos === 'function') window.renderizarDepartamentos(window.rolActivo);
            if (activeTab === 'historial-dpto') { window.cargarUltimosHistorialDpto(); }
            
       } else if (window.rolActivo === 'entregas' || window.rolActivo === 'backoffice' || window.rolActivo === 'comercial') {
            if (activeTab === 'logistica') {
                if(typeof window.renderLogistica === 'function') window.renderLogistica();
            } else if (activeTab === 'todos') { 
                window.actualizarContadores(); 
                if(typeof window.renderizarVistas === 'function') window.renderizarVistas(); 
            } else if (activeTab === 'global-taller') {
                let cochesEnTaller = todosLosCoches.filter(c => c.enTaller && !c.finTaller && c.entregado !== true && c.entregado !== "true");
                let div = document.getElementById('contenedorTarjetas');
                if (cochesEnTaller.length === 0) {
                    div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay ningún vehículo en Taller actualmente.</p></div>`;
                } else {
                    if(typeof window.renderTarjetaCompacta === 'function') div.innerHTML = cochesEnTaller.map(c => window.renderTarjetaCompacta(c)).join('');
                }
            } else if (activeTab === 'global-recambios') {
                let cochesEnRecambios = todosLosCoches.filter(c => c.enRecambios && !c.finRecambios && c.entregado !== true && c.entregado !== "true");
                let div = document.getElementById('contenedorTarjetas');
                if (cochesEnRecambios.length === 0) {
                    div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay ningún vehículo en Recambios actualmente.</p></div>`;
                } else {
                    if(typeof window.renderTarjetaCompacta === 'function') div.innerHTML = cochesEnRecambios.map(c => window.renderTarjetaCompacta(c)).join('');
                }
            } else if (activeTab === 'agenda') {
                if(typeof window.renderAgenda === 'function') window.renderAgenda();
            } else if (activeTab === 'entregados') {
                if(typeof window.renderEntregados === 'function') window.renderEntregados();
            }
            
            if (primeraCargaDb) {
                primeraCargaDb = false;
                setTimeout(() => { if(typeof window.sincronizarCitasSilencioso === 'function') window.sincronizarCitasSilencioso(); }, 1500); 
            }

            // Aviso diario: SOLO PARA EL EQUIPO DE ENTREGAS
         if (window.rolActivo === 'entregas' && typeof window.mostrarAvisoPedidosHoySiOSi === 'function') {
             setTimeout(() => window.mostrarAvisoPedidosHoySiOSi(), 900);
         }
        }

        window.aplicarPermisosPorRol();

    }, (error) => {
        window.mostrarErrorFirebase(error, 'Error al cargar vehículos');
    });
};
// ==========================================
// 🧮 CALCULADORA DE CONTADORES SUPERIORES
// ==========================================
window.actualizarContadores = function() {
   let pendientes = 0, concita = 0, taller = 0, recambios = 0, total = 0;
   
   todosLosCoches.forEach(c => {
      let enInventario = c.pasoAInventario === true || c.pasoAInventario === "true"; 
      let estaEntregado = c.entregado === true || c.entregado === "true";
      
      if(!estaEntregado && enInventario) {
          total++;
          let enT = c.enTaller && !c.finTaller; 
          let enR = c.enRecambios && !c.finRecambios;
          let tieneCita = !!c.fechaCita;
          
          if (enT) { taller++; }
          else if (enR) { recambios++; }
          else if (tieneCita) { concita++; }
          else { pendientes++; }
      }
   });
   
   if(document.getElementById('c-todos')) document.getElementById('c-todos').innerText = total; 
   if(document.getElementById('c-pendientes')) document.getElementById('c-pendientes').innerText = pendientes;
   if(document.getElementById('c-concita')) document.getElementById('c-concita').innerText = concita;
   if(document.getElementById('c-taller')) document.getElementById('c-taller').innerText = taller; 
   if(document.getElementById('c-recambios')) document.getElementById('c-recambios').innerText = recambios;
};
window.renderLogistica = function() {
   let logistica = todosLosCoches.filter(c => c.pasoAInventario !== true && c.pasoAInventario !== "true" && c.entregado !== true && c.entregado !== "true");
   let div = document.getElementById('contenedorLogistica');

   if (logistica.length === 0) {
       div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay vehículos en fase de logística previa.</p></div>`;
   } else {
       // 🔥 ORDENACIÓN INTELIGENTE (Los listos van arriba del todo)
       logistica.sort((a, b) => {
           let enTa = a.enTaller && !a.finTaller;
           let enRa = a.enRecambios && !a.finRecambios;
           let aListo = !!a.fechaDoc && !!a.fechaTransporte && !!a.fechaPreparacion && !enTa && !enRa ? 1 : 0;

           let enTb = b.enTaller && !b.finTaller;
           let enRb = b.enRecambios && !b.finRecambios;
           let bListo = !!b.fechaDoc && !!b.fechaTransporte && !!b.fechaPreparacion && !enTb && !enRb ? 1 : 0;

           return bListo - aListo; // Coloca los 1 (Listos) antes que los 0
       });

       div.innerHTML = logistica.map(c => {
           let enT = c.enTaller && !c.finTaller;
           let enR = c.enRecambios && !c.finRecambios;
           let tieneCita = !!c.fechaCita;
           let isAlerta = tieneCita && (enT || enR);

           // 🔥 DETECTAMOS SI EL COCHE ESTÁ LISTO
           let isListo = !!c.fechaDoc && !!c.fechaTransporte && !!c.fechaPreparacion && !enT && !enR;

           // MODIFICAMOS EL COLOR DEL BORDE Y LA SOMBRA
           let borderAlerta = isAlerta ? 'border-l-8 border-red-600 bg-red-50/50' : 
                              (isListo ? 'border-l-8 border-emerald-500 bg-emerald-50/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-l-8 border-gray-200');

           // 🔥 ETIQUETAS VISUALES DE ALERTA O LISTO
           let htmlAlerta = isAlerta ? `<div class="bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded flex items-center justify-center gap-1.5 animate-pulse shadow-md w-full mb-3"><i class="ph-bold ph-warning-circle text-sm"></i> ¡URGENTE! TIENE CITA EL ${c.fechaCita}</div>` : '';
           if (isListo && !isAlerta) {
               htmlAlerta = `<div class="bg-emerald-500 text-white text-[10px] font-black px-3 py-2 rounded flex items-center justify-center gap-1.5 animate-pulse shadow-md w-full mb-3"><i class="ph-bold ph-star text-sm"></i> ¡LISTO PARA CONCESIONARIO!</div>`;
           }

           let btnDoc = c.fechaDoc ? `<div class="bg-emerald-100 text-emerald-800 text-[9px] font-bold py-1.5 px-2 rounded border border-emerald-200 text-center">✓ Doc: ${c.fechaDoc}</div>` : `<button onclick="window.marcarPaso('${c.fila}', 'fechaDoc')" class="bg-gray-100 text-gray-600 hover:bg-gray-200 text-[9px] font-bold py-1.5 px-2 rounded w-full border border-gray-300">Documentación</button>`;
           let btnTrans = c.fechaTransporte ? `<div class="bg-emerald-100 text-emerald-800 text-[9px] font-bold py-1.5 px-2 rounded border border-emerald-200 text-center">✓ Trans: ${c.fechaTransporte}</div>` : `<button onclick="window.marcarPaso('${c.fila}', 'fechaTransporte')" class="bg-gray-100 text-gray-600 hover:bg-gray-200 text-[9px] font-bold py-1.5 px-2 rounded w-full border border-gray-300">En Transporte</button>`;
           let btnPrep = c.fechaPreparacion ? `<div class="bg-amber-100 text-amber-800 text-[9px] font-bold py-1.5 px-2 rounded border border-amber-300 text-center">⚠️ Prep: ${c.fechaPreparacion}</div>` : `<button onclick="window.marcarPaso('${c.fila}', 'fechaPreparacion')" class="bg-gray-100 text-gray-600 hover:bg-gray-200 text-[9px] font-bold py-1.5 px-2 rounded w-full border border-gray-300">En Preparación</button>`;

           let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27"); 
           let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
           let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
           
           let escA = window.escapeJS(c.A); let escB = window.escapeJS(c.B); let escC = window.escapeJS(c.C);
           let escRen = window.escapeJS(c.renting); let escAge = window.escapeJS(c.agencia);

           let bTaller = c.finTaller ? `<span class="status-btn bg-emerald-100 text-emerald-800"><i class="ph-bold ph-check"></i> Tall. OK</span>` : c.enTaller ? `<button onclick="window.pedirInst(this, '${c.fila}', 'taller')" class="status-btn bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 shadow-sm"><i class="ph-bold ph-plus"></i> Añadir Petición</button>` : `<button onclick="window.pedirInst(this, '${c.fila}', 'taller')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm">Taller <i class="ph-bold ph-plus"></i></button>`;
           let bRecambios = c.finRecambios ? `<span class="status-btn bg-emerald-100 text-emerald-800"><i class="ph-bold ph-check"></i> Rec. OK</span>` : c.enRecambios ? `<button onclick="window.pedirInst(this, '${c.fila}', 'recambios')" class="status-btn bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200 shadow-sm"><i class="ph-bold ph-plus"></i> Añadir Petición</button>` : `<button onclick="window.pedirInst(this, '${c.fila}', 'recambios')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm">Recambios <i class="ph-bold ph-plus"></i></button>`;

           let arrTaller = c.peticionesTaller || (c.instruccionTaller ? [{fecha: c.fechaEntradaTaller || '-', motivo: c.instruccionTaller, url: c.urlParte}] : []);
           let arrRecambios = c.peticionesRecambios || (c.instruccionRecambios ? [{fecha: c.fechaEntradaRecambios || '-', motivo: c.instruccionRecambios, url: c.urlParte}] : []);

           let txtTallerInfo = c.enTaller ? `<div class="text-[9px] bg-amber-50 text-amber-800 px-2 py-1 rounded mt-1 font-bold">OR: ${c.ordenTaller||'Pte'} | Prev: ${c.fechaTaller||'Pte'}</div>` : '';
           let txtRecambiosInfo = c.enRecambios ? `<div class="text-[9px] bg-teal-50 text-teal-800 px-2 py-1 rounded mt-1 font-bold">Ped: ${c.ordenRecambios||'Pte'} | Prev: ${c.fechaRecambios||'Pte'}</div>` : '';

           txtTallerInfo += arrTaller.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-amber-400 pl-1.5"><b class="text-amber-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');
           txtRecambiosInfo += arrRecambios.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-teal-500 pl-1.5"><b class="text-teal-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');
           let notaAgendaLimpia = String(c.notaAgenda || '').replace(/[<>]/g, '').trim();
           let htmlNotaAgenda = notaAgendaLimpia ? `<div class="text-[10px] bg-yellow-50 border border-yellow-200 text-yellow-900 px-2 py-1.5 rounded mb-3 font-bold"><i class="ph-bold ph-note"></i> Nota Agenda: ${notaAgendaLimpia}</div>` : '';

           let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';
           let rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
           let esBackoffice = (rolLimpio === 'backoffice' || rolLimpio === 'administracion' || rolLimpio === 'comercial');

           if (esBackoffice) {
               return `
               <div class="bg-white rounded-xl ${borderAlerta} border p-5 shadow-sm fila-coche flex flex-col relative">
                   ${htmlAlerta}
                   <div class="flex justify-between items-start mb-2 gap-2">
                       <div class="min-w-0 pr-2">
                           <h3 class="font-black text-lg text-[#001e50] uppercase">${c.C}</h3>
                           <p class="text-[10px] font-bold text-gray-400 tracking-widest mt-1">VIN: ${c.A} | MAT: ${c.B}</p>
                       </div>
                       <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-9 h-9 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm" title="Chat interno"><i class="ph-fill ph-whatsapp-logo text-lg"></i>${burbuja}</button>
                   </div>

                   <div class="flex gap-2 mb-3">
                       <div class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-buildings"></i> ${c.renting || 'Renting'}</div>
                       <div class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-truck"></i> ${c.agencia || 'Agencia'}</div>
                   </div>

                   ${htmlNotaAgenda}

                   <div class="flex flex-col gap-1.5 mb-3 min-w-0">
                       <button onclick="window.copiarAlPortapapeles('${escB}')" title="Copiar matrícula" class="cursor-pointer hover:bg-gray-200 transition-colors bg-gray-100 border border-gray-300 text-gray-800 px-2 py-1.5 rounded text-xs font-black tracking-widest shadow-sm flex items-center justify-between gap-1 w-full overflow-hidden">
                           <span class="truncate">${c.B}</span> <i class="ph-bold ph-copy text-gray-400 flex-shrink-0"></i>
                       </button>
                       <button onclick="window.copiarAlPortapapeles('${escA}')" title="Copiar bastidor" class="cursor-pointer hover:bg-gray-100 transition-colors bg-white border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-black tracking-widest shadow-sm flex items-center justify-between gap-1 w-full overflow-hidden">
                           <span class="truncate">VIN: ${c.A}</span> <i class="ph-bold ph-copy text-gray-400 flex-shrink-0"></i>
                       </button>
                   </div>

                   <div class="grid grid-cols-3 gap-2 mt-2 mb-4 border-b border-gray-100 pb-4">
                       <div class="bg-gray-100 text-gray-600 text-[9px] font-bold py-1.5 px-2 rounded border border-gray-300 text-center">Doc: ${c.fechaDoc || 'Pte'}</div>
                       <div class="bg-gray-100 text-gray-600 text-[9px] font-bold py-1.5 px-2 rounded border border-gray-300 text-center">Trans: ${c.fechaTransporte || 'Pte'}</div>
                       <div class="bg-gray-100 text-gray-600 text-[9px] font-bold py-1.5 px-2 rounded border border-gray-300 text-center">Prep: ${c.fechaPreparacion || 'Pte'}</div>
                   </div>

                   <div class="flex flex-col gap-2">
                       <div class="flex gap-2 w-full">
                           <div class="w-1/2 flex flex-col">${bTaller} ${txtTallerInfo}</div>
                           <div class="w-1/2 flex flex-col">${bRecambios} ${txtRecambiosInfo}</div>
                       </div>
                   </div>
               </div>`;
           }

           return `
           <div class="bg-white rounded-xl ${borderAlerta} p-5 shadow-sm fila-coche flex flex-col relative">
             ${htmlAlerta}
             <div class="flex justify-between items-start mb-2 gap-2">
                <div class="min-w-0 pr-2">
                    <h3 class="font-black text-lg text-[#001e50] uppercase">${c.C}</h3>
                    <p class="text-[10px] font-bold text-gray-400 tracking-widest mt-1">VIN: ${c.A} | MAT: ${c.B}</p>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                    <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-8 h-8 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-lg"></i>${burbuja}</button>
                    <button onclick="window.editarVehiculoBasico('${c.fila}', '${escA}', '${escB}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-colors" title="Editar info del vehículo"><i class="ph-bold ph-pencil-simple text-lg"></i></button> 
                    <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm transition-colors" title="Eliminar"><i class="ph-bold ph-trash text-lg"></i></button>              
                </div>
             </div>

             <div class="flex gap-2 mb-3">
                <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-buildings"></i> ${c.renting || 'Renting'}</button>
                <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-truck"></i> ${c.agencia || 'Agencia'}</button>
             </div>

             ${htmlNotaAgenda}

             <div class="grid grid-cols-3 gap-2 mt-2 mb-4 border-b border-gray-100 pb-4">
                ${btnDoc} ${btnTrans} ${btnPrep}
             </div>

             <div class="flex flex-col gap-2 mb-4">
               <div class="flex gap-2 w-full">
                 <div class="w-1/2 flex flex-col">${bTaller} ${txtTallerInfo}</div>
                 <div class="w-1/2 flex flex-col">${bRecambios} ${txtRecambiosInfo}</div>
               </div>
             </div>

             <button onclick="window.pasarAInventario('${c.fila}')" class="w-full mt-auto bg-[#001e50] text-white font-bold py-3 rounded-lg text-xs hover:bg-blue-900 shadow-sm flex items-center justify-center gap-2">
                <i class="ph-bold ph-check"></i> Marcar como "Listo para Entrega"
             </button>
           </div>`;
       }).join('');
   }
};

window.cambiarModoVisualizacion = function(modo) {
   modoVistaActual = modo;
   const btnT = document.getElementById('btnVistaTarjetas');
   const btnE = document.getElementById('btnVistaTabla');
   const contenedorTarjetas = document.getElementById('contenedorTarjetas');
   const contenedorTabla = document.getElementById('contenedorTabla');

   if (btnT && btnE) {
      if (modo === 'tarjetas') {
         btnT.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
         btnE.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      } else {
         btnE.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
         btnT.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      }
   }

   if (contenedorTarjetas) {
      contenedorTarjetas.style.display = modo === 'tarjetas' ? 'grid' : 'none';
   }
   if (contenedorTabla) {
      contenedorTabla.style.display = modo === 'tarjetas' ? 'none' : 'block';
   }

   if(typeof window.renderizarVistas === 'function') window.renderizarVistas();
};

window.aplicarFiltroVisual = function(filtro, btnElement) {
   filtroActual = filtro;
   document.querySelectorAll('.filtro-btn').forEach(b => {
      b.className = "filtro-btn bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all";
   });
   btnElement.className = "filtro-btn bg-[#001e50] text-white border border-[#001e50] px-5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all";
   if(typeof window.renderizarVistas === 'function') window.renderizarVistas();
};

window.filtrarCoches = function() {
  const t = document.getElementById('buscadorInput').value.toLowerCase();
  document.querySelectorAll('.fila-coche').forEach(el => { el.style.display = el.innerText.toLowerCase().includes(t) ? '' : 'none'; });
};
// ==========================================
// 💬 MÓDULO INTEGRAL DE CHAT INTERNO
// ==========================================
window.mensajesGlobalesCache = [];

window.enviarMensajeInterno = async function(destino, texto) {
    if(typeof window.registrarMetricaM2 === 'function') window.registrarMetricaM2('mensajes_chat_interno_enviados');
    if (!texto.trim() || !destino) return;
    const idMensaje = "msg_" + new Date().getTime();
    const nuevoMensaje = { remitente: window.usuarioActivo, departamentoRemitente: window.rolActivo, destinatario: destino, texto: texto, timestamp: new Date().getTime(), leido: false };
    try { await window.setDoc(window.doc(window.db, "chat_concesionario", idMensaje), nuevoMensaje);
    } catch (error) { Swal.fire({ icon: 'error', title: 'Fallo de conexión', text: 'No se pudo enviar.' }); }
};

window.marcarChatGlobalComoLeido = function() {
    const ahora = new Date().getTime();
    window.ultimaFechaLecturaGlobal = ahora;
    localStorage.setItem('vw_chat_leido_' + window.usuarioActivo, ahora);
    const globo = document.getElementById('contadorChatGlobal');
    if (globo) globo.style.display = 'none';
};

window.cargarChatGlobal = function() {
    const chatRef = window.collection(window.db, "chat_concesionario");
    window.ultimaFechaLecturaGlobal = localStorage.getItem('vw_chat_leido_' + window.usuarioActivo) || 0;
    let primeraCargaSnapshot = true;
    
    window.onSnapshot(chatRef, (snapshot) => {
        let mensajes = [];
        let noLeidos = 0;
        
        // 1. Recopilar mensajes para la vista
        snapshot.forEach((doc) => {
            let msg = doc.data(); msg.id = doc.id;
            if (msg.remitente === window.usuarioActivo || msg.destinatario === window.usuarioActivo || msg.destinatario === window.rolActivo) {
                mensajes.push(msg);
                if (msg.remitente !== window.usuarioActivo && msg.timestamp > window.ultimaFechaLecturaGlobal) {
                    noLeidos++;
                }
            }
        });
        mensajes.sort((a, b) => a.timestamp - b.timestamp);
        window.mensajesGlobalesCache = mensajes; 
        window.actualizarVistaChat();
        
        // 2. Gestionar el globo (badge) del menú
        const globo = document.getElementById('contadorChatGlobal');
        const chatWidget = document.getElementById('chatGlobalWidget');
        if (globo) {
            if (chatWidget && chatWidget.style.display === 'flex') window.marcarChatGlobalComoLeido();
            else {
                if (noLeidos > 0) { globo.innerText = noLeidos > 99 ? '99+' : noLeidos; globo.style.display = 'flex'; } 
                else { globo.style.display = 'none'; }
            }
        }

        // 3. 🔥 NUEVO: Detectar los mensajes que acaban de entrar y lanzar la alerta visual
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                let msgNuevo = change.doc.data();
                
                let meTocaAMi = (msgNuevo.destinatario === window.usuarioActivo || msgNuevo.destinatario === window.rolActivo);
                let esMio = (msgNuevo.remitente === window.usuarioActivo);
                let esNuevo = (msgNuevo.timestamp > window.ultimaFechaLecturaGlobal);
                let chatCerrado = (!chatWidget || chatWidget.style.display === 'none');

            // Evitamos avisos de mensajes históricos al arrancar: solo alertamos después del primer snapshot.
            if (!primeraCargaSnapshot && meTocaAMi && !esMio && esNuevo && chatCerrado) {
                    
                    // Formateamos el nombre (convierte "FATIMA.GARCIA" en "Fatima Garcia")
                    let remitenteBonito = msgNuevo.remitente.replace('.', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        iconColor: '#00b0f0',
                        title: `💬 Mensaje de ${remitenteBonito}`,
                        text: msgNuevo.texto,
                        showConfirmButton: true,
                        confirmButtonColor: '#001e50',
                        confirmButtonText: 'Abrir Chat',
                        timer: 6000,
                        timerProgressBar: true
                    }).then((result) => {
                        // Si el usuario hace clic en el botón de la alerta, abrimos el chat y seleccionamos al compañero
                        if (result.isConfirmed) {
                            window.abrirChatGlobal();
                            setTimeout(() => window.abrirChatEspecifico(msgNuevo.remitente), 300);
                        }
                    });
                }
            }
        });

        primeraCargaSnapshot = false;
    });
};

window.mostrarChatTab = function(vista) {
    document.getElementById('view-lista').style.display = vista === 'lista' ? 'block' : 'none';
    document.getElementById('view-contactos').style.display = vista === 'contactos' ? 'block' : 'none';
    document.getElementById('view-chat-activo').style.display = vista === 'chat' ? 'flex' : 'none';
    document.getElementById('tab-lista').className = `flex-1 py-2 text-xs font-bold ${vista === 'lista' ? 'text-[#001e50] border-b-2 border-[#001e50]' : 'text-gray-400 border-b-2 border-transparent'}`;
    document.getElementById('tab-contactos').className = `flex-1 py-2 text-xs font-bold ${vista === 'contactos' ? 'text-[#001e50] border-b-2 border-[#001e50]' : 'text-gray-400 border-b-2 border-transparent'}`;
    if (vista === 'lista') window.renderizarListaChats();
    if (vista === 'contactos') window.renderizarContactos();
};

// ==========================================
// 📝 DIBUJADO DE LA LISTA DE CHATS CON INDICADOR DE NO LEÍDO
// ==========================================
window.renderizarListaChats = function() {
    const contenedor = document.getElementById('view-lista');
    const chats = {};
    
    // Cargamos la memoria de conversaciones leídas (si no existe, creamos una vacía)
    if (!window.conversacionesLeidas) {
        window.conversacionesLeidas = JSON.parse(localStorage.getItem('vw_conv_leidas_' + window.usuarioActivo) || '{}');
    }
    
    window.mensajesGlobalesCache.forEach(msg => {
        let otro = (msg.remitente === window.usuarioActivo) ? msg.destinatario : msg.remitente;
        if (!chats[otro] || msg.timestamp > chats[otro].timestamp) {
            chats[otro] = msg;
        }
    });
    
    contenedor.innerHTML = Object.values(chats).sort((a,b) => b.timestamp - a.timestamp).map(msg => {
        let otro = (msg.remitente === window.usuarioActivo) ? msg.destinatario : msg.remitente;
        
        // 🔥 NUEVA DETECCIÓN: Comparamos el mensaje con la hora de ESTE contacto
        let tiempoLecturaContacto = window.conversacionesLeidas[otro] || 0;
        let esNoLeido = (msg.remitente !== window.usuarioActivo && msg.timestamp > tiempoLecturaContacto);
        
        let indicadorRojo = esNoLeido ? `<div class="w-3 h-3 bg-red-500 rounded-full border-2 border-white absolute top-0 right-0 animate-pulse shadow-sm"></div>` : '';
        let estiloTexto = esNoLeido ? 'font-black text-gray-900' : 'font-medium text-gray-500';

        return `
        <div class="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors" onclick="window.abrirChatEspecifico('${otro}')">
            <div class="w-10 h-10 rounded-full bg-[#00b0f0] text-white flex items-center justify-center font-black text-sm relative shadow-sm">
                ${otro.substring(0,2)}
                ${indicadorRojo}
            </div>
            <div class="flex-1 overflow-hidden">
                <p class="text-xs font-black text-gray-800">${otro}</p>
                <p class="text-[10px] ${estiloTexto} truncate transition-all">${msg.texto}</p>
            </div>
        </div>`;
    }).join('');
};

window.renderizarContactos = function() {
    const contenedor = document.getElementById('view-contactos');
    if (!contenedor) return;

    // 1. Separamos el buscador de la lista para que el DOM no destruya el <input> al escribir
    let contenedorLista = document.getElementById('contenedor-lista-contactos');
    
    if (!contenedorLista) {
        // Si no existe, creamos la estructura base: Buscador estático + Contenedor de lista dinámico
        contenedor.innerHTML = `
        <div class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-2.5">
            <div class="relative">
                <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                    type="text"
                    value="${window.escapeJS(window.filtroDirectorioChat || '')}"
                    oninput="window.filtrarDirectorioChat(this.value)"
                    placeholder="Buscar contacto o departamento..."
                    class="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-[11px] font-bold text-[#001e50] outline-none focus:ring-2 focus:ring-[#00b0f0]"
                >
            </div>
        </div>
        <div id="contenedor-lista-contactos"></div>`; // <-- Aquí se inyectarán solo los resultados
        
        contenedorLista = document.getElementById('contenedor-lista-contactos');
    }

    const filtro = String(window.filtroDirectorioChat || '').toUpperCase().trim();
    const normalizarBusqueda = (txt) => String(txt || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.\s_-]+/g, '');
    const filtroNormalizado = normalizarBusqueda(filtro);
    
    // Diccionario de usuarios con el nuevo departamento de Comerciales
    const departamentos = {
        "ENTREGAS": ["MANUEL.ARJONA", "ANTONIO.BERMEJO"],
        "TALLER": ["MANUEL.LOPEZ", "ALVARO.BELTRAN", "LORENA.LEOVEANU"],
        "RECAMBIOS": ["SERGIO.CABALLERO", "FERNANDO.CRESPO", "JAIME.JORGE", "FERNANDO.REMON", "ABRAHAM.CANIZARES"],
        "BACKOFFICE": ["FATIMA.GARCIA", "GEMA.GOMEZ", "ALBERTO.GUTIERREZ", "RABAB.JAADAR", "RUBEN.GARCIA"],
        "COMERCIAL": ["ROBERTO.ABAD", "JORGE.AGUDO", "BLANCA.SANCHEZ", "ADRIA.HUGAS", "JAVIER.MARTINEZ", "MARINA.RODRIGUEZ", "ALBA.DORIA", "JOSEMARIA.MARTINEZ"]
    };

    let htmlListaResultados = '';
    let totalCoincidencias = 0;

    // 2. Construimos solo el HTML de los contactos
    for (const [nombreDpto, usuarios] of Object.entries(departamentos)) {
        const rolDestino = nombreDpto.toLowerCase();
        const coincideDpto = filtro === '' ||
            nombreDpto.includes(filtro) ||
            rolDestino.includes(filtro) ||
            normalizarBusqueda(nombreDpto).includes(filtroNormalizado) ||
            normalizarBusqueda(rolDestino).includes(filtroNormalizado);
        
        const usuariosFiltrados = filtro === ''
            ? usuarios
            : usuarios.filter(u => u.includes(filtro) || normalizarBusqueda(u).includes(filtroNormalizado));

        if (!coincideDpto && usuariosFiltrados.length === 0) continue;
        totalCoincidencias += (coincideDpto ? 1 : 0) + usuariosFiltrados.length;
        
        htmlListaResultados += `<div class="bg-gray-200 text-[#001e50] text-[10px] font-black p-1.5 pl-3 uppercase tracking-widest mt-2 first:mt-0 shadow-inner">${nombreDpto}</div>`;
        
        if (coincideDpto) {
            htmlListaResultados += `
            <div class="p-3 border-b border-gray-300 bg-blue-50 hover:bg-blue-100 cursor-pointer text-xs font-black flex items-center gap-3 text-[#001e50] transition-colors" onclick="window.abrirChatEspecifico('${rolDestino}')">
                <div class="w-8 h-8 rounded-full bg-[#001e50] flex items-center justify-center text-white text-sm shadow-sm">
                    <i class="ph-bold ph-users"></i>
                </div>
                GRUPO ${nombreDpto}
            </div>`;
        }

        usuariosFiltrados.forEach(contacto => {
            htmlListaResultados += `
            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-xs font-bold flex items-center gap-3 text-gray-700 transition-colors" onclick="window.abrirChatEspecifico('${contacto}')">
                <div class="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[#001e50] text-[9px] font-black shadow-sm">${contacto.substring(0,2)}</div>
                ${contacto}
            </div>`;
        });
    }

    if (totalCoincidencias === 0) {
        htmlListaResultados += `<div class="p-6 text-center text-[11px] font-bold text-gray-500">Sin resultados para "${window.escapeJS(window.filtroDirectorioChat || '')}"</div>`;
    }

    // 3. Inyectamos los resultados en el contenedor inferior, sin tocar el buscador superior
    contenedorLista.innerHTML = htmlListaResultados;
};

window.filtrarDirectorioChat = function(valor) {
    window.filtroDirectorioChat = String(valor || '');
    if (typeof window.renderizarContactos === 'function') window.renderizarContactos();
};

window.abrirChatEspecifico = function(usuario) {
    window.chatDestinoActual = usuario; 
    
    // 🔥 NUEVO: Guardar la hora exacta a la que abres este chat concreto
    let leidas = JSON.parse(localStorage.getItem('vw_conv_leidas_' + window.usuarioActivo) || '{}');
    leidas[usuario] = new Date().getTime();
    localStorage.setItem('vw_conv_leidas_' + window.usuarioActivo, JSON.stringify(leidas));
    window.conversacionesLeidas = leidas;

    window.mostrarChatTab('chat'); 
    window.actualizarVistaChat();
    
    // Repintamos la lista en segundo plano para que el punto rojo desaparezca al instante al entrar
    if(typeof window.renderizarListaChats === 'function') window.renderizarListaChats();
};

window.actualizarVistaChat = function() {
    const contenedor = document.getElementById('chatGlobalMensajes');
    if (!contenedor || !window.chatDestinoActual) return;
    let mensajesFiltrados = window.mensajesGlobalesCache.filter(msg => 
        (msg.remitente === window.chatDestinoActual && msg.destinatario === window.usuarioActivo) || 
        (msg.remitente === window.usuarioActivo && msg.destinatario === window.chatDestinoActual) ||
        (msg.destinatario === window.chatDestinoActual) 
    );
    window.renderizarMensajesGlobales(mensajesFiltrados);
};

// ==========================================
// 🎨 RENDERIZADO VISUAL DEL CHAT (ESTILO WHATSAPP)
// ==========================================
window.renderizarMensajesGlobales = function(listaMensajes) {
    const contenedor = document.getElementById('chatGlobalMensajes');
    if (!contenedor) return;
    
    // Si el chat está vacío
    if (listaMensajes.length === 0) {
        contenedor.innerHTML = '<div class="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest bg-white/60 p-1 rounded-full mx-auto w-3/4 mt-4 shadow-sm">No hay mensajes. ¡Escribe el primero!</div>';
        return;
    }
    
    // Dibujamos los mensajes
    contenedor.innerHTML = listaMensajes.map(msg => {
        let horaFormateada = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Lógica: ¿El mensaje es mío o de otra persona?
        let soyYo = msg.remitente === window.usuarioActivo;
        let iniciales = msg.remitente.substring(0, 2).toUpperCase();
        
        // Limpiamos el nombre para que quede estético (Ej: de "JUAN.PEREZ" a "Juan Perez")
        let nombreRemitente = msg.remitente.replace('.', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

        if (soyYo) {
            // 🟢 MIS MENSAJES (Alineados a la DERECHA, fondo verde)
            return `
            <div class="flex flex-col items-end w-full animate-fade-in mb-3">
                <div class="bg-[#dcf8c6] text-gray-900 border border-[#bfe89f] px-4 py-2.5 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] relative">
                    <span class="text-xs font-medium">${msg.texto}</span>
                    <span class="text-[9px] text-green-700 font-bold ml-3 inline-block relative top-1">${horaFormateada} <i class="ph-bold ph-check-all"></i></span>
                </div>
            </div>`;
        } else {
            // 🔵 MENSAJES RECIBIDOS (Alineados a la IZQUIERDA, fondo blanco con remitente)
            return `
            <div class="flex items-end gap-2 w-full animate-fade-in mb-4">
                <div class="w-8 h-8 rounded-full bg-[#00b0f0] text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                    ${iniciales}
                </div>
                <div class="flex flex-col items-start w-full">
                    <div class="bg-white text-gray-800 border border-gray-200 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] relative">
                        <span class="text-[10px] text-[#00b0f0] font-black block mb-1 uppercase tracking-wider">${nombreRemitente}</span>
                        <span class="text-xs font-medium block">${msg.texto}</span>
                        <span class="text-[9px] text-gray-400 font-bold block text-right mt-1">${horaFormateada}</span>
                    </div>
                </div>
            </div>`;
        }
    }).join('');
    
    // Forzamos el scroll automático hasta el último mensaje
    setTimeout(() => {
        contenedor.scrollTop = contenedor.scrollHeight;
    }, 50);
};

window.abrirChatGlobal = function() {
    document.getElementById('chatGlobalWidget').style.display = 'flex'; document.getElementById('btnAbrirChatGlobal').style.display = 'none';
    window.marcarChatGlobalComoLeido(); window.mostrarChatTab('lista'); 
};

window.minimizarChatGlobal = function() {
    document.getElementById('chatGlobalWidget').style.display = 'none'; document.getElementById('btnAbrirChatGlobal').style.display = 'flex';
    window.marcarChatGlobalComoLeido();
};

window.enviarMensajeGlobalUI = function() {
    const input = document.getElementById('chatGlobalInput');
    const texto = input.value;
    if (!window.chatDestinoActual) return Swal.fire('Selecciona un chat', 'Debes hacer clic en un contacto.', 'info');
    if (texto.trim()) { window.enviarMensajeInterno(window.chatDestinoActual, texto); input.value = ""; }
};
// ==========================================
// 🛡️ ESCUDO ANTIMONSTRUOS: Bloqueo forzoso del Historial
// ==========================================

// 1. Inyectamos una regla CSS "Suprema" en el navegador
const escudoCSS = document.createElement('style');
escudoCSS.innerHTML = `
    /* Si el body no tiene el permiso explícito, el historial desaparece sí o sí */
    body:not(.viendo-historial) #contenedorHistorialDpto,
    body:not(.viendo-historial) #tablaResultadosDpto,
    body:not(.viendo-historial) #contenedorHistorial {
        display: none !important;
    }
`;
document.head.appendChild(escudoCSS);

// 2. Enganchamos el escudo al interruptor de tus pestañas
const funcionCambiarPestanaVieja = window.cambiarPestana;

window.cambiarPestana = function(pestana) {
    // Ejecutamos tu cambio de pestaña normal
    if (funcionCambiarPestanaVieja) {
        funcionCambiarPestanaVieja(pestana);
    }
    
    // Si pulsas Historial, damos permiso. Si no, activamos el escudo de bloqueo.
    if (pestana === 'historial-dpto') {
        document.body.classList.add('viendo-historial');
    } else {
        document.body.classList.remove('viendo-historial');
    }
};
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (typeof window.cargarChatGlobal === 'function' && window.usuarioActivo) window.cargarChatGlobal(); }, 2000);
    const widget = document.getElementById('chatGlobalWidget'); const boton = document.getElementById('btnAbrirChatGlobal');
    if (widget) document.body.appendChild(widget); if (boton) document.body.appendChild(boton);
    const inputChat = document.getElementById('chatGlobalInput');
    if (inputChat) inputChat.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.enviarMensajeGlobalUI(); });
});
// 🔥 Función mejorada para Entregas y Reagendamientos (Soporta Agenda y Tarjetas)
window.preguntarSiEntregado = async function(fila, modeloAgenda, matriculaAgenda, fechaAgenda, horaAgenda, citaId) {
    let cocheC, cocheB, cocheA;
    let esDeAgendaSinDb = (fila === 'no_db');
    const esDevolucion = String(modeloAgenda || '').toUpperCase().includes('DEVOLUCION') || String(modeloAgenda || '').toUpperCase().includes('DEVOLUCIÓN');

    // 1. Identificamos los datos dependiendo de si viene del Inventario o de una cita sin DB
    if (!esDeAgendaSinDb) {
        let coche = todosLosCoches.find(c => c.fila === fila);
        if (!coche) return;
        cocheC = coche.C;
        cocheB = coche.B;
        cocheA = coche.A;
    } else {
        cocheC = modeloAgenda || 'Vehículo de Agenda';
        cocheB = matriculaAgenda || 'S/M';
        cocheA = 'S/B';
    }

    // 2. Las devoluciones sin ficha no deben crear vehículo en inventario.
    if (esDeAgendaSinDb && esDevolucion) {
        const confirmar = await Swal.fire({
            title: 'Completar Devolución',
            html: `
                <p class="text-sm text-gray-700">Esta devolución no pertenece al inventario interno.</p>
                <p class="mt-2 text-sm text-gray-700">¿Quieres marcarla como completada y moverla al historial?</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, completar devolución',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmar.isConfirmed) return;

        try {
            let idObjetivo = citaId || '';
            if (!idObjetivo && Array.isArray(window.datosAgenda)) {
                const matObj = String(matriculaAgenda || '').replace(/\s/g, '').toUpperCase();
                const fechaObj = String(fechaAgenda || '').trim();
                const horaObj = String(horaAgenda || '').replace('h', '').trim();
                const candidata = window.datosAgenda.find(c => {
                    const matCita = String(c?.matricula || '').replace(/\s/g, '').toUpperCase();
                    const mismaMat = matObj && matCita && matObj === matCita;
                    if (!mismaMat) return false;
                    if (!c?.fechaHora) return true;
                    const f = new Date(c.fechaHora);
                    if (isNaN(f.getTime())) return true;
                    const fechaTxt = f.toLocaleDateString('es-ES');
                    const horaTxt = `${f.getHours()}:00`;
                    const mismaFecha = !fechaObj || fechaTxt === fechaObj;
                    const mismaHora = !horaObj || horaTxt === horaObj;
                    return mismaFecha && mismaHora;
                });
                idObjetivo = candidata?.id || '';
            }

            if (!idObjetivo) {
                Swal.fire('Aviso', 'No se ha podido localizar la cita para marcarla automáticamente. Ábrela desde Agenda y vuelve a confirmar.', 'warning');
                return;
            }

            const tsEntrega = typeof window.obtenerTimestamp === 'function' ? window.obtenerTimestamp() : Date.now();
            const fechaEntregaTexto = typeof window.formatearFechaES === 'function' ? window.formatearFechaES(tsEntrega) : new Date(tsEntrega).toLocaleDateString('es-ES');

            await window.updateDoc(window.doc(window.db, 'citas_agenda', idObjetivo), {
                estado: 'confirmada',
                entregado: true,
                fechaEntrega: tsEntrega,
                fechaEntregaTexto,
                tipoFinalizacion: 'DEVOLUCION'
            });

            if (typeof window.registrarMovimientoHistorial === 'function') {
                await window.registrarMovimientoHistorial({
                    tipo: 'DEVOLUCION',
                    citaId: idObjetivo,
                    vehiculoId: null,
                    matricula: matriculaAgenda || 'S/M',
                    bastidor: 'S/D',
                    modelo: modeloAgenda || 'DEVOLUCION',
                    detalle: 'Devolucion completada desde agenda sin tarjeta de vehiculo'
                });
            }

            Swal.fire('Devolución completada', 'Se ha marcado en verde y enviada al historial.', 'success');
            if (typeof window.renderizarVistas === 'function') window.renderizarVistas();
            if (typeof window.dibujarCuadranteMes === 'function') window.dibujarCuadranteMes();
            return;
        } catch (errorDevolucion) {
            console.error('Error al completar devolución sin inventario:', errorDevolucion);
            Swal.fire('Error', 'No se pudo completar la devolución.', 'error');
            return;
        }
    }

    // 3. Lanzamos la pregunta
    if (esDeAgendaSinDb) {
        const confirmacionAlta = await Swal.fire({
            title: 'Vehículo no encontrado',
            html: `
                <p class="text-sm text-gray-700">No existe este vehículo en GesCar.</p>
                <p class="mt-2 text-sm text-gray-700">¿Quieres crear la tarjeta con los datos de esta cita y marcarla como entregada?</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#001e50',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, crear vehículo',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmacionAlta.isConfirmed) return;

        try {
            const resultadoAlta = await window.crearVehiculoDesdeCitaAgenda({
                modelo: modeloAgenda,
                matricula: matriculaAgenda,
                fecha: fechaAgenda,
                hora: horaAgenda,
                cliente: window.usuarioActivo || 'Cliente'
            }, { modelo: modeloAgenda, matricula: matriculaAgenda, fecha: fechaAgenda, hora: horaAgenda });

            Swal.fire({
                icon: 'success',
                title: 'Vehículo creado',
                text: `Se ha creado la tarjeta de ${resultadoAlta.matricula} y se ha registrado la entrega.`,
                confirmButtonColor: '#001e50'
            });

            if (typeof window.cargar === 'function') window.cargar();
            return;
        } catch (error) {
            console.error('Error creando vehículo desde cita:', error);
            Swal.fire('Error', 'No se pudo crear la tarjeta del vehículo.', 'error');
            return;
        }
    }

    const accion = await Swal.fire({
        title: '¿Qué ha pasado con este vehículo?',
        html: `<b class="text-lg text-[#001e50]">${cocheC}</b><br>Matrícula: <b>${cocheB}</b><br><br>Su fecha de entrega planificada ya ha llegado o ha pasado.`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="ph-bold ph-check"></i> Sí, Entregado',
        denyButtonText: '<i class="ph-bold ph-calendar"></i> Reagendar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981', 
        denyButtonColor: '#f59e0b',  
    });

    // 3. Acciones de Respuesta
    if (accion.isConfirmed) {
        try {
            if (!esDeAgendaSinDb) {
                // Actualizamos la base de datos
                await window.updateDoc(window.doc(window.db, "vehiculos", fila), {
                    entregado: true,
                    fechaEntrega: new Date().toISOString()
                });
                if(typeof window.cargar === 'function') window.cargar(); 
                Swal.fire('¡Éxito!', 'Vehículo marcado como entregado.', 'success');
            } else {
                // Si era una cita manual sin coche asignado, le avisamos de que lo borre de la agenda
                Swal.fire('Cita Externa', 'Este vehículo no está en el inventario activo. Para confirmar su entrega, haz clic en la cita de la agenda y dale a Eliminar.', 'info');
            }
        } catch (e) {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
        }
    } else if (accion.isDenied) {
        // Reagendar
        if (!esDeAgendaSinDb) {
            if(typeof window.editarVehiculoBasico === 'function') {
                window.editarVehiculoBasico(fila, window.escapeJS(cocheA), window.escapeJS(cocheB), window.escapeJS(cocheC));
            }
        } else {
            Swal.fire('Reagendar Cita', 'Para cambiar la fecha, haz clic directamente sobre la tarjeta de la cita en la agenda.', 'info');
        }
    }
};
// ==========================================
// 🖨️ GENERADOR DE HOJAS PARA PREPARADORES
// ==========================================

window.generarListadoDiario = function() {
    const obtenerFechaKey = (valor) => {
        if (!valor) return '';
        let fechaObj = null;

        if (valor instanceof Date) {
            fechaObj = valor;
        } else if (typeof valor === 'string') {
            const normalizada = valor.replace(' ', 'T');
            const parseada = new Date(normalizada);
            if (!isNaN(parseada.getTime())) fechaObj = parseada;
            if (!fechaObj && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.substring(0, 10);
        }

        if (!fechaObj || isNaN(fechaObj.getTime())) return '';
        return `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}-${String(fechaObj.getDate()).padStart(2, '0')}`;
    };

    const obtenerHoraTexto = (valor) => {
        if (!valor) return '--:--';

        if (valor instanceof Date) {
            if (isNaN(valor.getTime())) return '--:--';
            return `${String(valor.getHours()).padStart(2, '0')}:${String(valor.getMinutes()).padStart(2, '0')}`;
        }

        if (typeof valor === 'string') {
            const match = valor.match(/(\d{1,2}):(\d{2})/);
            if (match) return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
        }

        return '--:--';
    };

    const obtenerTimestamp = (valor) => {
        if (valor instanceof Date) return isNaN(valor.getTime()) ? Number.MAX_SAFE_INTEGER : valor.getTime();
        if (typeof valor === 'string') {
            const parseada = new Date(valor.replace(' ', 'T'));
            return isNaN(parseada.getTime()) ? Number.MAX_SAFE_INTEGER : parseada.getTime();
        }
        return Number.MAX_SAFE_INTEGER;
    };

    const esCitaDevolucion = (cita) => {
        const modelo = String(cita?.modelo || '').toUpperCase();
        return modelo.includes('DEVOLUCION') || modelo.includes('DEVOLUCIÓN');
    };

    // 1. Preparamos la fecha de hoy por defecto para el formulario
    let hoy = new Date();
    let diaDefecto = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, '0') + "-" + String(hoy.getDate()).padStart(2, '0');

    // 2. Preguntamos para qué día queremos sacar la hoja
    Swal.fire({
        title: 'Hoja de Preparadores',
        html: `
            <div class="text-left mb-3" style="font-family: sans-serif;">
                <label class="text-xs font-bold text-gray-500 uppercase">Selecciona el día de las entregas:</label>
                <input type="date" id="fecha-hoja-preparadores" class="swal2-input !w-full !m-0 !mt-1" value="${diaDefecto}">
            </div>
        `,
        confirmButtonText: '<i class="ph-bold ph-printer text-lg"></i> Generar Hoja',
        confirmButtonColor: '#001e50',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const fechaSelec = document.getElementById('fecha-hoja-preparadores').value;
            if (!fechaSelec) return Swal.showValidationMessage('Debes seleccionar una fecha.');
            return fechaSelec;
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            let fechaElegida = result.value; // Formato AAAA-MM-DD
            let fechaVisual = fechaElegida.split('-').reverse().join('/'); // Formato DD/MM/AAAA

            // 3. Buscamos todas las citas en la agenda para ese día concreto
            // (Descartamos los huecos libres "---" y los bloqueos/vacaciones)
            const agendaFuente = Array.isArray(window.datosAgenda) ? window.datosAgenda : [];
            let citasDelDia = agendaFuente.filter(c => 
                c &&
                obtenerFechaKey(c.fechaHora) === fechaElegida &&
                c.matricula !== "---" &&
                !c.isBlock &&
                !esCitaDevolucion(c)
            );

            // Si no hay nada, avisamos
            if (citasDelDia.length === 0) {
                return Swal.fire('Sin Entregas', 'No hay ningún vehículo programado en la agenda para el día ' + fechaVisual, 'info');
            }

            // 4. Ordenamos las citas cronológicamente (de 10:00 a 19:00)
            citasDelDia.sort((a, b) => obtenerTimestamp(a.fechaHora) - obtenerTimestamp(b.fechaHora));

            const mensajeWhatsApp = [
                `*HOJA PREPARACION* ${fechaVisual}`,
                '',
                ...citasDelDia.map(c => {
                    const horaCita = obtenerHoraTexto(c.fechaHora);
                    const rentingTxt = (c.renting || 'S/D').toUpperCase();
                    const voTxt = (c.entregaVO === 'SÍ' || c.entregaVO === 'SI') ? ' | RECOGE VO' : '';
                    return `${horaCita} | ${c.matricula || 'S/M'} | ${c.modelo || 'VEHICULO'} | ${c.cliente || 'CLIENTE'} | RENTING: ${rentingTxt}${voTxt}`;
                })
            ].join('\n');

            const waUrl = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`;

            // 5. Construimos el HTML de la página imprimible
            let htmlImprimir = `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <title>Preparación - ${fechaVisual}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 30px; color: #111827; }
                        .cabecera { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #001e50; padding-bottom: 15px; margin-bottom: 25px; }
                        h1 { color: #001e50; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
                        .acciones { display: flex; gap: 10px; }
                        .btn-print, .btn-wa { padding: 12px 24px; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; text-transform: uppercase; text-decoration: none; display: inline-flex; align-items: center; }
                        .btn-print { background: #00b0f0; }
                        .btn-print:hover { background: #008cc0; }
                        .btn-wa { background: #16a34a; }
                        .btn-wa:hover { background: #15803d; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #d1d5db; padding: 14px; text-align: left; vertical-align: middle; }
                        th { background-color: #f3f4f6; color: #001e50; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                        .hora { font-weight: 900; font-size: 18px; color: #001e50; text-align: center; }
                        .mat { font-family: 'Courier New', monospace; font-weight: 900; font-size: 18px; background: #f9fafb; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 4px; display: inline-block; }
                        .check-box { width: 24px; height: 24px; border: 2px solid #9ca3af; border-radius: 4px; margin: 0 auto; }
                        .vo-badge { background: #f3e8ff; color: #7e22ce; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #d8b4fe; }
                        
                        /* Ocultamos el botón al imprimir */
                        @media print {
                            .acciones { display: none !important; }
                            body { margin: 0; }
                            @page { margin: 1cm; size: A4 portrait; }
                        }
                    </style>
                </head>
                <body>
                    <div class="cabecera">
                        <h1>🚘 Hoja de Lavadero y Preparación | ${fechaVisual}</h1>
                        <div class="acciones">
                            <a class="btn-wa" href="${waUrl}" target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
                            <button class="btn-print" onclick="window.print()">Imprimir Hoja</button>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 80px; text-align: center;">Hora</th>
                                <th style="width: 140px;">Matrícula / VIN</th>
                                <th>Vehículo y Cliente</th>
                                <th>Renting</th>
                                <th>Notas / VO</th>
                                <th style="width: 70px; text-align: center;">Listo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${citasDelDia.map(c => {
                                // Extraemos la hora (de "2026-07-03T16:00:00" sacamos "16:00")
                                let horaCita = obtenerHoraTexto(c.fechaHora);
                                
                                // Formateamos la alerta de si el cliente entrega Vehículo de Ocasión (VO)
                                let etiquetaVO = (c.entregaVO === 'SÍ' || c.entregaVO === 'SI') ? '<span class="vo-badge">RECOGE V.O.</span>' : '';
                                
                                return `
                                    <tr>
                                        <td class="hora">${horaCita}</td>
                                        <td>
                                            <span class="mat">${c.matricula}</span>
                                            <div style="font-size: 11px; color: #6b7280; margin-top: 6px; font-weight: bold;">VIN: ${c.bastidor || 'S/D'}</div>
                                        </td>
                                        <td>
                                            <strong style="font-size: 15px; color: #111827; text-transform: uppercase;">${c.modelo}</strong><br>
                                            <span style="font-size: 12px; color: #4b5563;">${c.cliente}</span>
                                        </td>
                                        <td style="font-weight: bold; color: #374151; text-transform: uppercase;">${c.renting || 'S/D'}</td>
                                        <td style="font-size: 12px; color: #ef4444; font-weight: bold;">
                                            ${etiquetaVO}
                                            <div style="margin-top: ${etiquetaVO ? '6px' : '0'};">${c.notas || ''}</div>
                                        </td>
                                        <td><div class="check-box"></div></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            // 6. Abrimos la vista en una pestaña nueva para que puedan darle al botón de imprimir
            let ventanaImpresion = window.open('', '_blank');
            if (!ventanaImpresion) {
                Swal.fire('Popup bloqueado', 'El navegador ha bloqueado la hoja de impresión. Permite ventanas emergentes para esta web e inténtalo de nuevo.', 'warning');
                return;
            }
            ventanaImpresion.document.write(htmlImprimir);
            ventanaImpresion.document.close();
        }
    });
};

window.suscribirMovimientosHistorial = function() {
    if (!window.db || !window.collection || !window.onSnapshot) return;
    if (unsubscribeMovimientos) unsubscribeMovimientos();

    unsubscribeMovimientos = window.onSnapshot(window.collection(window.db, "movimientos_historial"), (snapshot) => {
        const lista = [];
        snapshot.forEach(doc => {
            const data = doc.data() || {};
            data.id = doc.id;
            lista.push(data);
        });

        lista.sort((a, b) => {
            const tsA = Number(a.ts || a.fechaEntregaTs || 0) || 0;
            const tsB = Number(b.ts || b.fechaEntregaTs || 0) || 0;
            return tsB - tsA;
        });

        window.movimientosHistorial = lista;

        if (activeTab === 'entregados' && typeof window.renderEntregados === 'function') {
            window.renderEntregados();
        }
        if (activeTab === 'dashboard' && typeof window.renderizarDashboard === 'function') {
            window.renderizarDashboard();
        }
    }, (error) => {
        console.warn('Aviso: no se pudo sincronizar movimientos_historial.', error);
    });
};