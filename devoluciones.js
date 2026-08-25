/**
 * ============================================================================
 * PROYECTO: GesCar OS
 * MODULO: Devoluciones Renting
 * ============================================================================
 */

window.devolucionesRentingData = [];
window.unsubscribeDevolucionesRenting = null;
window.devolucionRentingPendienteAgenda = null;
window.devolucionesRentingModoLocal = false;
window.devolucionesRentingAvisoPermisosMostrado = false;
window.devolucionesRentingSearchDebounceTimer = null;
window.devolucionesRentingUI = window.devolucionesRentingUI || {
    filtroEstado: 'TODAS',
    busqueda: '',
    vista: 'TABLA'
};

window.upsertDevolucionRentingLocal = function(item) {
    if (!item || !item.id) return;
    const lista = Array.isArray(window.devolucionesRentingData) ? [...window.devolucionesRentingData] : [];
    const idx = lista.findIndex(x => x && x.id === item.id);
    if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...item };
    } else {
        lista.unshift(item);
    }
    window.devolucionesRentingData = lista;
};

window.eliminarDevolucionRentingLocal = function(id) {
    const lista = Array.isArray(window.devolucionesRentingData) ? window.devolucionesRentingData : [];
    window.devolucionesRentingData = lista.filter(x => x && x.id !== id);
};

window.formatearFechaDevolucionRenting = function(valor) {
    if (!valor) return '-';
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const p = valor.split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
    }
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleDateString('es-ES');
};

window.normalizarFechaIsoDevolucionRenting = function(valor) {
    if (!valor) return '';
    const texto = String(valor).trim();
    if (!texto) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;

    const partesBarra = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (partesBarra) {
        const dd = partesBarra[1].padStart(2, '0');
        const mm = partesBarra[2].padStart(2, '0');
        const yyyy = partesBarra[3];
        return `${yyyy}-${mm}-${dd}`;
    }

    const fecha = new Date(texto.replace(' ', 'T'));
    if (isNaN(fecha.getTime())) return '';
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(fecha.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

window.obtenerEstadoDevolucionRenting = function(item) {
    if (!item) return 'ABIERTA';
    if (item.fechaReentregaRenting && item.urlCartaPorte) return 'CERRADA';
    return 'ABIERTA';
};

window.normalizarTextoDevolucionRenting = function(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
};

window.esFechaHoyDevolucionRenting = function(valor) {
    if (!valor) return false;
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    const hoyIso = `${y}-${m}-${d}`;
    return String(valor) === hoyIso;
};

window.filtrarDevolucionesRenting = function(lista) {
    const ui = window.devolucionesRentingUI || {};
    const filtroEstado = String(ui.filtroEstado || 'TODAS');
    const busqueda = window.normalizarTextoDevolucionRenting(ui.busqueda || '');

    return (Array.isArray(lista) ? lista : []).filter((item) => {
        const estado = window.obtenerEstadoDevolucionRenting(item);

        if (filtroEstado === 'ABIERTAS' && estado !== 'ABIERTA') return false;
        if (filtroEstado === 'CERRADAS' && estado !== 'CERRADA') return false;
        if (filtroEstado === 'HOY') {
            const esHoy = window.esFechaHoyDevolucionRenting(item.fechaRecogida) || window.esFechaHoyDevolucionRenting(item.fechaReentregaRenting);
            if (!esHoy) return false;
        }

        if (busqueda) {
            const texto = window.normalizarTextoDevolucionRenting([
                item.matricula,
                item.renting,
                item.modelo,
                item.recogidoPor,
                item.ubicacion
            ].join(' '));
            if (!texto.includes(busqueda)) return false;
        }

        return true;
    });
};

window.setFiltroDevolucionesRenting = function(filtro) {
    window.devolucionesRentingUI = {
        ...(window.devolucionesRentingUI || {}),
        filtroEstado: filtro || 'TODAS'
    };
    window.renderDevolucionesRenting();
};

window.setVistaDevolucionesRenting = function(vista) {
    window.devolucionesRentingUI = {
        ...(window.devolucionesRentingUI || {}),
        vista: 'TABLA'
    };
    window.renderDevolucionesRenting();
};

window.calcularTiempoEnConcesionarioDevolucion = function(item) {
    const inicioIso = window.normalizarFechaIsoDevolucionRenting(item?.fechaRecogida);
    if (!inicioIso) return '-';

    const finIso = window.normalizarFechaIsoDevolucionRenting(item?.fechaReentregaRenting);
    const fechaInicio = new Date(`${inicioIso}T00:00:00`);
    const fechaFin = finIso ? new Date(`${finIso}T00:00:00`) : new Date();

    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) return '-';

    const diffMs = Math.max(0, fechaFin.getTime() - fechaInicio.getTime());
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return dias === 1 ? '1 dia' : `${dias} dias`;
};

window.obtenerOrdenAntiguedadDevolucion = function(item) {
    const inicioIso = window.normalizarFechaIsoDevolucionRenting(item?.fechaRecogida);
    if (inicioIso) {
        const ts = new Date(`${inicioIso}T00:00:00`).getTime();
        if (!isNaN(ts)) return ts;
    }
    return Number(item?.creadoTs || 0) || 0;
};

window.setBusquedaDevolucionesRenting = function(valor) {
    window.devolucionesRentingUI = {
        ...(window.devolucionesRentingUI || {}),
        busqueda: String(valor || '')
    };

    if (window.devolucionesRentingSearchDebounceTimer) {
        clearTimeout(window.devolucionesRentingSearchDebounceTimer);
    }

    // 🔥 OPTIMIZACIÓN: Si el valor está vacío, reaccionamos casi al instante (10ms) en lugar de esperar 140ms
    const delay = valor.trim() === '' ? 10 : 140;

    window.devolucionesRentingSearchDebounceTimer = setTimeout(() => {
        if (typeof window.aplicarBusquedaDevolucionesRentingDOM === 'function') {
            window.aplicarBusquedaDevolucionesRentingDOM();
        }
    }, delay);
};

window.aplicarBusquedaDevolucionesRentingDOM = function() {
    const contenedor = document.getElementById('contenedorDevolucionesRenting');
    if (!contenedor) return;

    const ui = window.devolucionesRentingUI || {};
    const busquedaRaw = String(ui.busqueda || '').trim();
    const criterio = window.normalizarTextoDevolucionRenting(busquedaRaw);
    
    const items = Array.from(contenedor.querySelectorAll('[data-dev-item="1"]'));
    let visibles = 0;

    // 🔥 VÍA RÁPIDA: Si la caja está vacía, mostramos todo de golpe sin calcular nada
    if (criterio === '') {
        items.forEach(el => {
            el.style.display = ''; // Limpia el bloqueo
            visibles++;
        });
    } else {
        // Si hay texto, buscamos normalmente
        items.forEach(el => {
            const texto = el.getAttribute('data-dev-search') || ''; 
            const mostrar = texto.includes(criterio);
            el.style.display = mostrar ? '' : 'none';
            if (mostrar) visibles++;
        });
    }

    const emptyBox = document.getElementById('dev-no-resultados-busqueda');
    const resultadosBox = document.getElementById('dev-resultados-wrapper');
    
    if (emptyBox && resultadosBox) {
        if (visibles === 0) {
            resultadosBox.style.display = 'none';
            emptyBox.style.display = 'block';
        } else {
            resultadosBox.style.display = '';
            emptyBox.style.display = 'none';
        }
    }
};

window.suscribirDevolucionesRenting = function() {
    if (!window.db || !window.collection || !window.onSnapshot) return;

    if (window.unsubscribeDevolucionesRenting) {
        window.unsubscribeDevolucionesRenting();
    }

    window.unsubscribeDevolucionesRenting = window.onSnapshot(
        window.collection(window.db, 'devoluciones_renting'),
        (snapshot) => {
            window.devolucionesRentingModoLocal = false;
            const lista = [];
            snapshot.forEach((docSnap) => {
                const d = docSnap.data() || {};
                d.id = docSnap.id;
                lista.push(d);
            });

            lista.sort((a, b) => window.obtenerOrdenAntiguedadDevolucion(a) - window.obtenerOrdenAntiguedadDevolucion(b));
            window.devolucionesRentingData = lista;

            if (window.tabActiva === 'devoluciones-renting' && typeof window.renderDevolucionesRenting === 'function') {
                window.renderDevolucionesRenting();
            }
        },
        (error) => {
            const esPermiso = String(error?.code || '').toLowerCase() === 'permission-denied';
            if (esPermiso) {
                window.devolucionesRentingModoLocal = true;
                if (!window.devolucionesRentingAvisoPermisosMostrado) {
                    window.devolucionesRentingAvisoPermisosMostrado = true;
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'warning',
                        title: 'Sin permiso de lectura en devoluciones. Modo local temporal activo.',
                        showConfirmButton: false,
                        timer: 3200
                    });
                }
                if (window.tabActiva === 'devoluciones-renting' && typeof window.renderDevolucionesRenting === 'function') {
                    window.renderDevolucionesRenting();
                }
                return;
            }

            console.warn('No se pudo sincronizar devoluciones_renting.', error);
        }
    );
};

