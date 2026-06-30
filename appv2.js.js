// ==========================================
// ⚙️ NÚCLEO DE LA APLICACIÓN (APP.JS)
// ==========================================

// Variables globales de sesión y estado
window.usuarioActivo = "";
window.rolActivo = "";
window.userRole = ""; 
let activeTab = 'logistica'; 
let modoVistaActual = 'tarjetas'; 
let primeraCargaDb = true;
let unsubscribeFirebase = null; 
let todosLosCoches = []; 
let filtroActual = 'todos';
window.chatDestinoActual = ""; // Variable para el chat global

// 🔥 HERRAMIENTA CLAVE: Escapar variables
window.escapeJS = function(str) {
    return String(str || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
};

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
// 🔒 SISTEMA DE ACCESO Y ROLES
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
};

window.iniciar = async function() {
    const depto = document.getElementById('selectDepartamento').value;
    const usuarioInput = document.getElementById('userLogin').value.trim().toUpperCase();
    const passInput = document.getElementById('userPass').value.trim();

    if (!depto || !usuarioInput || !passInput) {
        return Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Por favor, completa la información requerida.' });
    }

    const directorioPersonal = {
        "MANUEL.ARJONA": "entregas", "ANTONIO.BERMEJO": "entregas",
        "MANUEL.LOPEZ": "taller", "ALVARO.BELTRAN": "taller",
        "SERGIO.CABALLERO": "recambios", "FERNANDO.CRESPO": "recambios", "JAIME.JORGE": "recambios", "FERNANDO.REMON": "recambios", "ABRAHAM.CANIZARES": "recambios",
        "FATIMA.GARCIA": "backoffice", "GEMA.GOMEZ": "backoffice", "ALBERTO.GUTIERREZ": "backoffice", "RABAB.JAADAR": "backoffice", "RUBEN.GARCIA": "backoffice"
    };
    
    let rolVerdadero = directorioPersonal[usuarioInput];
    if (usuarioInput === "PRUEBAS") {
        rolVerdadero = depto; 
    } else {
        if (!rolVerdadero) return Swal.fire({ icon: 'error', title: 'Usuario no reconocido', text: 'No registrado en el sistema.' });
        if (rolVerdadero !== depto) return Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: `Sin permisos para ${depto}.` });
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

        if (passInput === "Castellana2026!" || passInput === "provisional123") { 
            const { value: nuevaPassword } = await Swal.fire({
                title: '🔑 Cambio de Clave Obligatorio', text: 'Sustituye la contraseña provisional.',
                input: 'password', allowOutsideClick: false, allowEscapeKey: false,
                confirmButtonText: 'Actualizar Contraseña',
                inputValidator: (value) => { if (!value || value.length < 6) return 'Mínimo 6 caracteres'; }
            });
            if (nuevaPassword) {
                await window.updatePassword(user, nuevaPassword);
                await Swal.fire('¡Actualizada!', 'Tu contraseña ha sido guardada.', 'success');
            }
        }
        
        localStorage.setItem('vw_departamento', window.rolActivo);
        localStorage.setItem('vw_usuario', window.usuarioActivo);
        window.iniciarAppDirectamente(window.rolActivo, window.usuarioActivo);

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'Usuario o contraseña incorrectos.' });
        btn.innerText = textoOriginal;
    }
};

window.aplicarPermisosPorRol = function() {
    if (window.rolActivo === "backoffice") {
        document.querySelectorAll('#botonesLogistica, .btn-guardar, button[onclick*="guardar"], button[onclick*="eliminar"], button[onclick*="anadirVehiculoManual"], button[onclick*="abrirGestorVacaciones"], button[onclick*="generarListadoDiario"]').forEach(btn => {
            btn.style.setProperty('display', 'none', 'important');
        });
        
        document.querySelectorAll('#contenedorLogistica, #contenedorTarjetas, #contenedorTabla, #contenedorAgenda').forEach(contenedor => {
            if (!contenedor) return;
            contenedor.querySelectorAll('input, select, textarea').forEach(campo => {
                const idCampo = (campo.id || "").toLowerCase();
                const claseCampo = (campo.className || "").toLowerCase();
                if (idCampo !== 'buscadorinput' && !idCampo.includes('nota') && !claseCampo.includes('nota') && !idCampo.includes('chat')) {
                    campo.disabled = true; campo.style.cursor = 'not-allowed';
                }
            });
            contenedor.querySelectorAll('button').forEach(btn => {
                const clickAccion = (btn.getAttribute('onclick') || '').toLowerCase();
                if (!clickAccion.includes('abrirchat') && !clickAccion.includes('nota') && !clickAccion.includes('crearcitamanual')) {
                    btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; btn.style.pointerEvents = 'none';
                }
            });
        });
    }
};


window.gestionarCitaDesdeBanda = function(fila) {
    if (activeTab !== 'logistica' && activeTab !== 'todos') {
        if (typeof window.cambiarPestana === 'function') {
            window.cambiarPestana('logistica');
        }
    }
    // Llama a la interrogación que ya arreglamos
    if(typeof window.preguntarSiEntregado === 'function') {
        window.preguntarSiEntregado(fila);
    }
};

