// ==========================================
// ⚙️ NÚCLEO DE LA APLICACIÓN (APP.JS)
// ==========================================

// Variables globales de sesión y estado
window.usuarioActivo = "";
window.rolActivo = "";
window.userRole = ""; // Puente de compatibilidad

let activeTab = 'logistica'; 
let modoVistaActual = 'tarjetas'; 
let primeraCargaDb = true;
let unsubscribeFirebase = null; 
let todosLosCoches = []; 
let filtroActual = 'todos';

// 🔥 HERRAMIENTA CLAVE: Escapar variables
window.escapeJS = function(str) {
    return String(str || '').replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
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
    else if (depto === 'taller') inputUser.placeholder = "Operario Taller (Ej: CARLOS, PEDRO)";
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

    // 🔥 DICCIONARIO DE SEGURIDAD VIP
    const directorioPersonal = {
        "MANUEL.ARJONA": "entregas",
        "ANTONIO.BERMEJO": "entregas",
        "CARLOS": "taller",
        "PEDRO": "taller",
        "SERGIO.CABALLERO": "recambios",
        "FERNANDO.CRESPO": "recambios",
        "JAIME.JORGE": "recambios",
        "FERNANDO.REMON": "recambios",
        "ABRAHAM.CANIZARES": "recambios",
        "FATIMA.GARCIA": "backoffice",
        "GEMA.GOMEZ": "backoffice",
        "ALBERTO.GUTIERREZ": "backoffice",
        "RABAB.JAADAR": "backoffice",
        "RUBEN.GARCIA": "backoffice"
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
        Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'Usuario o contraseña incorrectos.' });
        btn.innerText = textoOriginal;
    }
};