window.crearDevolucionRentingDesdeAgenda = async function(payload = {}) {
    if (!window.db || !window.doc || !window.setDoc || !window.collection) {
        throw new Error('Firebase no esta inicializado para devoluciones.');
    }

    const ahora = typeof window.obtenerTimestamp === 'function' ? window.obtenerTimestamp() : Date.now();
    const citaIdOrigen = String(payload.citaIdOrigen || '').trim();
    const matricula = String(payload.matricula || '').toUpperCase().trim().replace(/\s/g, '');

    const existente = (window.devolucionesRentingData || []).find((x) => {
        if (citaIdOrigen && String(x.citaIdOrigen || '') === citaIdOrigen) return true;
        const matX = String(x.matricula || '').toUpperCase().trim().replace(/\s/g, '');
        return !!matricula && matX === matricula && window.obtenerEstadoDevolucionRenting(x) === 'ABIERTA';
    }) || null;

    const idDoc = existente?.id || (citaIdOrigen ? `dev_cita_${citaIdOrigen}` : `dev_${ahora}`);
    const fechaRecogida = window.normalizarFechaIsoDevolucionRenting(payload.fechaRecogida) || window.normalizarFechaIsoDevolucionRenting(new Date());

    const base = {
        recogidoPor: String(payload.recogidoPor || window.usuarioActivo || 'EQUIPO').toUpperCase().trim(),
        matricula: matricula || 'S/M',
        renting: String(payload.renting || '').toUpperCase().trim(),
        modelo: String(payload.modelo || 'VEHICULO').toUpperCase().trim(),
        fechaRecogida,
        ubicacion: String(payload.ubicacion || '').toUpperCase().trim(),
        citaIdOrigen: citaIdOrigen || null,
        vehiculoIdOrigen: String(payload.vehiculoIdOrigen || '').trim() || null,
        bastidor: String(payload.bastidor || '').toUpperCase().trim() || null,
        actualizadoTs: ahora,
        actualizadoPor: window.usuarioActivo || 'SISTEMA'
    };

    if (existente) {
        await window.updateDoc(window.doc(window.db, 'devoluciones_renting', idDoc), base);
        return { id: idDoc, creada: false };
    }

    await window.setDoc(window.doc(window.db, 'devoluciones_renting', idDoc), {
        ...base,
        urlActaDevolucion: null,
        estadoSubidaActa: 'SIN_ARCHIVO',
        intentosSubidaActa: 0,
        errorSubidaActa: null,
        fechaReentregaRenting: '',
        urlCartaPorte: null,
        estadoSubidaCarta: 'SIN_ARCHIVO',
        intentosSubidaCarta: 0,
        errorSubidaCarta: null,
        creadoTs: ahora,
        creadoPor: window.usuarioActivo || 'SISTEMA',
        origen: 'AGENDA'
    });

    return { id: idDoc, creada: true };
};