window.gestionarCitaDesdeBanda = function(fila) {
    if (activeTab !== 'logistica' && activeTab !== 'todos') {
        if (typeof window.cambiarPestana === 'function') {
            window.cambiarPestana('logistica');
        }
    }
    // Disparamos la interrogación (ya programada previamente)
    window.preguntarSiEntregado(fila);
};
window.gestionarCitaDesdeBanda = function(fila) {
    if (activeTab !== 'logistica' && activeTab !== 'todos') {
        if (typeof window.cambiarPestana === 'function') window.cambiarPestana('logistica');
    }
    window.preguntarSiEntregado(fila);
};
window.iniciarAppDirectamente = function(rol, usuario) {
    window.rolActivo = rol; window.userRole = rol; window.usuarioActivo = usuario || rol;
    document.getElementById('roleBadge').innerText = `${window.usuarioActivo} (${window.rolActivo})`;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebarApp').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'flex';
    
    window.cargar(); 
    
    if (typeof window.iniciarMotorAlertas === 'function') { 
        window.iniciarMotorAlertas(); 
    }

    if (rol === 'entregas' || rol === 'backoffice') {
        if (typeof window.iniciarMotorAlertas === 'function') window.iniciarMotorAlertas(); 
        if (rol === 'backoffice' && typeof window.escucharNotificacionesBackOffice === 'function') window.escucharNotificacionesBackOffice();
        document.getElementById('tabsDpto').classList.replace('flex', 'hidden');
        document.getElementById('tabsEntregas').classList.replace('hidden', 'flex');
        if (rol === 'entregas') document.getElementById('botonesLogistica').classList.replace('hidden', 'flex');
        window.cambiarPestana('todos');
    } else { 
        document.getElementById('tabsEntregas').classList.replace('flex', 'hidden'); 
        document.getElementById('tabsDpto').classList.replace('hidden', 'flex');
        document.getElementById('iconoDptoCurso').className = `ph-bold ${rol === 'taller' ? 'ph-wrench' : 'ph-package'} text-lg`;
        window.cambiarPestana('global-' + rol);
    }
};

window.cerrarSesion = function() { 
    localStorage.removeItem('vw_departamento'); localStorage.removeItem('vw_usuario'); location.reload(); 
};

// ==========================================
// 🚀 INICIO Y EVENTOS GLOBALES
// ==========================================
window.onload = function() {
    const rol = localStorage.getItem('vw_departamento');
    const usr = localStorage.getItem('vw_usuario');
    if (rol) window.iniciarAppDirectamente(rol, usr); 

    document.getElementById("btnAbout").onclick = function() { document.getElementById("aboutModal").style.display = "block"; };
    document.getElementById("btnClose").onclick = function() { document.getElementById("aboutModal").style.display = "none"; };
    window.onclick = function(event) { if (event.target == document.getElementById("aboutModal")) document.getElementById("aboutModal").style.display = "none"; };
};

window.safeISOString = function(value) {
    let date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
};