window.aplicarPermisosPorRol = function() {
    if (window.rolActivo === "backoffice") {
        const botonesOcultar = document.querySelectorAll('#botonesLogistica, .btn-guardar, button[onclick*="guardar"], button[onclick*="eliminar"], button[onclick*="anadirVehiculoManual"], button[onclick*="abrirGestorVacaciones"], button[onclick*="generarListadoDiario"]');
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
                
                if (!clickAccion.includes('abrirchat') && 
                    !clickAccion.includes('nota') && 
                    !clickAccion.includes('crearcitamanual')) {
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
    window.rolActivo = rol;
    window.userRole = rol; 
    window.usuarioActivo = usuario || rol;

    document.getElementById('roleBadge').innerText = `${window.usuarioActivo} (${window.rolActivo})`;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebarApp').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'flex';
    
    window.cargar(); 

    if (rol === 'entregas' || rol === 'backoffice') {
        if (typeof window.iniciarMotorAlertas === 'function') { window.iniciarMotorAlertas(); }
        
        if (rol === 'backoffice' && typeof window.escucharNotificacionesBackOffice === 'function') {
            window.escucharNotificacionesBackOffice();
        }

        document.getElementById('tabsDpto').classList.replace('flex', 'hidden');
        document.getElementById('tabsEntregas').classList.replace('hidden', 'flex');
        
        if (rol === 'entregas') {
            document.getElementById('botonesLogistica').classList.replace('hidden', 'flex');
        }
        window.cambiarPestana('todos');
    } else { 
        document.getElementById('tabsEntregas').classList.replace('hidden', 'flex');
        document.getElementById('tabsDpto').classList.replace('hidden', 'flex');
        
        let icono = rol === 'taller' ? 'ph-wrench' : 'ph-package';
        document.getElementById('iconoDptoCurso').className = `ph-bold ${icono} text-lg`;
        
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
    // ❌ BLOQUEO ELIMINADO PARA EVITAR EL "CHOQUE DE TRENES"
    
    const rol = localStorage.getItem('vw_departamento');
    const usr = localStorage.getItem('vw_usuario');
    if (rol) { 
        window.iniciarAppDirectamente(rol, usr); 
    }

    document.getElementById("btnAbout").onclick = function() { document.getElementById("aboutModal").style.display = "block"; };
    document.getElementById("btnClose").onclick = function() { document.getElementById("aboutModal").style.display = "none"; };
    window.onclick = function(event) { if (event.target == document.getElementById("aboutModal")) { document.getElementById("aboutModal").style.display = "none"; } };

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

window.cambiarPestana = function(pestana) {
  activeTab = pestana;
  
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
    if (pestana === 'logistica') { botones[0].classList.remove('text-gray-400'); botones[0].classList.add('text-amber-300', 'bg-white/10'); }
    else if (pestana === 'todos') { botones[1].classList.remove('text-gray-400'); botones[1].classList.add('text-white', 'bg-white/10'); }
    else if (pestana === 'agenda') { botones[2].classList.remove('text-gray-400'); botones[2].classList.add('text-white', 'bg-white/10'); }
    else if (pestana === 'global-taller') {
        botones[3].classList.remove('text-gray-400'); botones[3].classList.add('text-white', 'bg-white/10');
        if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white');
    }
    else if (pestana === 'global-recambios') {
        botones[4].classList.remove('text-gray-400'); botones[4].classList.add('text-white', 'bg-white/10');
        if(botonesDpto && botonesDpto[0]) botonesDpto[0].classList.add('bg-white/10', 'text-white');
    }
    else if (pestana === 'entregados') { botones[5].classList.remove('text-gray-400'); botones[5].classList.add('text-white', 'bg-white/10'); }
    else if (pestana === 'dashboard') { botones[6].classList.remove('text-gray-400'); botones[6].classList.add('text-emerald-400', 'bg-white/10'); }
    else if (pestana === 'encuestas') { botones[7].classList.remove('text-gray-400'); botones[7].classList.add('text-white', 'bg-white/10'); }
  } 
  
  if (pestana === 'historial-dpto') {
      if(botonesDpto && botonesDpto[1]) botonesDpto[1].classList.add('bg-white/10', 'text-white'); 
  }

  document.getElementById('contenedorLogistica').style.display = 'none';
  document.getElementById('contenedorTarjetas').style.display = 'none';
  document.getElementById('contenedorTabla').style.display = 'none';
  document.getElementById('contenedorAgenda').style.display = 'none';
  document.getElementById('contenedorEntregados').style.display = 'none';
  document.getElementById('contenedorDashboard').style.display = 'none';
  document.getElementById('contenedorEncuestas').style.display = 'none';
  if (document.getElementById('contenedorHistorialDpto')) document.getElementById('contenedorHistorialDpto').style.display = 'none';
  
  document.getElementById('filtrosVisuales').style.display = 'none';
  document.getElementById('controlesVistaExcel').style.display = 'none';
  document.getElementById('botonesLogistica').style.display = 'none'; 
  document.getElementById('botonesAgenda').style.display = 'none';    
  document.getElementById('buscadorInput').style.display = 'block';

  if (pestana === 'logistica') {
    document.getElementById('contenedorLogistica').style.display = 'grid';
    document.getElementById('botonesLogistica').style.display = 'flex'; 
  } else if (pestana === 'todos') {
    document.getElementById('controlesVistaExcel').style.display = 'flex';
    document.getElementById('filtrosVisuales').style.display = 'flex';
    if(typeof window.cambiarModoVisualizacion === 'function') window.cambiarModoVisualizacion(modoVistaActual);
  } else if (pestana === 'global-taller' || pestana === 'global-recambios') {
    document.getElementById('contenedorTarjetas').style.display = 'grid';
  } else if (pestana === 'agenda') {
    document.getElementById('contenedorAgenda').style.display = 'block';
    document.getElementById('buscadorInput').style.display = 'none';
    document.getElementById('botonesAgenda').style.display = 'flex'; 
  } else if (pestana === 'entregados') {
    document.getElementById('contenedorEntregados').style.display = 'block';
    document.getElementById('buscadorInput').style.display = 'none';
    if(typeof window.renderEntregados === 'function') window.renderEntregados();
  } else if (pestana === 'dashboard') {
    document.getElementById('contenedorDashboard').style.display = 'block';
    document.getElementById('buscadorInput').style.display = 'none';
    if(typeof window.renderizarDashboard === 'function') window.renderizarDashboard();
  } else if (pestana === 'encuestas') { 
    document.getElementById('contenedorEncuestas').style.display = 'block';
    document.getElementById('buscadorInput').style.display = 'none';
    if(typeof window.renderEncuestas === 'function') window.renderEncuestas();
  } else if (pestana === 'historial-dpto') {
    document.getElementById('contenedorHistorialDpto').style.display = 'flex';
    document.getElementById('buscadorInput').style.display = 'none';
    if(typeof window.cargarUltimosHistorialDpto === 'function') window.cargarUltimosHistorialDpto();
  }
  
  if(pestana !== 'dashboard' && pestana !== 'encuestas' && pestana !== 'historial-dpto') window.cargar();
  
  window.aplicarPermisosPorRol();
};

window.cargar = function() {
  if(unsubscribeFirebase) unsubscribeFirebase();
  unsubscribeFirebase = window.onSnapshot(window.collection(window.db, "vehiculos"), (snapshot) => {
    todosLosCoches = [];
    snapshot.forEach(doc => { 
        let c = doc.data(); 
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
    });
    
    todosLosCoches.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));

    if (window.rolActivo === 'taller' || window.rolActivo === 'recambios') {
       if(typeof window.renderizarDepartamentos === 'function') window.renderizarDepartamentos(window.rolActivo);
    } else if (window.rolActivo === 'entregas' || window.rolActivo === 'backoffice') {
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
    }

    window.aplicarPermisosPorRol();

  }, (error) => {
      window.mostrarErrorFirebase(error, 'Error al cargar vehículos');
  });
};

window.actualizarContadores = function() {
   let pendientes = 0, concita = 0, taller = 0, recambios = 0, total = 0;
   todosLosCoches.forEach(c => {
      let enInventario = c.pasoAInventario !== false; 
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
   let logistica = todosLosCoches.filter(c => c.pasoAInventario === false && c.entregado !== true && c.entregado !== "true");
   let div = document.getElementById('contenedorLogistica');
   
   if (logistica.length === 0) {
       div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay vehículos en fase de logística previa.</p></div>`;
   } else {
       if(typeof window.renderTarjetaCompacta === 'function') {
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
   }
};

window.cambiarModoVisualizacion = function(modo) {
   modoVistaActual = modo;
   const btnT = document.getElementById('btnVistaTarjetas');
   const btnE = document.getElementById('btnVistaTabla');
   if (modo === 'tarjetas') {
      btnT.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      btnE.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      document.getElementById('contenedorTarjetas').style.display = 'grid';
      document.getElementById('contenedorTabla').style.display = 'none';
   } else {
      btnE.className = "bg-white text-[#001e50] border border-[#001e50] shadow-sm px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      btnT.className = "text-gray-500 hover:text-gray-800 border border-transparent px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all";
      document.getElementById('contenedorTarjetas').style.display = 'none';
      document.getElementById('contenedorTabla').style.display = 'block';
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