window.iniciarDevolucionRentingDesdeAgenda = function(payload = {}) {
    window.devolucionRentingPendienteAgenda = {
        recogidoPor: String(payload.recogidoPor || window.usuarioActivo || '').toUpperCase().trim(),
        matricula: String(payload.matricula || '').toUpperCase().trim().replace(/\s/g, ''),
        renting: String(payload.renting || '').toUpperCase().trim(),
        modelo: String(payload.modelo || '').toUpperCase().trim(),
        fechaRecogida: window.normalizarFechaIsoDevolucionRenting(payload.fechaRecogida) || window.normalizarFechaIsoDevolucionRenting(new Date()),
        ubicacion: String(payload.ubicacion || '').toUpperCase().trim(),
        citaIdOrigen: String(payload.citaIdOrigen || '').trim() || null,
        vehiculoIdOrigen: String(payload.vehiculoIdOrigen || '').trim() || null,
        bastidor: String(payload.bastidor || '').toUpperCase().trim() || null,
        noActualizarCitaEstadoEntrega: payload.noActualizarCitaEstadoEntrega === true,
        origen: 'AGENDA'
    };

    if (typeof window.cambiarPestana === 'function') {
        window.cambiarPestana('devoluciones-renting');
    }

    setTimeout(() => {
        if (typeof window.abrirFormularioDevolucionRenting === 'function') {
            window.abrirFormularioDevolucionRenting();
        }
    }, 120);
};

window.abrirAdjuntosDevolucionRenting = function(id) {
    const item = (window.devolucionesRentingData || []).find(x => x.id === id);
    if (!item) return;

    const enlaces = [];
    if (item.urlActaDevolucion) {
        enlaces.push(`<a href="${item.urlActaDevolucion}" target="_blank" class="text-blue-700 hover:underline font-bold"><i class="ph-bold ph-file-pdf"></i> Acta de devolución</a>`);
    }
    if (item.urlFotoEstado) {
        enlaces.push(`<a href="${item.urlFotoEstado}" target="_blank" class="text-orange-600 hover:underline font-bold"><i class="ph-bold ph-image"></i> Foto estado vehículo</a>`);
    }
    if (item.urlCartaPorte) {
        enlaces.push(`<a href="${item.urlCartaPorte}" target="_blank" class="text-blue-700 hover:underline font-bold"><i class="ph-bold ph-file-text"></i> Carta de porte</a>`);
    }

    if (!enlaces.length) {
        Swal.fire('Sin adjuntos', 'Este registro aún no tiene acta, fotos ni carta de porte.', 'info');
        return;
    }

    Swal.fire({
        title: 'Documentación adjunta',
        html: `<div class="text-left space-y-3">${enlaces.map(x => `<div>${x}</div>`).join('')}</div>`,
        confirmButtonColor: '#001e50'
    });
};

window.copiarUrlDocumentoDevolucionRenting = async function(id, tipoDocumento) {
    const item = (window.devolucionesRentingData || []).find(x => x.id === id);
    if (!item) return;

    const tipo = String(tipoDocumento || '').toUpperCase();
    const url = tipo === 'ACTA' ? item.urlActaDevolucion : item.urlCartaPorte;
    const etiqueta = tipo === 'ACTA' ? 'acta de devolucion' : 'carta de porte';

    if (!url) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: `No hay URL de ${etiqueta}`,
            showConfirmButton: false,
            timer: 1600
        });
        return;
    }

    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
        } else {
            const area = document.createElement('textarea');
            area.value = url;
            area.setAttribute('readonly', '');
            area.style.position = 'absolute';
            area.style.left = '-9999px';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            document.body.removeChild(area);
        }

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `URL de ${etiqueta} copiada`,
            showConfirmButton: false,
            timer: 1600
        });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo copiar la URL al portapapeles.', 'error');
    }
};

