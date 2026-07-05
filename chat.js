/**
 * ============================================================================
 * PROYECTO: GesCar OS
 * COMPONENTES: GesCar OS Core, App GesCar OS Clientes, GesCar OS Renting
 * AUTORES: Manuel Arjona Carrera y Miriam Olmo Fernández (M2 Code Systems)
 * AÑO: 2026
 * ============================================================================
 * 
 * Todos los derechos reservados.
 * Este código fuente es propiedad intelectual de M2 Code Systems.
 * Queda estrictamente prohibida su copia, distribución, modificación 
 * o uso no autorizado, total o parcial, sin el consentimiento expreso 
 * de los autores originales.
 * 
 * ============================================================================
 */
// ==========================================
// 💬 SISTEMA DE CHAT Y ALERTAS EN TIEMPO REAL
// ==========================================

window.obtenerBurbujaChat = function(chatObj) {
    if (!chatObj || !chatObj.history) return '';
    const rol = String(window.userRole || window.rolActivo || '').toUpperCase();
    let hs = chatObj.history;
    let lo = chatObj.lastOpened ? (chatObj.lastOpened[rol] || 0) : 0;
    let nl = hs.filter(m => m.fecha > lo && String(m.rol || '').toUpperCase() !== rol).length;
    if (nl > 0) return `<span class="absolute -top-2 -right-2 bg-red-500 border-2 border-white text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-pulse">${nl}</span>`;
    return '';
};

window.abrirChat = async function(id, mod, mat, jsonStr) {
    const filaInput = document.getElementById('chatFilaActiva');
    const titulo = document.getElementById('chatTituloCoche');
    const subtitulo = document.getElementById('chatSubtitulo');
    const modal = document.getElementById('chatModal');
    if (!filaInput || !titulo || !subtitulo || !modal) return;

    filaInput.value = id;
    titulo.innerText = decodeURIComponent(mod || 'Vehículo');
    subtitulo.innerText = 'Matrícula: ' + decodeURIComponent(mat || '');

    let chatObj = { history: [], lastOpened: {} };
    try { if (jsonStr) chatObj = JSON.parse(decodeURIComponent(jsonStr)); } catch(e) {}

    window.dibujarMsj(chatObj.history || []);
    modal.classList.remove('hidden');

    let timestamp = new Date().getTime();
    let rol = String(window.userRole || window.rolActivo || '').toUpperCase();
    let updateData = { chatInfo: { lastOpened: {} } };
    updateData.chatInfo.lastOpened[rol] = timestamp;

    try {
        if (window.db && window.doc && window.setDoc) {
            await window.setDoc(window.doc(window.db, 'vehiculos', id), updateData, { merge: true });
        }
    } catch(e) { console.log('Aviso: No se pudo resetear la notificación', e); }
};

window.cerrarChat = function() { 
    document.getElementById('chatModal').classList.add('hidden'); 
};

window.dibujarMsj = function(hist) {
    const cont = document.getElementById('chatMessages');
    if (!cont) return;
    if (!hist || hist.length === 0) {
        cont.innerHTML = `<p class="text-center text-xs font-bold mt-4 text-gray-500">No hay mensajes. ¡Escribe el primero!</p>`;
        return;
    }

    const rol = String(window.userRole || window.rolActivo || '').toUpperCase();
    cont.innerHTML = hist.map(m => {
        let isMe = String(m.rol || '').toUpperCase() === rol;
        let bubbleClass = isMe ? 'wa-me' : 'wa-other';
        let etiquetaRemitente = isMe ? '' : `<span style="display:block; font-size:9px; font-weight:900; color:#128c7e; margin-bottom:3px; text-transform:uppercase;">${m.rol || 'Sistema'}</span>`;
        return `<div class="wa-bubble ${bubbleClass}"><div>${etiquetaRemitente}${m.texto || ''}</div></div>`;
    }).join('');

    setTimeout(() => { cont.scrollTop = cont.scrollHeight; }, 50);
};

window.enviarMensajeChat = async function() {
    const filaInput = document.getElementById('chatFilaActiva');
    const input = document.getElementById('chatInput');
    if (!filaInput || !input) return;

    const id = filaInput.value;
    const txt = input.value.trim();
    if (!id || !txt) return;

    input.value = '';

    const rol = String(window.userRole || window.rolActivo || '').toUpperCase();
    const nM = { rol, fecha: new Date().getTime(), texto: txt };
    let c = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(x => x.fila === id) : null;

    if (c) {
        if (!c.chatData) c.chatData = {};
        if (!c.chatData.history) c.chatData.history = [];
        c.chatData.history.push(nM);
        window.dibujarMsj(c.chatData.history);
    }

    try {
        if (window.db && window.doc && window.setDoc && window.arrayUnion) {
            await window.setDoc(window.doc(window.db, 'vehiculos', id), {
                chatInfo: { history: window.arrayUnion(nM) }
            }, { merge: true });
        }
    } catch (e) {
        console.error('Error al enviar el mensaje:', e);
    }
};

window.iniciarMotorAlertas = function() {
    if (window.unsubscribeAlertas) { window.unsubscribeAlertas(); }
    window.unsubscribeAlertas = window.onSnapshot(window.collection(window.db, "vehiculos"), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
                const data = change.doc.data();
                if (data.clienteEnPuerta === true && data.alertaAtendida === false) {
                    window.lanzarAlertaMovil(data, change.doc.id);
                }
            }
        });
    }, (error) => {
        window.mostrarErrorFirebase(error, 'Error en el motor de alertas de Firebase');
    });
};

window.lanzarAlertaMovil = function(data, docId) {
    try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(e=>{}); } catch(e) {}

    const tarjetas = document.querySelectorAll('.fila-coche');
    tarjetas.forEach(tarjeta => {
        if (tarjeta.innerText.includes(data.matricula)) tarjeta.classList.add('alerta-llegada');
    });

    Swal.fire({
        title: '🔔 ¡CLIENTE LLEGÓ!',
        html: `<div class="text-left"><p class="font-bold text-lg">${window.escapeJS(data.cliente) || 'Conductor'}</p><p class="text-sm">${window.escapeJS(data.modelo)} - ${window.escapeJS(data.matricula)}</p></div>`,
        icon: 'warning', confirmButtonColor: '#001e50', confirmButtonText: 'IR A RECEPCIÓN'
    }).then(() => {
        tarjetas.forEach(t => t.classList.remove('alerta-llegada'));
        window.updateDoc(window.doc(window.db, "vehiculos", docId), { alertaAtendida: true });
    });
};