window.mostrarErrorFirebase = function(error, titulo) {
    let esErrorCritico = error && error.code === 'permission-denied';
    Swal.fire({
        icon: esErrorCritico ? 'error' : 'warning',
        title: titulo || 'Aviso del Sistema',
        text: esErrorCritico ? 'Permiso denegado. Sesión caducada.' : 'Pequeño error de interfaz.',
        toast: !esErrorCritico, position: esErrorCritico ? 'center' : 'bottom-end',
        showConfirmButton: esErrorCritico, timer: esErrorCritico ? undefined : 4000
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
        menu.classList.remove('hidden'); menu.classList.add('flex'); chevron.style.transform = 'rotate(180deg)'; 
    } else {
        menu.classList.add('hidden'); menu.classList.remove('flex'); chevron.style.transform = 'rotate(0deg)'; 
    }
};

window.cambiarPestana = function(pestana) {
    activeTab = pestana;
    try {
        const botones = document.querySelectorAll('#tabsEntregas .submenu-container button');
        botones.forEach(b => { b.classList.remove('bg-white/10', 'text-white', 'text-amber-300', 'bg-emerald-400'); b.classList.add('text-gray-400'); });
        const botonesDpto = document.querySelectorAll('#tabsDpto button');
        if (botonesDpto) botonesDpto.forEach(b => { b.classList.remove('bg-white/10', 'text-white'); b.classList.add('text-gray-300'); });
        
        if (botones && botones.length > 0) {
            if (pestana === 'logistica' && botones[0]) { botones[0].classList.remove('text-gray-400'); botones[0].classList.add('text-amber-300', 'bg-white/10'); }
            else if (pestana === 'todos' && botones[1]) { botones[1].classList.remove('text-gray-400'); botones[1].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'agenda' && botones[2]) { botones[2].classList.remove('text-gray-400'); botones[2].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'global-taller' && botones[3]) { botones[3].classList.remove('text-gray-400'); botones[3].classList.add('text-white', 'bg-white/10'); if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white'); }
            else if (pestana === 'global-recambios' && botones[4]) { botones[4].classList.remove('text-gray-400'); botones[4].classList.add('text-white', 'bg-white/10'); if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white'); }
            else if (pestana === 'entregados' && botones[5]) { botones[5].classList.remove('text-gray-400'); botones[5].classList.add('text-white', 'bg-white/10'); }
            else if (pestana === 'dashboard' && botones[6]) { botones[6].classList.remove('text-gray-400'); botones[6].classList.add('text-emerald-400', 'bg-white/10'); }
            else if (pestana === 'encuestas' && botones[7]) { botones[7].classList.remove('text-gray-400'); botones[7].classList.add('text-white', 'bg-white/10'); }
        }  
        if (pestana === 'historial-dpto' && botonesDpto && botonesDpto[1]) botonesDpto[1].classList.add('bg-white/10', 'text-white'); 
    } catch (e) {}

    const elementosOcultar = ['contenedorLogistica', 'contenedorTarjetas', 'contenedorTabla', 'contenedorAgenda', 'contenedorEntregados', 'contenedorDashboard', 'contenedorEncuestas', 'contenedorHistorialDpto', 'filtrosVisuales', 'controlesVistaExcel', 'botonesLogistica', 'botonesAgenda'];
    elementosOcultar.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    const buscador = document.getElementById('buscadorInput'); if (buscador) buscador.style.display = 'block';

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
            const c = document.getElementById('contenedorAgenda'); if (c) c.style.display = 'block';
            if (buscador) buscador.style.display = 'none';
            const b = document.getElementById('botonesAgenda'); if (b) b.style.display = 'flex'; 
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
            const c = document.getElementById('contenedorHistorialDpto'); if (c) c.style.display = 'flex';
            if (buscador) buscador.style.display = 'none';
            if (typeof window.cargarUltimosHistorialDpto === 'function') window.cargarUltimosHistorialDpto();
        }
    } catch (e) {}
    
    if (pestana !== 'dashboard' && pestana !== 'encuestas' && pestana !== 'historial-dpto') {
        if (typeof window.cargar === 'function') window.cargar();
    }
    if (typeof window.aplicarPermisosPorRol === 'function') window.aplicarPermisosPorRol();

    // ESCUDO DEL HISTORIAL
    if (pestana === 'historial-dpto') { document.body.classList.add('viendo-historial'); } 
    else { document.body.classList.remove('viendo-historial'); }
};
// 🔥 Esta función es la que pregunta si el coche se ha entregado
// 🔥 1. Función mejorada con opciones de Entregar o Reagendar
window.preguntarSiEntregado = async function(fila) {
    // Buscamos los datos exactos del coche en nuestra base descargada
    let coche = todosLosCoches.find(c => c.fila === fila);
    if (!coche) return;

    const accion = await Swal.fire({
        title: '¿Qué ha pasado con este vehículo?',
        html: `<b class="text-lg text-[#001e50]">${coche.C}</b><br>Matrícula: <b>${coche.B}</b><br><br>Su fecha de entrega planificada ya ha pasado.`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '<i class="ph-bold ph-check"></i> Sí, Entregado',
        denyButtonText: '<i class="ph-bold ph-calendar"></i> Reagendar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981', // Verde esmeralda para éxito
        denyButtonColor: '#f59e0b',  // Ámbar para reagendar
    });

    if (accion.isConfirmed) {
        try {
            await window.updateDoc(window.doc(window.db, "vehiculos", fila), {
                entregado: true,
                fechaEntrega: new Date().toISOString()
            });
            window.cargar(); // Refresca los datos para ocultar el coche
            Swal.fire('¡Éxito!', 'Vehículo marcado como entregado.', 'success');
        } catch (e) {
            Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
        }
    } else if (accion.isDenied) {
        // Si elige reagendar, abrimos el editor básico usando tus funciones ya existentes
        if(typeof window.editarVehiculoBasico === 'function') {
            window.editarVehiculoBasico(fila, window.escapeJS(coche.A), window.escapeJS(coche.B), window.escapeJS(coche.C));
        }
    }
};
window.cargar = function() {
    if(unsubscribeFirebase) unsubscribeFirebase();
    unsubscribeFirebase = window.onSnapshot(window.collection(window.db, "vehiculos"), (snapshot) => {
        todosLosCoches = [];
        snapshot.forEach(doc => { 
            let c = doc.data(); c.fila = doc.id; 
            c.A = c.bastidor || "Sin Bastidor"; c.B = c.matricula || c.Matricula || "S/M"; c.C = c.modelo || "VW"; 
            let chatProcess = c.chatInfo;
            if (!chatProcess && c.chat && typeof c.chat === 'string') { try { chatProcess = JSON.parse(c.chat); } catch(e) {} }
            c.chatData = chatProcess || {history: [], lastOpened: {}};
            todosLosCoches.push(c); 
        });
        todosLosCoches.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));

        if (window.rolActivo === 'taller' || window.rolActivo === 'recambios') {
            if(typeof window.renderizarDepartamentos === 'function') window.renderizarDepartamentos(window.rolActivo);
            if (activeTab === 'historial-dpto') { window.cargarUltimosHistorialDpto(); }
        } else if (window.rolActivo === 'entregas' || window.rolActivo === 'backoffice') {
            if (activeTab === 'logistica') {
                if(typeof window.renderLogistica === 'function') window.renderLogistica();
            } else if (activeTab === 'todos') { 
                window.actualizarContadores(); 
                if(typeof window.renderizarVistas === 'function') window.renderizarVistas(); 
            } else if (activeTab === 'global-taller') {
                let cochesEnTaller = todosLosCoches.filter(c => c.enTaller && !c.finTaller && c.entregado !== true && c.entregado !== "true");
                let div = document.getElementById('contenedorTarjetas');
                div.innerHTML = cochesEnTaller.length === 0 ? `<div class="col-span-full bg-white p-12 rounded-xl text-center"><p class="text-gray-500 font-bold">No hay vehículos en Taller.</p></div>` : cochesEnTaller.map(c => window.renderTarjetaCompacta(c)).join('');
            } else if (activeTab === 'global-recambios') {
                let cochesEnRecambios = todosLosCoches.filter(c => c.enRecambios && !c.finRecambios && c.entregado !== true && c.entregado !== "true");
                let div = document.getElementById('contenedorTarjetas');
                div.innerHTML = cochesEnRecambios.length === 0 ? `<div class="col-span-full bg-white p-12 rounded-xl text-center"><p class="text-gray-500 font-bold">No hay vehículos en Recambios.</p></div>` : cochesEnRecambios.map(c => window.renderTarjetaCompacta(c)).join('');
            } else if (activeTab === 'agenda') {
                if(typeof window.renderAgenda === 'function') window.renderAgenda();
            } else if (activeTab === 'entregados') {
                if(typeof window.renderEntregados === 'function') window.renderEntregados();
            }
            if (primeraCargaDb) {
                primeraCargaDb = false;
                setTimeout(() => { if(typeof window.sincronizarCitasSilencioso === 'function') window.sincronizarCitasSilencioso(); }, 1500); 
            }
        }
        window.aplicarPermisosPorRol();
    }, (error) => { window.mostrarErrorFirebase(error, 'Error al cargar vehículos'); });
};
// ==========================================
// 🎨 PINTORES DE LA INTERFAZ (LOGÍSTICA E INVENTARIO)
// ==========================================