window.eliminarDevolucionRenting = async function(id) {
    const item = (window.devolucionesRentingData || []).find(x => x.id === id);
    if (!item) return;

    const ok = await Swal.fire({
        title: '¿Eliminar registro?',
        text: `Se eliminará la devolución ${item.matricula || 'S/M'}.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!ok.isConfirmed) return;

    try {
        await window.deleteDoc(window.doc(window.db, 'devoluciones_renting', id));
        window.eliminarDevolucionRentingLocal(id);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Registro eliminado', showConfirmButton: false, timer: 1500 });
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo eliminar la devolución.', 'error');
    }
};

window.abrirFormularioDevolucionRenting = async function(id) {
    const existente = (window.devolucionesRentingData || []).find(x => x.id === id) || null;
    const pendienteAgenda = !id && !existente ? (window.devolucionRentingPendienteAgenda || null) : null;
    const baseForm = existente || pendienteAgenda || null;
    const esEdicion = !!existente;

    const { value: formValues } = await Swal.fire({
        title: esEdicion ? 'Editar entrega del cliente' : 'Nueva entrega de cliente',
        width: 760,
        html: `
            <div style="text-align:left; font-family:'Inter', sans-serif;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Recogido por</label>
                        <input id="dev-recogido" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="Nombre" value="${window.escapeJS(baseForm?.recogidoPor || window.usuarioActivo || '')}">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Matrícula</label>
                        <input id="dev-matricula" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="1234ABC" value="${window.escapeJS(baseForm?.matricula || '')}">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Renting</label>
                        <input id="dev-renting" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="ARVAL, ALD..." value="${window.escapeJS(baseForm?.renting || '')}">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Modelo</label>
                        <input id="dev-modelo" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="T-ROC" value="${window.escapeJS(baseForm?.modelo || '')}">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Fecha recogida</label>
                        <input id="dev-fecha-recogida" type="date" class="swal2-input !w-full !m-0 text-center" value="${window.escapeJS(baseForm?.fechaRecogida || '')}">
                    </div>
                </div>

                <div style="margin-top: 10px;">
                    <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Ubicación aparcado</label>
                    <input id="dev-ubicacion" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="Campa A / Zona 4 / Plaza 22" value="${window.escapeJS(baseForm?.ubicacion || '')}">
                </div>

                <div style="margin-top: 14px; border-top:1px solid #e5e7eb; padding-top:12px;">
                    <p style="font-size:11px; font-weight:bold; color:#666; margin-bottom:8px; text-transform:uppercase;">Documentación en la entrega del cliente</p>
                    
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <!-- Columna Acta -->
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px;">1. Acta de devolución (PDF/Foto)</label>
                            <input id="dev-acta" type="file" accept=".pdf,image/*" class="swal2-file text-sm w-full border border-gray-300 rounded p-2 mb-2">
                            <label style="display:block; font-size:10px; font-weight:bold; color:#666; margin-bottom:5px;">O abrir cámara (Móvil)</label>
                            <input id="dev-acta-camara" type="file" accept="image/*" capture="environment" class="swal2-file text-sm w-full border border-gray-300 rounded p-2">
                            ${existente?.urlActaDevolucion ? `<p style="margin-top:5px; font-size:11px;"><a href="${existente.urlActaDevolucion}" target="_blank" style="color:#1d4ed8; font-weight:bold; text-decoration:underline;">Ver acta actual</a></p>` : ''}
                        </div>

                        <!-- Columna Foto Daños -->
                        <div>
                            <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px;">2. Foto Estado/Daños (Opcional)</label>
                            <input id="dev-foto-danos" type="file" accept="image/*" class="swal2-file text-sm w-full border border-gray-300 rounded p-2 mb-2">
                            <label style="display:block; font-size:10px; font-weight:bold; color:#666; margin-bottom:5px;">O abrir cámara (Móvil)</label>
                            <input id="dev-foto-camara" type="file" accept="image/*" capture="environment" class="swal2-file text-sm w-full border border-gray-300 rounded p-2">
                            ${existente?.urlFotoEstado ? `<p style="margin-top:5px; font-size:11px;"><a href="${existente.urlFotoEstado}" target="_blank" style="color:#1d4ed8; font-weight:bold; text-decoration:underline;">Ver foto actual</a></p>` : ''}
                        </div>
                    </div>

                    <p style="font-size:11px; color:#6b7280; margin-top:12px;">
                        La fecha de reentrega y la carta de porte se registran después, cuando el renting retira el coche.
                    </p>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#001e50',
        confirmButtonText: esEdicion ? 'Guardar cambios' : 'Crear registro',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const recogidoPor = String(document.getElementById('dev-recogido').value || '').toUpperCase().trim();
            const matricula = String(document.getElementById('dev-matricula').value || '').toUpperCase().trim().replace(/\s/g, '');
            const renting = String(document.getElementById('dev-renting').value || '').toUpperCase().trim();
            const modelo = String(document.getElementById('dev-modelo').value || '').toUpperCase().trim();
            const fechaRecogida = String(document.getElementById('dev-fecha-recogida').value || '').trim();
            const ubicacion = String(document.getElementById('dev-ubicacion').value || '').toUpperCase().trim();
            
            const fileActaDocumento = document.getElementById('dev-acta').files[0] || null;
            const fileActaCamara = document.getElementById('dev-acta-camara').files[0] || null;
            const fileActa = fileActaCamara || fileActaDocumento || null;

            // 🔥 NUEVO: Recoger la foto del estado
            const fileFotoDanos = document.getElementById('dev-foto-danos').files[0] || null;
            const fileFotoCamara = document.getElementById('dev-foto-camara').files[0] || null;
            const fileFoto = fileFotoCamara || fileFotoDanos || null;

            if (!recogidoPor) return Swal.showValidationMessage('El campo "Recogido por" es obligatorio.');
            if (!matricula) return Swal.showValidationMessage('La matrícula es obligatoria.');
            if (!renting) return Swal.showValidationMessage('El renting es obligatorio.');
            if (!modelo) return Swal.showValidationMessage('El modelo es obligatorio.');
            if (!fechaRecogida) return Swal.showValidationMessage('La fecha de recogida es obligatoria.');
            if (!ubicacion) return Swal.showValidationMessage('La ubicación es obligatoria.');
            if (!esEdicion && !fileActa) return Swal.showValidationMessage('En el alta debes adjuntar el acta de devolución.');

            return {
                recogidoPor, matricula, renting, modelo, fechaRecogida, ubicacion, fileActa, fileFoto, // Añadimos fileFoto
                citaIdOrigen: baseForm?.citaIdOrigen || null,
                vehiculoIdOrigen: baseForm?.vehiculoIdOrigen || null,
                bastidor: baseForm?.bastidor || null,
                noActualizarCitaEstadoEntrega: baseForm?.noActualizarCitaEstadoEntrega === true,
                origen: baseForm?.origen || null
            };
        }
    });

    if (!formValues) {
        if (!esEdicion && pendienteAgenda) window.devolucionRentingPendienteAgenda = null;
        return;
    }

    try {
        Swal.fire({ title: 'Guardando devolución...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        let urlActaDevolucion = existente?.urlActaDevolucion || null;
        let estadoSubidaActa = existente?.estadoSubidaActa || 'SIN_ARCHIVO';
        let intentosSubidaActa = Number(existente?.intentosSubidaActa || 0);
        let errorSubidaActa = existente?.errorSubidaActa || null;

        // Variables para la nueva foto
        let urlFotoEstado = existente?.urlFotoEstado || null;

        if (formValues.fileActa) {
            const subidaActa = await window.subirArchivoConReintento(formValues.fileActa, { maxIntentos: 3 });
            if (subidaActa.ok) {
                urlActaDevolucion = subidaActa.url;
                estadoSubidaActa = 'SUBIDO';
                intentosSubidaActa = subidaActa.intentos;
                errorSubidaActa = null;
            } else {
                estadoSubidaActa = 'PENDIENTE_SUBIDA';
                intentosSubidaActa = subidaActa.intentos;
                errorSubidaActa = subidaActa.error;
                if (!esEdicion) throw new Error(`No se pudo subir el acta: ${subidaActa.error || 'error desconocido'}`);
            }
        }

        // 🔥 NUEVO: Lógica para subir la foto si existe
        if (formValues.fileFoto) {
            const subidaFoto = await window.subirArchivoConReintento(formValues.fileFoto, { maxIntentos: 3 });
            if (subidaFoto.ok) {
                urlFotoEstado = subidaFoto.url;
            } else {
                console.warn('Error al subir la foto de daños (continuamos sin ella)', subidaFoto.error);
            }
        }

        const ahora = typeof window.obtenerTimestamp === 'function' ? window.obtenerTimestamp() : Date.now();
        const idDoc = existente?.id || `dev_${ahora}`;

        const payloadBase = {
            recogidoPor: formValues.recogidoPor,
            matricula: formValues.matricula,
            renting: formValues.renting,
            modelo: formValues.modelo,
            fechaRecogida: formValues.fechaRecogida,
            ubicacion: formValues.ubicacion,
            urlActaDevolucion: urlActaDevolucion,
            urlFotoEstado: urlFotoEstado, // Guardamos la URL de la foto
            estadoSubidaActa, intentosSubidaActa, errorSubidaActa,
            actualizadoTs: ahora,
            actualizadoPor: window.usuarioActivo || 'SISTEMA'
        };

        if (esEdicion) {
            await window.updateDoc(window.doc(window.db, 'devoluciones_renting', idDoc), payloadBase);
            window.upsertDevolucionRentingLocal({
                ...(existente || {}), id: idDoc, ...payloadBase
            });
        } else {
            await window.setDoc(window.doc(window.db, 'devoluciones_renting', idDoc), {
                ...payloadBase,
                citaIdOrigen: formValues.citaIdOrigen || null,
                vehiculoIdOrigen: formValues.vehiculoIdOrigen || null,
                bastidor: formValues.bastidor || null,
                origen: formValues.origen || null,
                fechaReentregaRenting: '',
                urlCartaPorte: null,
                estadoSubidaCarta: 'SIN_ARCHIVO', intentosSubidaCarta: 0, errorSubidaCarta: null,
                creadoTs: ahora, creadoPor: window.usuarioActivo || 'SISTEMA'
            });

            window.upsertDevolucionRentingLocal({
                id: idDoc, ...payloadBase,
                citaIdOrigen: formValues.citaIdOrigen || null,
                vehiculoIdOrigen: formValues.vehiculoIdOrigen || null,
                bastidor: formValues.bastidor || null,
                origen: formValues.origen || null,
                fechaReentregaRenting: '', urlCartaPorte: null,
                estadoSubidaCarta: 'SIN_ARCHIVO', intentosSubidaCarta: 0, errorSubidaCarta: null,
                creadoTs: ahora, creadoPor: window.usuarioActivo || 'SISTEMA'
            });

            if (formValues.citaIdOrigen && formValues.noActualizarCitaEstadoEntrega !== true) {
                const fechaEntregaTexto = typeof window.formatearFechaES === 'function' ? window.formatearFechaES(ahora) : new Date(ahora).toLocaleDateString('es-ES');
                try {
                    window.updateDoc(window.doc(window.db, 'citas_agenda', formValues.citaIdOrigen), {
                        estado: 'confirmada', entregado: true, fechaEntrega: ahora, fechaEntregaTexto, tipoFinalizacion: 'DEVOLUCION_EN_CURSO'
                    }).catch((errorCitaAgenda) => console.warn('No se pudo actualizar citas_agenda', errorCitaAgenda));
                } catch (errorCitaAgenda) {
                    console.warn('No se pudo actualizar citas_agenda', errorCitaAgenda);
                }
            }
        }

        if (!esEdicion && pendienteAgenda) window.devolucionRentingPendienteAgenda = null;

        Swal.fire('Guardado', 'La devolución renting se ha registrado correctamente.', 'success');
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo guardar la devolución renting.', 'error');
    }
};

window.cerrarDevolucionRenting = async function(id) {
    const existente = (window.devolucionesRentingData || []).find(x => x.id === id);
    if (!existente) return;

    const { value: formValues } = await Swal.fire({
        title: 'Salida de vuelta al renting',
        width: 620,
        html: `
            <div style="text-align:left; font-family:'Inter', sans-serif;">
                <p style="font-size:12px; color:#374151; margin-bottom:10px;">
                    Registra la fecha real de salida y adjunta la carta de porte firmada.
                </p>
                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Fecha reentrega renting</label>
                <input id="dev-cierre-fecha" type="date" class="swal2-input !w-full !m-0 text-center" value="${window.escapeJS(existente.fechaReentregaRenting || '')}">

                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin:12px 0 5px; text-transform:uppercase;">Carta de porte (PDF/Imagen)</label>
                <input id="dev-cierre-carta" type="file" accept=".pdf,image/*" class="swal2-file text-sm w-full border border-gray-300 rounded p-2">
                ${existente.urlCartaPorte ? `<p style="margin-top:8px; font-size:11px;"><a href="${existente.urlCartaPorte}" target="_blank" style="color:#1d4ed8; font-weight:bold; text-decoration:underline;">Ver carta actual</a></p>` : ''}
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#047857',
        confirmButtonText: 'Cerrar devolución',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const fechaReentregaRenting = String(document.getElementById('dev-cierre-fecha').value || '').trim();
            const fileCarta = document.getElementById('dev-cierre-carta').files[0] || null;

            if (!fechaReentregaRenting) return Swal.showValidationMessage('La fecha de reentrega es obligatoria.');
            if (!existente.urlCartaPorte && !fileCarta) return Swal.showValidationMessage('Debes adjuntar la carta de porte para cerrar.');

            return { fechaReentregaRenting, fileCarta };
        }
    });

    if (!formValues) return;

    try {
        Swal.fire({ title: 'Cerrando devolución...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        let urlCartaPorte = existente.urlCartaPorte || null;
        let estadoSubidaCarta = existente.estadoSubidaCarta || 'SIN_ARCHIVO';
        let intentosSubidaCarta = Number(existente.intentosSubidaCarta || 0);
        let errorSubidaCarta = existente.errorSubidaCarta || null;

        if (formValues.fileCarta) {
            const subidaCarta = await window.subirArchivoConReintento(formValues.fileCarta, { maxIntentos: 3 });
            if (subidaCarta.ok) {
                urlCartaPorte = subidaCarta.url;
                estadoSubidaCarta = 'SUBIDO';
                intentosSubidaCarta = subidaCarta.intentos;
                errorSubidaCarta = null;
            } else {
                estadoSubidaCarta = 'PENDIENTE_SUBIDA';
                intentosSubidaCarta = subidaCarta.intentos;
                errorSubidaCarta = subidaCarta.error;
            }
        }

        const ahora = typeof window.obtenerTimestamp === 'function' ? window.obtenerTimestamp() : Date.now();
        const fechaCierreIso = window.normalizarFechaIsoDevolucionRenting(formValues.fechaReentregaRenting) || window.normalizarFechaIsoDevolucionRenting(new Date());
        const fechaCierreTs = Number(new Date(`${fechaCierreIso}T12:00:00`).getTime()) || ahora;

        await window.updateDoc(window.doc(window.db, 'devoluciones_renting', id), {
            fechaReentregaRenting: formValues.fechaReentregaRenting,
            urlCartaPorte,
            estadoSubidaCarta,
            intentosSubidaCarta,
            errorSubidaCarta,
            cerradaTs: fechaCierreTs,
            actualizadoTs: ahora,
            actualizadoPor: window.usuarioActivo || 'SISTEMA'
        });

        if (typeof window.registrarMovimientoHistorial === 'function') {
            await window.registrarMovimientoHistorial({
                ts: fechaCierreTs,
                tipo: 'DEVOLUCION',
                citaId: existente.citaIdOrigen || null,
                vehiculoId: existente.vehiculoIdOrigen || null,
                matricula: existente.matricula || 'S/M',
                bastidor: existente.bastidor || 'S/D',
                modelo: existente.modelo || 'DEVOLUCION',
                renting: existente.renting || '',
                recogidoPor: existente.recogidoPor || '',
                ubicacion: existente.ubicacion || '',
                fechaRecogida: existente.fechaRecogida || '',
                fechaReentregaRenting: formValues.fechaReentregaRenting,
                urlActaDevolucion: existente.urlActaDevolucion || null,
                urlCartaPorte: urlCartaPorte || null,
                detalle: 'Devolucion cerrada y archivada desde operativa diaria'
            });
        }

        if (existente.citaIdOrigen) {
            try {
                const fechaEntregaTexto = typeof window.formatearFechaES === 'function'
                    ? window.formatearFechaES(fechaCierreTs)
                    : new Date(fechaCierreTs).toLocaleDateString('es-ES');

                await window.updateDoc(window.doc(window.db, 'citas_agenda', existente.citaIdOrigen), {
                    estado: 'confirmada',
                    entregado: true,
                    fechaEntrega: fechaCierreTs,
                    fechaEntregaTexto,
                    tipoFinalizacion: 'DEVOLUCION_CERRADA'
                });
            } catch (errorCita) {
                console.warn('No se pudo actualizar la cita origen al cerrar devolución (continuamos).', errorCita);
            }
        }

        if (existente.vehiculoIdOrigen) {
            try {
                await window.updateDoc(window.doc(window.db, 'vehiculos', existente.vehiculoIdOrigen), {
                    entregado: true,
                    fechaEntrega: new Date(fechaCierreTs).toISOString(),
                    tipoFinalizacion: 'DEVOLUCION'
                });
            } catch (errorVehiculo) {
                console.warn('No se pudo marcar el vehículo origen como finalizado (continuamos).', errorVehiculo);
            }
        }

        await window.deleteDoc(window.doc(window.db, 'devoluciones_renting', id));
        window.eliminarDevolucionRentingLocal(id);

        Swal.fire('Cerrada', 'Se ha archivado en historial como devolución y ya no aparece en operativa diaria.', 'success');
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo cerrar la devolución.', 'error');
    }
};

window.exportarDevolucionesRentingExcel = function() {
    const datos = Array.isArray(window.devolucionesRentingData) ? window.devolucionesRentingData : [];
    if (!datos.length) {
        Swal.fire('Aviso', 'No hay devoluciones para exportar.', 'info');
        return;
    }

    const rows = datos.map((d) => ({
        'RECOGIDO POR': d.recogidoPor || '',
        'MATRICULA': d.matricula || '',
        'RENTING': d.renting || '',
        'MODELO': d.modelo || '',
        'FECHA RECOGIDA': window.formatearFechaDevolucionRenting(d.fechaRecogida),
        'UBICACION': d.ubicacion || '',
        'FECHA REENTREGA RENTING': window.formatearFechaDevolucionRenting(d.fechaReentregaRenting),
        'ESTADO': window.obtenerEstadoDevolucionRenting(d),
        'URL ACTA': d.urlActaDevolucion || '',
        'URL CARTA PORTE': d.urlCartaPorte || ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones Renting');
    XLSX.writeFile(wb, 'Devoluciones_Renting.xlsx');
};

window.renderDevolucionesRenting = function() {
    const contenedor = document.getElementById('contenedorDevolucionesRenting');
    if (!contenedor) return;

    const lista = Array.isArray(window.devolucionesRentingData) ? window.devolucionesRentingData : [];
    
    const ui = window.devolucionesRentingUI || { filtroEstado: 'TODAS', busqueda: '', vista: 'TABLA' };
    ui.filtroEstado = 'TODAS'; 
    ui.vista = 'TABLA';
    
    const listaFiltrada = window.filtrarDevolucionesRenting(lista);
    const countTotal = lista.length;

    // 🔥 MODIFICADO: Hemos eliminado el <div> que contenía el botón "Modo Tabla"
    const bloqueCabecera = `
        <div class="mb-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h2 class="text-xl font-black text-[#001e50] uppercase flex items-center gap-2">
                <i class="ph-bold ph-arrow-counter-clockwise text-sky-600"></i> Devoluciones Renting
            </h2>
            <p class="text-xs text-gray-500 font-bold mt-1">Fase 1: alta con acta de devolución del cliente. Fase 2: cierre al salir al renting con fecha y carta de porte.</p>

            <div class="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <span class="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm">
                        <i class="ph-bold ph-car-profile"></i> Vehículos en total: ${countTotal}
                    </span>
                </div>
            </div>

            <div class="mt-4">
                <input
                    type="text"
                    value="${window.escapeJS(ui.busqueda || '')}"
                    oninput="window.setBusquedaDevolucionesRenting(this.value)"
                    onchange="window.setBusquedaDevolucionesRenting(this.value)"
                    onkeyup="if(event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Escape') window.setBusquedaDevolucionesRenting(this.value)"
                    placeholder="Buscar por matrícula, renting, modelo, recogido por o ubicación..."
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-[#001e50] focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
            </div>
        </div>`;

    if (!lista.length) {
        contenedor.innerHTML = `
            ${bloqueCabecera}
            <div class="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6">
                <i class="ph-bold ph-files text-4xl text-gray-300 mb-3 block"></i>
                <p class="text-gray-600 font-black text-lg">Todavía no hay devoluciones renting registradas.</p>
                <p class="text-gray-400 text-sm mt-1">Pulsa en "Nueva Devolución" para crear el primer registro.</p>
            </div>`;
        return;
    }

    if (!listaFiltrada.length) {
        contenedor.innerHTML = `
            ${bloqueCabecera}
            <div class="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200 mt-4">
                <i class="ph-bold ph-magnifying-glass text-4xl text-gray-300 mb-3 block"></i>
                <p class="text-gray-600 font-black text-lg">No hay resultados con ese texto de búsqueda.</p>
                <p class="text-gray-400 text-sm mt-1">Prueba con otra matrícula, modelo o ubicación.</p>
            </div>`;
        return;
    }

    const filasTabla = listaFiltrada.map((d) => {
        const estado = window.obtenerEstadoDevolucionRenting(d);
        const textoBusqueda = window.normalizarTextoDevolucionRenting([
            d.recogidoPor,
            d.matricula,
            d.renting,
            d.modelo,
            d.ubicacion
        ].join(' '));
        const badge = estado === 'CERRADA'
            ? '<span class="inline-flex bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-1 rounded uppercase">CERRADA</span>'
            : '<span class="inline-flex bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black px-2 py-1 rounded uppercase">ABIERTA</span>';

        const linkActa = d.urlActaDevolucion
            ? `<div class="flex items-center gap-1">
                    <a href="${d.urlActaDevolucion}" target="_blank" class="text-sky-700 hover:underline font-black">Ver</a>
                    <button onclick="window.copiarUrlDocumentoDevolucionRenting('${d.id}', 'ACTA')" class="px-2 py-1 rounded border border-sky-200 bg-sky-50 text-sky-700 text-[10px] font-black hover:bg-sky-100 transition-colors">Copiar</button>
               </div>`
            : '<span class="text-gray-400 font-bold">-</span>';
            
        const linkFoto = d.urlFotoEstado
            ? `<div class="flex items-center gap-1">
                    <a href="${d.urlFotoEstado}" target="_blank" class="text-orange-600 hover:underline font-black">Ver</a>
               </div>`
            : '<span class="text-gray-400 font-bold">-</span>';

        const linkCarta = d.urlCartaPorte
            ? `<div class="flex items-center gap-1">
                    <a href="${d.urlCartaPorte}" target="_blank" class="text-sky-700 hover:underline font-black">Ver</a>
                    <button onclick="window.copiarUrlDocumentoDevolucionRenting('${d.id}', 'CARTA')" class="px-2 py-1 rounded border border-sky-200 bg-sky-50 text-sky-700 text-[10px] font-black hover:bg-sky-100 transition-colors">Copiar</button>
               </div>`
            : '<span class="text-gray-400 font-bold">-</span>';

        return `
            <tr class="hover:bg-sky-50/40 transition-colors" data-dev-item="1" data-dev-search="${window.escapeJS(textoBusqueda)}">
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-[#001e50] whitespace-nowrap bg-white min-w-[160px]">${d.recogidoPor || '-'}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-black text-[#001e50] whitespace-nowrap bg-white sticky left-[160px] z-20 shadow-[4px_0_6px_-6px_rgba(0,0,0,0.4)] min-w-[130px]">${d.matricula || '-'}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap">${d.renting || '-'}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap">${d.modelo || '-'}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap">${window.formatearFechaDevolucionRenting(d.fechaRecogida)}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 min-w-[180px]">${d.ubicacion || '-'}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap">${window.formatearFechaDevolucionRenting(d.fechaReentregaRenting)}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs font-black text-[#001e50] whitespace-nowrap">${window.calcularTiempoEnConcesionarioDevolucion(d)}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs whitespace-nowrap sticky right-[250px] z-20 bg-white shadow-[-4px_0_6px_-6px_rgba(0,0,0,0.35)] min-w-[130px]">${badge}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs whitespace-nowrap">${linkActa}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs whitespace-nowrap">${linkFoto}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs whitespace-nowrap">${linkCarta}</td>
                <td class="px-3 py-2 border-b border-gray-200 text-xs sticky right-0 z-20 bg-white min-w-[250px]">
                    <div class="flex items-center gap-1 flex-wrap">
                        <button onclick="window.abrirFormularioDevolucionRenting('${d.id}')" class="bg-[#001e50] text-white px-2 py-1 rounded text-[10px] font-black hover:bg-blue-900 transition-colors"><i class="ph-bold ph-pencil-simple"></i> Editar</button>
                        ${estado === 'ABIERTA'
                            ? `<button onclick="window.cerrarDevolucionRenting('${d.id}')" class="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-black hover:bg-emerald-800 transition-colors"><i class="ph-bold ph-check"></i> Cerrar</button>`
                            : ''}
                        <button onclick="window.abrirAdjuntosDevolucionRenting('${d.id}')" class="bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded text-[10px] font-black hover:bg-gray-50 transition-colors"><i class="ph-bold ph-paperclip"></i> Adjuntos</button>
                        <button onclick="window.eliminarDevolucionRenting('${d.id}')" class="bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded text-[10px] font-black hover:bg-red-100 transition-colors"><i class="ph-bold ph-trash"></i> Eliminar</button>
                    </div>
                </td>
            </tr>`;
    }).join('');

    const vistaContenido = `
        <div id="dev-resultados-wrapper" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-auto">
                <table class="min-w-[1550px] w-full border-collapse">
                    <thead class="bg-[#001e50] text-white sticky top-0 z-10">
                        <tr>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black min-w-[160px]">Recogido por</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black sticky left-[160px] z-30 bg-[#001e50] min-w-[130px]">Matrícula</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Renting</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Modelo</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Fecha recogida</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Ubicación</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Fecha reentrega renting</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">Tiempo en concesionario</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black sticky right-[250px] z-30 bg-[#001e50] min-w-[130px]">Estado</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">URL Acta</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">URL Foto</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black">URL Carta porte</th>
                            <th class="px-3 py-3 text-left text-[10px] uppercase tracking-wider font-black sticky right-0 z-30 bg-[#001e50] min-w-[250px]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasTabla}
                    </tbody>
                </table>
            </div>
        </div>`;

    contenedor.innerHTML = `
        ${bloqueCabecera}
        ${vistaContenido}
        <div id="dev-no-resultados-busqueda" class="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200 mt-4" style="display:none;">
            <i class="ph-bold ph-magnifying-glass text-4xl text-gray-300 mb-3 block"></i>
            <p class="text-gray-600 font-black text-lg">No hay resultados con ese texto.</p>
            <p class="text-gray-400 text-sm mt-1">Prueba con otro término de búsqueda.</p>
        </div>`;

    window.aplicarBusquedaDevolucionesRentingDOM();
};