window.renderLogistica = function() {
    // Filtro arreglado para que no desaparezcan coches
    let logistica = todosLosCoches.filter(c => c.pasoAInventario !== true && c.entregado !== true && c.entregado !== "true");
    let div = document.getElementById('contenedorLogistica');
    
    if (!div) return;
    
    if (logistica.length === 0) {
        div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay vehículos en fase de logística previa.</p></div>`;
    } else {
        div.innerHTML = logistica.map(c => {
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

            // RESTAURADO: Tu historial detallado
            let arrTaller = c.peticionesTaller || (c.instruccionTaller ? [{fecha: c.fechaEntradaTaller || '-', motivo: c.instruccionTaller, url: c.urlParte}] : []);
            let arrRecambios = c.peticionesRecambios || (c.instruccionRecambios ? [{fecha: c.fechaEntradaRecambios || '-', motivo: c.instruccionRecambios, url: c.urlParte}] : []);

            let txtTallerInfo = c.enTaller ? `<div class="text-[9px] bg-amber-50 text-amber-800 px-2 py-1 rounded mt-1 font-bold">OR: ${c.ordenTaller||'Pte'} | Prev: ${c.fechaTaller||'Pte'}</div>` : '';
            let txtRecambiosInfo = c.enRecambios ? `<div class="text-[9px] bg-teal-50 text-teal-800 px-2 py-1 rounded mt-1 font-bold">Ped: ${c.ordenRecambios||'Pte'} | Prev: ${c.fechaRecambios||'Pte'}</div>` : '';

            txtTallerInfo += arrTaller.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-amber-400 pl-1.5"><b class="text-amber-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');
            txtRecambiosInfo += arrRecambios.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-teal-500 pl-1.5"><b class="text-teal-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');

            let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';

            return `
            <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm fila-coche flex flex-col relative">
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

              <!-- RESTAURADO: Botones Renting y Agencia -->
              <div class="flex gap-2 mb-3">
                 <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-buildings"></i> ${c.renting || 'Renting'}</button>
                 <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-truck"></i> ${c.agencia || 'Agencia'}</button>
              </div>

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

// ==========================================
// 🎨 RESTAURACIÓN COMPLETA DE VISTAS (TARJETAS Y TABLA EXCEL)
// ==========================================

window.renderizarVistas = function() {
    let inventario = todosLosCoches.filter(c => c.pasoAInventario === true && c.entregado !== true && c.entregado !== "true");
    
    let fActual = typeof filtroActual !== 'undefined' ? filtroActual : 'todos';
    if (fActual === 'pendientes') inventario = inventario.filter(c => !c.enTaller && !c.enRecambios && !c.fechaCita);
    else if (fActual === 'concita') inventario = inventario.filter(c => !!c.fechaCita);
    else if (fActual === 'taller') inventario = inventario.filter(c => c.enTaller && !c.finTaller);
    else if (fActual === 'recambios') inventario = inventario.filter(c => c.enRecambios && !c.finRecambios);

    let divTarjetas = document.getElementById('contenedorTarjetas');
    if (divTarjetas) {
        if (inventario.length === 0) {
            divTarjetas.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl text-center border border-gray-100"><p class="text-gray-500 font-bold">No hay vehículos en esta sección.</p></div>`;
        } else {
            divTarjetas.innerHTML = inventario.map(c => window.renderTarjetaCompacta(c)).join('');
        }
    }

    // Tabla Excel Restaurada
    let divTabla = document.getElementById('contenedorTabla');
    if (divTabla) {
        if (inventario.length === 0) {
            divTabla.innerHTML = `<div class="bg-white p-12 rounded-xl text-center border border-gray-200"><p class="text-gray-500 font-bold">No hay vehículos para mostrar en la tabla.</p></div>`;
        } else {
            let filasHtml = inventario.map(c => {
                let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27"); 
                let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
                let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
                let escA = window.escapeJS ? window.escapeJS(c.A) : c.A; 
                let escB = window.escapeJS ? window.escapeJS(c.B) : c.B; 
                let escC = window.escapeJS ? window.escapeJS(c.C) : c.C;
                let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';
                
                let estadoTxt = c.fechaCita ? `<span class="text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-flex items-center gap-1"><i class="ph-bold ph-calendar"></i> ${c.fechaCita}</span>` : `<span class="text-gray-400 italic">Sin Cita</span>`;
                if (c.enTaller && !c.finTaller) estadoTxt = `<span class="text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-pulse">⚙️ Taller</span>`;
                else if (c.enRecambios && !c.finRecambios) estadoTxt = `<span class="text-teal-700 font-bold bg-teal-50 px-2 py-1 rounded border border-teal-200 animate-pulse">📦 Recambios</span>`;

                return `
                <tr class="hover:bg-gray-50/80 transition-colors border-b border-gray-100">
                    <td class="p-3 pl-4 font-black text-[#001e50] uppercase text-sm">${c.C || 'VW'}</td>
                    <td class="p-3">
                        <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-900 font-bold border border-gray-200">${c.B || 'S/M'}</span>
                        <div class="text-[10px] text-gray-400 font-mono mt-1">VIN: ${c.A || 'S/B'}</div>
                    </td>
                    <td class="p-3">
                        <div class="font-bold text-gray-800">${c.cliente || 'SIN ASIGNAR'}</div>
                        <div class="text-[10px] text-gray-400 mt-0.5">${c.telefono || ''} ${c.email ? `| ${c.email}` : ''}</div>
                    </td>
                    <td class="p-3 uppercase font-black text-gray-500 text-[11px]">${c.renting || 'N/A'}</td>
                    <td class="p-3">${estadoTxt}</td>
                    <td class="p-3 text-center pr-4">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-7 h-7 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-sm"></i>${burbuja}</button>
                            <button onclick="window.preguntarSiEntregado('${c.fila}')" class="w-7 h-7 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white shadow-sm transition-colors" title="Confirmar Entrega"><i class="ph-bold ph-question text-sm"></i></button>
                            <button onclick="window.editarVehiculoBasico('${c.fila}', '${escA}', '${escB}', '${escC}')" class="w-7 h-7 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-colors" title="Editar"><i class="ph-bold ph-pencil-simple text-sm"></i></button>
                            <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="w-7 h-7 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm transition-colors" title="Eliminar"><i class="ph-bold ph-trash text-sm"></i></button>
                        </div>
                    </td>
                </tr>`;
            }).join('');

            divTabla.innerHTML = `
            <div class="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-[#001e50] text-white text-xs uppercase tracking-wider font-black">
                    <th class="p-3 pl-4">Vehículo</th>
                    <th class="p-3">Matrícula / VIN</th>
                    <th class="p-3">Cliente / Conductor</th>
                    <th class="p-3">Renting</th>
                    <th class="p-3">Planificación / Estado</th>
                    <th class="p-3 text-center pr-4">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                    ${filasHtml}
                </tbody>
              </table>
            </div>`;
        }
    }
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
// ==========================================
// 🎴 DIBUJAR TARJETA COMPACTA INDIVIDUAL
// ==========================================
window.renderTarjetaCompacta = function(c) {
    let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27"); 
    let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
    let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
    let escA = window.escapeJS ? window.escapeJS(c.A) : c.A; 
    let escB = window.escapeJS ? window.escapeJS(c.B) : c.B; 
    let escC = window.escapeJS ? window.escapeJS(c.C) : c.C;

    let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';

    let badgeTaller = c.enTaller ? (c.finTaller ? `<span class="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">✓ Taller OK</span>` : `<span class="px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-200 animate-pulse">⚙️ En Taller</span>`) : '';
    let badgeRecambios = c.enRecambios ? (c.finRecambios ? `<span class="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">✓ Recambios OK</span>` : `<span class="px-2 py-0.5 text-[9px] font-bold bg-teal-100 text-teal-800 rounded border border-teal-200 animate-pulse">📦 En Recambios</span>`) : '';
    
    let badgeCita = c.fechaCita ? `<div class="text-[10px] font-black text-blue-900 bg-blue-50 border border-blue-200 p-2 rounded mt-3 flex items-center gap-1"><i class="ph-bold ph-calendar"></i> Cita Planificada: ${c.fechaCita}</div>` : '';

    return `
    <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm fila-coche flex flex-col justify-between relative hover:shadow-md transition-shadow min-h-[210px]">
        <div>
            <div class="flex justify-between items-start mb-2 gap-2">
                <div class="min-w-0 pr-1">
                    <h3 class="font-black text-lg text-[#001e50] uppercase truncate" title="${c.C}">${c.C || 'Vehículo'}</h3>
                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span class="font-bold text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-900 tracking-widest border border-gray-200">${c.B || 'S/M'}</span>
                        <span class="text-[9px] font-mono text-gray-400 truncate" title="${c.A}">VIN: ${c.A || 'Sin Bastidor'}</span>
                    </div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                    <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-8 h-8 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-base"></i>${burbuja}</button>
                    <button onclick="window.preguntarSiEntregado('${c.fila}')" class="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white shadow-sm transition-colors" title="¿Coche Entregado?"><i class="ph-bold ph-question text-base"></i></button>
                    <button onclick="window.editarVehiculoBasico('${c.fila}', '${escA}', '${escB}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-colors" title="Editar info"><i class="ph-bold ph-pencil-simple text-base"></i></button> 
                    <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm transition-colors" title="Eliminar"><i class="ph-bold ph-trash text-base"></i></button>            
                </div>
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
                ${badgeTaller} ${badgeRecambios}
            </div>
            
            <div class="mt-3 text-[10px] font-bold text-gray-600 leading-tight border-t border-gray-100 pt-2.5 space-y-1">
                <p class="truncate uppercase flex items-center gap-1.5" title="${c.cliente || 'SIN ASIGNAR'}"><i class="ph-fill ph-user text-xs text-gray-400"></i> <b>Cliente:</b> ${c.cliente || 'S/D'}</p>
                ${c.telefono ? `<p class="truncate flex items-center gap-1.5"><i class="ph-fill ph-phone text-xs text-gray-400"></i> <b>Tlf:</b> ${c.telefono}</p>` : ''}
                ${c.email ? `<p class="truncate flex items-center gap-1.5" title="${c.email}"><i class="ph-fill ph-envelope text-xs text-gray-400"></i> <b>Email:</b> ${c.email}</p>` : ''}
                ${c.renting ? `<p class="truncate uppercase flex items-center gap-1.5 text-gray-500 font-black"><i class="ph-fill ph-buildings text-xs text-gray-400"></i> ${c.renting}</p>` : ''}
            </div>
        </div>
        <div>
            ${badgeCita}
        </div>
    </div>`;
};
window.cambiarModoVisualizacion = function(modo) {
   modoVistaActual = modo;
   const btnT = document.getElementById('btnVistaTarjetas');
   const btnE = document.getElementById('btnVistaTabla');
   if (modo === 'tarjetas') {
      btnT.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      btnE.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      document.getElementById('contenedorTarjetas').style.display = 'grid'; document.getElementById('contenedorTabla').style.display = 'none';
   } else {
      btnE.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      btnT.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      document.getElementById('contenedorTarjetas').style.display = 'none'; document.getElementById('contenedorTabla').style.display = 'block';
   }
   if(typeof window.renderizarVistas === 'function') window.renderizarVistas();
};

window.aplicarFiltroVisual = function(filtro, btnElement) {
   filtroActual = filtro;
   document.querySelectorAll('.filtro-btn').forEach(b => { b.className = "filtro-btn bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-5 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"; });
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
    
    window.onSnapshot(chatRef, (snapshot) => {
        let mensajes = [];
        let noLeidos = 0;
        snapshot.forEach((doc) => {
            let msg = doc.data(); msg.id = doc.id;
            if (msg.remitente === window.usuarioActivo || msg.destinatario === window.usuarioActivo || msg.destinatario === window.rolActivo) {
                mensajes.push(msg);
                if (msg.remitente !== window.usuarioActivo && msg.timestamp > window.ultimaFechaLecturaGlobal) noLeidos++;
            }
        });
        mensajes.sort((a, b) => a.timestamp - b.timestamp);
        window.mensajesGlobalesCache = mensajes; 
        window.actualizarVistaChat();
        
        const globo = document.getElementById('contadorChatGlobal');
        const chatWidget = document.getElementById('chatGlobalWidget');
        if (globo) {
            if (chatWidget && chatWidget.style.display === 'flex') window.marcarChatGlobalComoLeido();
            else {
                if (noLeidos > 0) { globo.innerText = noLeidos > 99 ? '99+' : noLeidos; globo.style.display = 'flex'; } 
                else { globo.style.display = 'none'; }
            }
        }
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

window.renderizarListaChats = function() {
    const contenedor = document.getElementById('view-lista');
    const chats = {};
    window.mensajesGlobalesCache.forEach(msg => {
        let otro = (msg.remitente === window.usuarioActivo) ? msg.destinatario : msg.remitente;
        if (!chats[otro] || msg.timestamp > chats[otro].timestamp) chats[otro] = msg;
    });
    contenedor.innerHTML = Object.values(chats).sort((a,b) => b.timestamp - a.timestamp).map(msg => {
        let otro = (msg.remitente === window.usuarioActivo) ? msg.destinatario : msg.remitente;
        return `<div class="p-3 border-b border-gray-200 hover:bg-white cursor-pointer flex items-center gap-3" onclick="window.abrirChatEspecifico('${otro}')">
                    <div class="w-10 h-10 rounded-full bg-[#00b0f0] text-white flex items-center justify-center font-black text-sm">${otro.substring(0,2)}</div>
                    <div class="flex-1 overflow-hidden"><p class="text-xs font-black text-gray-800">${otro}</p><p class="text-[10px] text-gray-500 truncate">${msg.texto}</p></div>
                </div>`;
    }).join('');
};

window.renderizarContactos = function() {
    const contenedor = document.getElementById('view-contactos');
    
    // 1. Estructuramos a los usuarios por sus departamentos correspondientes
    const departamentos = {
        "ENTREGAS": ["MANUEL.ARJONA", "ANTONIO.BERMEJO"],
        "TALLER": ["MANUEL.LOPEZ", "ALVARO.BELTRAN"],
        "RECAMBIOS": ["SERGIO.CABALLERO", "FERNANDO.CRESPO", "JAIME.JORGE", "FERNANDO.REMON", "ABRAHAM.CANIZARES"],
        "BACKOFFICE": ["FATIMA.GARCIA", "GEMA.GOMEZ", "ALBERTO.GUTIERREZ", "RABAB.JAADAR", "RUBEN.GARCIA"]
    };

    let htmlGenerado = "";

    // 2. Recorremos cada departamento usando un bucle
    for (const [nombreDpto, usuarios] of Object.entries(departamentos)) {
        
        // A) Dibujamos la cabecera del departamento
        htmlGenerado += `<div class="bg-gray-200 text-[#001e50] text-[10px] font-black p-1.5 pl-3 uppercase tracking-widest mt-2 first:mt-0 shadow-inner">${nombreDpto}</div>`;
        
        // B) Dibujamos el botón especial para enviar mensajes a todo el grupo.
        // Convertimos el nombre a minúsculas ('taller', 'entregas') para que coincida con los roles de tu base de datos.
        let rolDestino = nombreDpto.toLowerCase(); 
        htmlGenerado += `
        <div class="p-3 border-b border-gray-300 bg-blue-50 hover:bg-blue-100 cursor-pointer text-xs font-black flex items-center gap-3 text-[#001e50] transition-colors" onclick="window.abrirChatEspecifico('${rolDestino}')">
            <div class="w-8 h-8 rounded-full bg-[#001e50] flex items-center justify-center text-white text-sm shadow-sm">
                <i class="ph-bold ph-users"></i>
            </div>
            GRUPO ${nombreDpto}
        </div>`;

        // C) Dibujamos a los usuarios individuales pertenecientes a este departamento
        usuarios.forEach(contacto => {
            htmlGenerado += `
            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer text-xs font-bold flex items-center gap-3 text-gray-700 transition-colors" onclick="window.abrirChatEspecifico('${contacto}')">
                <div class="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[#001e50] text-[9px] font-black shadow-sm">${contacto.substring(0,2)}</div>
                ${contacto}
            </div>`;
        });
    }

    // 3. Inyectamos todo el HTML construido de golpe en la pantalla
    contenedor.innerHTML = htmlGenerado;
};
window.abrirChatEspecifico = function(usuario) {
    window.chatDestinoActual = usuario; window.mostrarChatTab('chat'); window.actualizarVistaChat();
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

window.renderizarMensajesGlobales = function(listaMensajes) {
    const contenedor = document.getElementById('chatGlobalMensajes');
    if (!contenedor) return;
    if (listaMensajes.length === 0) {
        contenedor.innerHTML = '<div class="text-[10px] text-center font-bold text-gray-400 uppercase tracking-widest bg-white/60 p-1 rounded-full mx-auto w-3/4 mt-4">No hay mensajes</div>';
        return;
    }
    contenedor.innerHTML = listaMensajes.map(msg => {
        let horaFormateada = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let soyYo = msg.remitente === window.usuarioActivo;
        let iniciales = msg.remitente.substring(0, 2).toUpperCase();
        if (soyYo) {
            return `<div class="flex flex-col items-end w-full animate-fade-in mb-2"><div class="bg-[#001e50] text-white px-4 py-2 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] text-xs">${msg.texto}</div><span class="text-[9px] text-gray-400 font-bold mt-1 pr-1">${horaFormateada}</span></div>`;
        } else {
            return `<div class="flex items-end gap-2 w-full animate-fade-in mb-3"><div class="w-8 h-8 rounded-full bg-[#00b0f0] text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">${iniciales}</div><div class="flex flex-col items-start w-full"><span class="text-[10px] text-gray-600 font-black mb-0.5 ml-1 uppercase">${msg.remitente}</span><div class="bg-white text-[#001e50] border border-gray-200 px-4 py-2 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-xs font-medium">${msg.texto}</div><span class="text-[9px] text-gray-400 font-bold mt-1 ml-1">${horaFormateada}</span></div></div>`;
        }
    }).join('');
    contenedor.scrollTop = contenedor.scrollHeight;
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
// 🛡️ EVENTOS GLOBALES FINALES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { if (typeof window.cargarChatGlobal === 'function' && window.usuarioActivo) window.cargarChatGlobal(); }, 2000);
    const widget = document.getElementById('chatGlobalWidget'); const boton = document.getElementById('btnAbrirChatGlobal');
    if (widget) document.body.appendChild(widget); if (boton) document.body.appendChild(boton);
    const inputChat = document.getElementById('chatGlobalInput');
    if (inputChat) inputChat.addEventListener('keypress', function (e) { if (e.key === 'Enter') window.enviarMensajeGlobalUI(); });
});
// ==========================================
// 🚨 MOTOR DE ALERTAS: BANDA ROJA Y CITAS PASADAS (M2 Code Systems)
// ==========================================
window.iniciarMotorAlertas = function() {
    // Protección de rol: Solo logística lo ve
    if (window.rolActivo !== 'entregas' && window.rolActivo !== 'backoffice') return;

    // Si los coches aún no cargaron, reintentamos en un segundo
    if (!todosLosCoches || todosLosCoches.length === 0) {
        setTimeout(window.iniciarMotorAlertas, 1000);
        return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pendientes = todosLosCoches.filter(c => {
        if (!c.fechaCita || c.entregado === true || c.entregado === "true") return false;
        const [y, m, d] = c.fechaCita.split('-');
        return new Date(y, m - 1, d) < hoy;
    });

    // 1. Creación e inyección de la Banda Roja Superior
    let bandaRoja = document.getElementById('bandaAlertasCitas');
    if (!bandaRoja) {
        bandaRoja = document.createElement('div');
        bandaRoja.id = 'bandaAlertasCitas';
        bandaRoja.className = 'w-full bg-red-600 text-white p-2 text-xs font-bold flex flex-wrap items-center justify-center gap-3 z-50 shadow-md';
        
        // Colocamos la banda al principio de la aplicación principal
        let appMain = document.getElementById('mainApp') || document.body;
        appMain.insertBefore(bandaRoja, appMain.firstChild);
    }

    if (pendientes.length > 0) {
        // Generamos los botones interactivos para cada matrícula
        let htmlBanda = `<span class="uppercase animate-pulse"><i class="ph-bold ph-warning-circle text-sm align-middle"></i> ¡ATENCIÓN! Citas vencidas:</span>`;
        
        pendientes.forEach(c => {
            htmlBanda += `<button onclick="window.gestionarCitaDesdeBanda('${c.fila}')" class="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-red-100 transition-colors shadow-sm cursor-pointer font-black tracking-widest">${c.B || 'S/M'}</button>`;
        });
        
        bandaRoja.innerHTML = htmlBanda;
        bandaRoja.style.display = 'flex';

        // 2. Ventana de Aviso Central (con control para mostrarse solo 1 vez por sesión)
        if (!window.avisoCitasMostrado) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Citas Atrasadas',
                text: `Hay ${pendientes.length} coches con cita vencida. Utiliza la banda roja superior para gestionarlos.`,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#d33'
            });
            window.avisoCitasMostrado = true;
        }
    } else {
        // Si no hay pendientes, ocultamos la banda
        bandaRoja.style.display = 'none';
    }
};

// 3. Función puente para los clics en la banda roja
window.gestionarCitaDesdeBanda = function(fila) {
    // Si estamos en otra pestaña, cambiamos a logística para ver el contexto
    if (activeTab !== 'logistica' && activeTab !== 'todos') {
        if (typeof window.cambiarPestana === 'function') {
            window.cambiarPestana('logistica');
        }
    }
    // Disparamos la interrogación para el coche exacto en el que hemos hecho clic
    window.preguntarSiEntregado(fila);
};
// CSS INYECTADO PARA EL ESCUDO
const escudoCSS = document.createElement('style');
escudoCSS.innerHTML = `body:not(.viendo-historial) #contenedorHistorialDpto, body:not(.viendo-historial) #tablaResultadosDpto, body:not(.viendo-historial) #contenedorHistorial { display: none !important; }`;
document.head.appendChild(escudoCSS);