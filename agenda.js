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
    // 📅 AGENDA Y CUADRANTE WEB
    // ==========================================
    window.datosAgenda = [];
    window.mesVistaActual = new Date();
    window.mesVistaActual.setDate(1);
    window.alertaAtrasosMostrada = false;
    window.fechaEnfoqueForzado = null; 

    window.sincronizarCitasSilencioso = async function() {
        const btnSync = document.getElementById('btnSyncCitas');
        if(btnSync) btnSync.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Actualizando...';
        try {
            await window.renderAgenda();
            if(btnSync) btnSync.innerHTML = '<i class="ph-bold ph-arrows-clockwise text-base"></i> Actualizar Agenda';
        } catch (e) { 
            if(btnSync) btnSync.innerHTML = '<i class="ph-bold ph-warning text-red-500"></i> Error Sync'; 
        }
    };

    window.esVistaAgendaMovil = function() {
        return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    window.agendaFechaSeleccionada = new Date();
    window.agendaFechaSeleccionada.setHours(0, 0, 0, 0);

    window.normalizarFechaAgenda = function(valor) {
        if (!valor) return null;
        if (valor instanceof Date) return valor;
        if (typeof valor?.toDate === 'function') return valor.toDate();
        if (typeof valor?.seconds === 'number') return new Date(valor.seconds * 1000);

        const texto = String(valor).trim();
        if (!texto) return null;

        if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
            const fecha = new Date(texto.replace(' ', 'T'));
            if (!isNaN(fecha.getTime())) return fecha;
        }

        const fechaConHora = new Date(texto.replace(' ', 'T'));
        if (!isNaN(fechaConHora.getTime())) return fechaConHora;

        const partes = texto.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
        if (partes) {
            return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
        }

        return null;
    };

    window.normalizarFechaHoraAgenda = function(data) {
        const fechaRaw = data?.fechaHora || data?.fecha_hora || data?.fechaCita || data?.fecha || data?.fechaProgramada;
        const horaRaw = data?.hora || data?.horaCita || data?.horaProgramada || data?.hora_programada || data?.horaCitaProgramada;
        const fechaBase = window.normalizarFechaAgenda(fechaRaw);

        if (!fechaBase) return null;

        if (horaRaw) {
            const match = String(horaRaw).match(/(\d{1,2})(?::(\d{2}))?/);
            if (match) {
                const fecha = new Date(fechaBase);
                fecha.setHours(parseInt(match[1], 10), parseInt(match[2] || '0', 10), 0, 0);
                return fecha;
            }
        }

        return fechaBase;
    };

    window.enriquecerDatosCitaConVehiculo = function(data = {}) {
        const matriculaLimpia = String(data.matricula || data.Matricula || data.B || '').replace(/\s/g, '').toUpperCase();
        const bastidorLimpio = String(data.bastidor || data.A || '').replace(/\s/g, '').toUpperCase();

        const cocheRelacionado = (typeof todosLosCoches !== 'undefined' ? todosLosCoches : []).find(c => {
            const matVeh = String(c.B || c.matricula || c.Matricula || '').replace(/\s/g, '').toUpperCase();
            const basVeh = String(c.A || c.bastidor || '').replace(/\s/g, '').toUpperCase();
            return (matriculaLimpia && matVeh && matVeh === matriculaLimpia) || (bastidorLimpio && basVeh && basVeh === bastidorLimpio);
        });

        if (!cocheRelacionado) {
            return { ...data };
        }

        return {
            ...data,
            cliente: data.cliente || cocheRelacionado.cliente || 'Cliente',
            telefono: data.telefono || cocheRelacionado.telefono || cocheRelacionado.tlf || '',
            email: data.email || cocheRelacionado.email || '',
            matricula: data.matricula || data.Matricula || cocheRelacionado.B || cocheRelacionado.matricula || cocheRelacionado.Matricula || 'S/M',
            modelo: data.modelo || cocheRelacionado.C || cocheRelacionado.modelo || 'Vehículo',
            bastidor: data.bastidor || cocheRelacionado.A || cocheRelacionado.bastidor || '',
            renting: data.renting || cocheRelacionado.renting || '',
            entregaVO: data.entregaVO || cocheRelacionado.entregaVO || 'NO',
            agente: data.agente || data.entregador || cocheRelacionado.agente || cocheRelacionado.entregador || 'MANUEL'
        };
    };

    window.formatearFechaAgenda = function(fecha) {
        const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return fecha.toLocaleDateString('es-ES', opciones);
    };

    window.cambiarDiaAgenda = function(delta) {
        if (!window.agendaFechaSeleccionada || isNaN(window.agendaFechaSeleccionada.getTime())) {
            window.agendaFechaSeleccionada = new Date();
        }
        const nuevaFecha = new Date(window.agendaFechaSeleccionada);
        nuevaFecha.setDate(nuevaFecha.getDate() + delta);
        nuevaFecha.setHours(0, 0, 0, 0);
        window.agendaFechaSeleccionada = nuevaFecha;
        window.renderAgendaMovil();
    };

    window.seleccionarDiaAgenda = function(fecha) {
        const nuevaFecha = new Date(fecha);
        nuevaFecha.setHours(0, 0, 0, 0);
        window.agendaFechaSeleccionada = nuevaFecha;
        window.renderAgendaMovil();
    };

    window.irHoyAgenda = function() {
        window.agendaFechaSeleccionada = new Date();
        window.agendaFechaSeleccionada.setHours(0, 0, 0, 0);
        window.renderAgendaMovil();
    };

    window.abrirWhatsAppAgenda = function(telefono, cliente) {
        const numero = String(telefono || '').replace(/[^0-9+]/g, '');
        if (!numero) {
            Swal.fire({ icon: 'info', title: 'Sin teléfono', text: 'Este cliente no tiene número de teléfono asociado.' });
            return;
        }
        const mensaje = encodeURIComponent(`Hola ${cliente || 'cliente'}, te escribo desde GesCar OS.`);
        window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
    };

    window.llamarAgenda = function(telefono) {
        const numero = String(telefono || '').replace(/[^0-9+]/g, '');
        if (!numero) {
            Swal.fire({ icon: 'info', title: 'Sin teléfono', text: 'Este cliente no tiene número de teléfono asociado.' });
            return;
        }
        window.location.href = `tel:${numero}`;
    };

    window.marcarEntregadoAgenda = function(cita) {
        if (!cita) return;
        let fechaCitaObj = cita.fechaHora ? new Date(cita.fechaHora) : new Date();
        let fechaStr = fechaCitaObj.getFullYear() + '-' + String(fechaCitaObj.getMonth() + 1).padStart(2, '0') + '-' + String(fechaCitaObj.getDate()).padStart(2, '0');
        let horaStr = String(fechaCitaObj.getHours()).padStart(2, '0') + ':00';
        let idFb = (cita && cita.fila) ? cita.fila : 'no_db';

        if (idFb === 'no_db') {
            const matCita = String(cita.matricula || '').replace(/\s/g, '').toUpperCase();
            const basCita = String(cita.bastidor || '').replace(/\s/g, '').toUpperCase();
            const cocheVinculado = (typeof todosLosCoches !== 'undefined' ? todosLosCoches : []).find(c => {
                const matVeh = String(c.B || c.matricula || c.Matricula || '').replace(/\s/g, '').toUpperCase();
                const basVeh = String(c.A || c.bastidor || '').replace(/\s/g, '').toUpperCase();
                return (matCita && matVeh && matVeh === matCita) || (basCita && basVeh && basVeh === basCita);
            });
            if (cocheVinculado && cocheVinculado.fila) idFb = cocheVinculado.fila;
        }

        let modeloSeguro = window.escapeJS(cita.modelo || 'Vehículo');
        let matriculaSegura = window.escapeJS(cita.matricula || 'S/M');
        window.preguntarSiEntregado(idFb, modeloSeguro, matriculaSegura, fechaStr, horaStr, cita.id || null);
    };

    window.renderAgendaMovil = function() {
        const div = document.getElementById('contenedorAgenda');
        if (!div) return;

        const fechaSel = window.agendaFechaSeleccionada && !isNaN(window.agendaFechaSeleccionada.getTime())
            ? new Date(window.agendaFechaSeleccionada)
            : new Date();
        fechaSel.setHours(0, 0, 0, 0);
        window.agendaFechaSeleccionada = fechaSel;

        const fechaKey = `${fechaSel.getFullYear()}-${String(fechaSel.getMonth() + 1).padStart(2, '0')}-${String(fechaSel.getDate()).padStart(2, '0')}`;
        const citasDia = (window.datosAgenda || [])
            .filter((cita) => {
                if (!cita.fechaHora) return false;
                const fechaCita = new Date(cita.fechaHora);
                if (isNaN(fechaCita.getTime())) return false;
                return `${fechaCita.getFullYear()}-${String(fechaCita.getMonth() + 1).padStart(2, '0')}-${String(fechaCita.getDate()).padStart(2, '0')}` === fechaKey;
            })
            .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

        const fechaLabel = fechaSel.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const diaTitulo = fechaLabel.charAt(0).toUpperCase() + fechaLabel.slice(1);

        const html = `
            <div class="space-y-3">
                <div class="agenda-mobile-header rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <p class="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-semibold">Agenda del día</p>
                            <h3 class="text-base font-black text-slate-800">${diaTitulo}</h3>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="window.cambiarDiaAgenda(-1)" class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700"><i class="ph-bold ph-caret-left"></i></button>
                            <button onclick="window.irHoyAgenda()" class="rounded-full bg-[#001e50] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">Hoy</button>
                            <button onclick="window.cambiarDiaAgenda(1)" class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700"><i class="ph-bold ph-caret-right"></i></button>
                        </div>
                    </div>
                </div>

                ${citasDia.length === 0 ? `<div class="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm font-semibold text-slate-500 shadow-sm">No hay citas para este día.</div>` : citasDia.map((cita) => {
                    const fechaCita = cita.fechaHora ? new Date(cita.fechaHora) : new Date();
                    const hora = `${String(fechaCita.getHours()).padStart(2, '0')}:${String(fechaCita.getMinutes()).padStart(2, '0')}`;
                    const cliente = window.escapeJS(cita.cliente || 'Cliente');
                    const modelo = window.escapeJS(cita.modelo || 'Vehículo');
                    const matricula = window.escapeJS(cita.matricula || 'S/M');
                    const telefono = window.escapeJS(String(cita.telefono || '').trim());
                    const email = window.escapeJS(String(cita.email || '').trim());
                    const renting = window.escapeJS(String(cita.renting || '').trim());
                    const notas = window.escapeJS(String(cita.notas || '').trim());
                    const estado = String(cita.estado || 'confirmada').toLowerCase();
                    const badgeClass = estado === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                    const badgeLabel = estado === 'pendiente' ? 'Pendiente' : 'Confirmada';
                    const idFb = cita.fila ? cita.fila : 'no_db';
                    const modeloSeg = window.escapeJS(cita.modelo || 'Vehículo');
                    const matriculaSeg = window.escapeJS(cita.matricula || 'S/M');

                    return `
                        <div class="agenda-mobile-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <p class="text-[10px] font-black uppercase tracking-[0.3em] text-[#00b0f0]">${hora}</p>
                                    <h4 class="mt-1 text-base font-black text-slate-800">${modelo}</h4>
                                    <p class="text-sm font-semibold text-slate-600">${matricula}</p>
                                </div>
                                <span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClass}">${badgeLabel}</span>
                            </div>

                            <div class="mt-3 space-y-1 text-sm text-slate-600">
                                <p class="font-semibold text-slate-800">${cliente}</p>
                                ${telefono ? `<p class="flex items-center gap-1"><i class="ph-fill ph-phone text-sm text-slate-400"></i> ${telefono}</p>` : ''}
                                ${email ? `<p class="flex items-center gap-1"><i class="ph-fill ph-envelope text-sm text-slate-400"></i> ${email}</p>` : ''}
                                ${renting ? `<p class="flex items-center gap-1"><i class="ph-fill ph-buildings text-sm text-slate-400"></i> ${renting}</p>` : ''}
                                ${notas ? `<p class="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs"><i class="ph-fill ph-note text-sm text-slate-400"></i> ${notas}</p>` : ''}
                            </div>

                            <div class="mt-4 grid grid-cols-3 gap-2">
                                <button onclick="window.abrirWhatsAppAgenda('${telefono}', '${cliente}')" class="rounded-xl bg-emerald-600 px-2 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-sm">WhatsApp</button>
                                <button onclick="window.llamarAgenda('${telefono}')" class="rounded-xl bg-sky-600 px-2 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-sm">Llamar</button>
                                <button onclick="window.marcarEntregadoAgenda({id:'${cita.id}', fila:'${idFb}', modelo:'${modeloSeg}', matricula:'${matriculaSeg}', bastidor:'${window.escapeJS(cita.bastidor || '')}', renting:'${window.escapeJS(cita.renting || '')}', fechaHora:'${cita.fechaHora}'})" class="rounded-xl bg-[#001e50] px-2 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-sm">Entregado</button>
                            </div>
                        </div>`;
                }).join('')}
            </div>`;

        div.innerHTML = html;
    };

   window.renderAgenda = function() { 
    const pathname = (window.location.pathname || '').toLowerCase();
    const esPaginaMovil = pathname.includes('movil.html') || document.body?.dataset?.vista === 'movil';
    const usarVistaMovil = esPaginaMovil || window.esVistaAgendaMovil();
    const div = document.getElementById('contenedorAgenda');

    // No pintamos nada de Agenda fuera de su pestaña para evitar "bleed" visual.
    if (window.tabActiva !== 'agenda') {
        if (div) {
            div.classList.add('hidden');
            div.style.display = 'none';
            div.innerHTML = '';
        }
        return;
    }

    if (div) {
        div.classList.remove('hidden');
        div.style.display = 'flex';
        div.innerHTML = `<div class="bg-white p-16 rounded-2xl shadow-sm border border-gray-200 text-center flex flex-col items-center"><i class="ph-bold ph-spinner animate-spin text-5xl text-[#001e50] mb-4"></i><p class="font-black text-gray-500 tracking-widest uppercase">Cargando agenda...</p></div>`;
    }

    try {
        if (!window.mesVistaActual) {
            window.mesVistaActual = new Date(); window.mesVistaActual.setDate(1);
        }

        const renderizarVistaSegunDispositivo = function() {
            if (usarVistaMovil && typeof window.renderAgendaMovil === 'function') {
                if (div) {
                    div.classList.remove('hidden');
                    div.style.display = 'flex';
                }
                window.renderAgendaMovil();
            } else {
                if (div) {
                    div.innerHTML = `<div class="bg-white p-16 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col items-center"><i class="ph-bold ph-spinner animate-spin text-5xl text-[#001e50] mb-4"></i><p class="font-black text-gray-500 tracking-widest uppercase">Conectando Radares en Vivo...</p></div>`;
                }
                if (typeof window.dibujarCuadranteMes === 'function') window.dibujarCuadranteMes();
                if (typeof window.comprobarAtrasosGenerales === 'function') window.comprobarAtrasosGenerales(); 
            }
        };

        // 1. Radar de Citas
        window.onSnapshot(window.collection(window.db, "citas_agenda"), (querySnapshot) => {
            window.datosAgenda = []; 
            const actualizacionesPendientes = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const datosEnriquecidos = window.enriquecerDatosCitaConVehiculo(data);
                const fechaHora = window.normalizarFechaHoraAgenda(datosEnriquecidos) || new Date();
                const necesitaRelleno = ['cliente', 'telefono', 'email', 'matricula', 'modelo', 'bastidor', 'renting', 'entregaVO', 'agente'].some((campo) => {
                    const valorOriginal = data?.[campo];
                    const valorEnriquecido = datosEnriquecidos?.[campo];
                    return (!valorOriginal || String(valorOriginal).trim() === '') && valorEnriquecido && String(valorEnriquecido).trim() !== '';
                });

                if (necesitaRelleno) {
                    const patch = {};
                    ['cliente', 'telefono', 'email', 'matricula', 'modelo', 'bastidor', 'renting', 'entregaVO', 'agente'].forEach((campo) => {
                        const valorOriginal = data?.[campo];
                        const valorEnriquecido = datosEnriquecidos?.[campo];
                        if ((!valorOriginal || String(valorOriginal).trim() === '') && valorEnriquecido && String(valorEnriquecido).trim() !== '') {
                            patch[campo] = valorEnriquecido;
                        }
                    });
                    if (Object.keys(patch).length > 0) {
                        actualizacionesPendientes.push(window.updateDoc(window.doc(window.db, "citas_agenda", doc.id), patch));
                    }
                }

                window.datosAgenda.push({
                    id: doc.id, fechaHora,
                    cliente: datosEnriquecidos.cliente || "Cliente", telefono: datosEnriquecidos.telefono || "", email: datosEnriquecidos.email || "",
                    matricula: datosEnriquecidos.matricula || "S/M", modelo: datosEnriquecidos.modelo || "Vehículo", bastidor: datosEnriquecidos.bastidor || "",
                    renting: datosEnriquecidos.renting || "", entregaVO: datosEnriquecidos.entregaVO || "NO", agente: datosEnriquecidos.agente || "MANUEL",
                    notas: data.notas || "", estado: data.estado || "confirmada", entregado: data.entregado === true || data.entregado === "true",
                    tipoFinalizacion: data.tipoFinalizacion || '', fechaEntrega: data.fechaEntrega || null, fechaEntregaTexto: data.fechaEntregaTexto || '', isBlock: false
                });
            });

            if (actualizacionesPendientes.length > 0) {
                Promise.allSettled(actualizacionesPendientes).catch((error) => {
                    console.warn('No se pudieron guardar algunas citas enriquecidas:', error);
                });
            }

            if (window.tabActiva === 'agenda') {
                renderizarVistaSegunDispositivo();
            }
        }, (error) => {
            if (typeof window.mostrarErrorFirebase === 'function') window.mostrarErrorFirebase(error, 'Error al cargar citas de agenda');
            else console.error('Error al cargar citas de agenda', error);
        });

        // 2. Radar de Bloqueos y Vacaciones
        window.onSnapshot(window.collection(window.db, "bloqueos_agenda"), (querySnapshot) => {
            window.datosVacaciones = [];
            querySnapshot.forEach((doc) => {
                window.datosVacaciones.push({ id: doc.id, ...doc.data() });
            });
            if (window.tabActiva === 'agenda' && typeof window.dibujarCuadranteMes === 'function') window.dibujarCuadranteMes(); 
        }, (error) => {
            if (typeof window.mostrarErrorFirebase === 'function') window.mostrarErrorFirebase(error, 'Error al cargar bloqueos de agenda');
            else console.error('Error al cargar bloqueos de agenda', error);
        });

    } catch (error) {
        if (div) {
            div.innerHTML = `<div class="bg-red-50 p-10 rounded-xl shadow-sm border border-red-200 text-center"><p class="font-bold text-red-600 text-lg">Error de conexión en vivo</p></div>`;
        }
    }
};

    window.comprobarAtrasosGenerales = function() {
    let atrasados = [];
    let hoyLimpio = new Date();
    hoyLimpio.setHours(0, 0, 0, 0); 
    
    window.datosAgenda.forEach(cita => {
        if (!cita.fechaHora || cita.matricula === "---") return;

        let fechaCitaObj = window.normalizarFechaAgenda(cita.fechaHora);
        if (!fechaCitaObj || isNaN(fechaCitaObj.getTime())) return;

        let fechaCitaLimpia = new Date(fechaCitaObj);
        fechaCitaLimpia.setHours(0, 0, 0, 0);

        let fechaCitaPartes = [
            String(fechaCitaLimpia.getFullYear()),
            String(fechaCitaLimpia.getMonth() + 1).padStart(2, '0'),
            String(fechaCitaLimpia.getDate()).padStart(2, '0')
        ];
        
        let matCita = cita.matricula ? String(cita.matricula).replace(/\s/g, '').toUpperCase() : '';
        let basCita = cita.bastidor ? String(cita.bastidor).toUpperCase() : '';
        
        let cocheEnBaseDatos = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => 
            (c.B && String(c.B).replace(/\s/g, '').toUpperCase() === matCita) || 
            (c.A && String(c.A).toUpperCase() === basCita)
        ) : null;
        
        let yaEntregado = (cita.entregado === true || cita.entregado === "true") || (cocheEnBaseDatos && (cocheEnBaseDatos.entregado === true || cocheEnBaseDatos.entregado === "true"));
        
        if (fechaCitaLimpia < hoyLimpio && !yaEntregado) {
            let fechaCitaRaw = `${fechaCitaPartes[0]}-${fechaCitaPartes[1]}-${fechaCitaPartes[2]}`;
            let modeloSeguro = window.escapeJS(cita.modelo);
            
            atrasados.push(`<span class="cursor-pointer hover:underline text-red-700 hover:text-red-900 transition-colors inline-flex items-center gap-1" onclick="window.irACitaAtrasada('${fechaCitaRaw}')"><b>${cita.matricula || "S/M"}</b> - ${modeloSeguro} (${fechaCitaPartes[2]}/${fechaCitaPartes[1]}) <i class="ph-bold ph-arrow-square-out text-sm"></i></span>`);
        }
    });

    window.listaCitasAtrasadas = [...new Set(atrasados)];

    // 🔥 FILTRO DE ROL: Comprobamos si es Back Office
    let rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
    let esBackoffice = (rolLimpio === 'backoffice' || rolLimpio === 'administracion');

    // Solo mostramos la alerta si NO es Back Office
    if (window.listaCitasAtrasadas.length > 0 && !window.alertaAtrasosMostrada && !esBackoffice) {
        window.alertaAtrasosMostrada = true;
        setTimeout(() => { window.mostrarPopupAtrasados(); }, 2500); 
    }

    return window.listaCitasAtrasadas; 
};

window.mostrarPopupAtrasados = function() {
    // Doble candado de seguridad para silenciar el popup manualmente
    let rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
    if (rolLimpio === 'backoffice' || rolLimpio === 'administracion') return;

    if (!window.listaCitasAtrasadas || window.listaCitasAtrasadas.length === 0) return;
    Swal.fire({
        title: '⚠️ Entregas Pasadas',
        html: `<p class="mb-3 text-gray-600">Tienes <b>${window.listaCitasAtrasadas.length}</b> entrega(s) de días anteriores sin confirmar:</p>
               <div class="text-sm text-left bg-red-50 p-3 rounded-lg border border-red-200 max-h-40 overflow-y-auto custom-scrollbar">
                 <ul class="list-disc pl-5 space-y-2 text-red-900"><li>${window.listaCitasAtrasadas.join('</li><li>')}</li></ul>
               </div>
               <p class="mt-3 text-xs text-gray-500 font-bold">Haz clic en el enlace de cualquier coche para viajar hasta su fecha en el calendario.</p>`,
        icon: 'warning', confirmButtonColor: '#001e50', confirmButtonText: 'Entendido'
    });
};

    window.irACitaAtrasada = function(fechaStr) {
        Swal.close(); 
        let parts = fechaStr.split('-');
        let anio = parseInt(parts[0]);
        let mes = parseInt(parts[1]) - 1; 
        
        window.mesVistaActual = new Date(anio, mes, 1);
        window.fechaEnfoqueForzado = fechaStr;
        
        window.cambiarPestana('agenda'); 
        setTimeout(() => { window.fechaEnfoqueForzado = null; }, 1500);
    };

    window.obtenerConflictosAgenda = function() {
        const conflictosMap = {};

        (window.datosAgenda || []).forEach(cita => {
            if (!cita || !cita.fechaHora) return;
            const fecha = new Date(cita.fechaHora);
            if (isNaN(fecha.getTime())) return;

            const dateKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
            const horaKey = `${String(fecha.getHours()).padStart(2, '0')}:00`;
            const agente = String(cita.entregador || cita.agente || 'MANUEL').toUpperCase();
            const clave = (horaKey === '19:00') ? `${dateKey}|${horaKey}|UNICA` : `${dateKey}|${horaKey}|${agente}`;

            if (!conflictosMap[clave]) {
                conflictosMap[clave] = { dateKey, horaKey, agente: horaKey === '19:00' ? 'UNICA' : agente, citas: [] };
            }
            conflictosMap[clave].citas.push(cita);
        });

        return Object.values(conflictosMap).filter(item => item.citas.length > 1);
    };

    window.mostrarPopupConflictosAgenda = function() {
        const conflictos = window.obtenerConflictosAgenda();
        if (!conflictos.length) {
            Swal.fire({ icon: 'success', title: 'Sin conflictos', text: 'No hay solapes activos en la agenda.' });
            return;
        }

        const htmlLista = conflictos.map(item => {
            const fechaVisual = item.dateKey.split('-').reverse().join('/');
            const etiquetaAgente = item.agente === 'UNICA' ? 'HUECO UNICO 19:00' : item.agente;
            const listado = item.citas.map(c => `${c.matricula || 'S/M'} - ${c.modelo || 'Vehiculo'} - ${c.cliente || 'Cliente'}`).join('<br>');
            return `<div class="mb-3 p-3 rounded-lg border border-amber-300 bg-amber-50 text-left">
                        <p class="text-xs font-black text-amber-800 uppercase mb-1">${fechaVisual} ${item.horaKey} · ${etiquetaAgente}</p>
                        <p class="text-[11px] text-gray-700 leading-relaxed">${listado}</p>
                    </div>`;
        }).join('');

        Swal.fire({
            icon: 'warning',
            title: 'Conflictos de Agenda Detectados',
            width: '760px',
            html: `<div class="max-h-[50vh] overflow-y-auto custom-scrollbar">${htmlLista}</div>
                   <p class="text-xs text-gray-500 mt-2">Haz clic en cada cita del cuadrante para reubicarla o corregirla.</p>`,
            confirmButtonColor: '#001e50',
            confirmButtonText: 'Entendido'
        });
    };

    window.dibujarCuadranteMes = function() {
        let div = document.getElementById('contenedorAgenda');
        let agendaEstructurada = {};
        const horasLaborales = ['10', '11', '12', '13', '16', '17', '18', '19'];
        let rolAgenda = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
        let esBackoffice = (rolAgenda === 'backoffice' || rolAgenda === 'administracion' || rolAgenda === 'comercial');

        window.datosAgenda.forEach(cita => {
            if (!cita.fechaHora) return;
            let fecha = new Date(cita.fechaHora);
            if (isNaN(fecha.getTime())) return;
            let dateKey = fecha.getFullYear() + "-" + String(fecha.getMonth()+1).padStart(2,'0') + "-" + String(fecha.getDate()).padStart(2,'0');
            let horaStr = fecha.getHours().toString().padStart(2, '0');
            if (!agendaEstructurada[dateKey]) agendaEstructurada[dateKey] = {};
            if (!agendaEstructurada[dateKey][horaStr]) agendaEstructurada[dateKey][horaStr] = { MANUEL: [], ANTONIO: [] };
            let nombreAgente = (cita.entregador || cita.agente || "MANUEL").toUpperCase();
            if (!agendaEstructurada[dateKey][horaStr][nombreAgente]) agendaEstructurada[dateKey][horaStr][nombreAgente] = [];
            agendaEstructurada[dateKey][horaStr][nombreAgente].push(cita);
        });

        let anio = window.mesVistaActual.getFullYear();
        let mes = window.mesVistaActual.getMonth();
        let numDiasMes = new Date(anio, mes + 1, 0).getDate();
        let diasArrayKeys = [];
        
        for(let d = 1; d <= numDiasMes; d++) {
            let cur = new Date(anio, mes, d);
            if (cur.getDay() !== 0 && cur.getDay() !== 6) { 
                let key = cur.getFullYear() + "-" + String(cur.getMonth()+1).padStart(2,'0') + "-" + String(cur.getDate()).padStart(2,'0');
                diasArrayKeys.push(key);
            }
        }

        const nombresMeses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
        let tituloMes = `${nombresMeses[mes]} ${anio}`;
        let hoyObj = new Date();
        let hoyKeyLimpio = hoyObj.getFullYear() + "-" + String(hoyObj.getMonth()+1).padStart(2,'0') + "-" + String(hoyObj.getDate()).padStart(2,'0');

        let fechaObjetivo = window.fechaEnfoqueForzado || hoyKeyLimpio;
        let claveColumnaEnfoque = diasArrayKeys.find(k => k === fechaObjetivo) || diasArrayKeys.find(k => k > hoyKeyLimpio) || diasArrayKeys[0];

        let atrasados = window.comprobarAtrasosGenerales() || [];
        let bannerAtrasados = atrasados.length > 0 ? `<div onclick="window.mostrarPopupAtrasados()" class="bg-red-600 text-white text-[12px] font-black p-3 text-center cursor-pointer hover:bg-red-700 uppercase tracking-widest flex items-center justify-center gap-2 shadow-md z-20 border-b border-red-800"><i class="ph-bold ph-warning text-lg animate-pulse"></i> ¡Atención! Tienes ${atrasados.length} entrega(s) pasada(s) sin confirmar. Haz clic para revisarlas.</div>` : '';
        const conflictosAgenda = window.obtenerConflictosAgenda();
        let bannerConflictos = conflictosAgenda.length > 0
            ? `<div onclick="window.mostrarPopupConflictosAgenda()" class="bg-amber-500 text-amber-950 text-[12px] font-black p-3 text-center cursor-pointer hover:bg-amber-600 uppercase tracking-widest flex items-center justify-center gap-2 shadow-md z-20 border-b border-amber-700"><i class="ph-bold ph-warning-diamond text-lg"></i> Conflictos activos: ${conflictosAgenda.length}. Haz clic para revisar.</div>`
            : '';
        const urgentesCampa = (typeof window.obtenerPendientesPedirHoySiOSi === 'function') ? window.obtenerPendientesPedirHoySiOSi(3) : [];
        let bannerPedidosUrgentes = (!esBackoffice && urgentesCampa.length > 0)
            ? `<div onclick="window.abrirGestorPedidosCampa()" class="bg-[#00b0f0] text-[#001e50] text-[12px] font-black p-3 text-center cursor-pointer hover:bg-[#0097d1] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md z-20 border-b border-[#0086ba]"><i class="ph-bold ph-truck text-lg"></i> Pedidos obligatorios hoy: ${urgentesCampa.length} (citas en 3 días o menos). Haz clic para gestionar.</div>`
            : '';

        let botonPedidosCampa = esBackoffice ? '' : `
                   <button onclick="window.abrirGestorPedidosCampa()" class="bg-[#00b0f0] text-[#001e50] hover:bg-white px-4 py-1.5 rounded-lg font-black text-[10px] flex items-center gap-2 shadow-sm transition-colors uppercase tracking-widest">
                       <i class="ph-bold ph-truck text-base"></i> Pendientes de Pedir
                   </button>`;

        let html = `
        <div class="bg-white rounded-xl shadow-xl border border-[#001e50] flex flex-col h-[calc(100vh-140px)] w-full relative">
            <div class="bg-[#001e50] text-white p-3 px-6 flex justify-between items-center shrink-0 z-30">
               <h2 class="text-base font-black tracking-widest uppercase flex items-center gap-2"><i class="ph-bold ph-calendar-grid-week text-xl text-[#00b0f0]"></i> Cuadrante</h2>
               
               <div class="flex items-center gap-3">
                   ${botonPedidosCampa}
                   
                   <div class="relative w-64">
                       <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                       <input type="text" id="inputBusquedaAgenda" onkeyup="window.buscarEnAgenda()" placeholder="Buscar cliente, matrícula, modelo..." class="w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-[#00b0f0] transition-all">
                   </div>
               </div>
               
               <div class="flex items-center gap-4 bg-white/10 rounded-lg p-1.5 px-3 border border-white/20 shadow-sm backdrop-blur-sm">
                   <button onclick="window.cambiarMesAgenda(-1)" class="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded text-white"><i class="ph-bold ph-caret-left text-xl"></i></button>
                   <span class="font-black text-sm w-36 text-center tracking-widest">${tituloMes}</span>
                   <button onclick="window.cambiarMesAgenda(1)" class="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded text-white"><i class="ph-bold ph-caret-right text-xl"></i></button>
               </div>
               <div class="flex gap-4 text-xs font-bold">
                  <span class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 bg-[#c9daf8] rounded-full border border-blue-300"></div> MANUEL</span>
                  <span class="flex items-center gap-1.5"><div class="w-3.5 h-3.5 bg-[#f9cb9c] rounded-full border border-orange-300"></div> ANTONIO</span>
               </div>
            </div>
            
            ${bannerAtrasados}
                        ${bannerPedidosUrgentes}
                        ${bannerConflictos}

            <div id="scrollContainerAgenda" class="overflow-auto flex-1 custom-scrollbar relative scroll-smooth">
              <table class="w-full text-left border-collapse min-w-max">
                <thead class="sticky top-0 z-20 shadow-md">
                  <tr>
                    <th class="p-3 border-b-2 border-r-2 border-gray-200 bg-gray-100 text-center w-24 sticky left-0 z-30"><i class="ph-bold ph-clock text-2xl text-gray-400"></i></th>
                    ${diasArrayKeys.map(dateKey => {
                        let parts = dateKey.split('-');
                        let fObj = new Date(parts[0], parts[1]-1, parts[2]);
                        let diaSemana = fObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
                        let diaNum = String(fObj.getDate()).padStart(2, '0');
                        let isToday = (dateKey === hoyKeyLimpio);
                        let esDiaEnfoque = (dateKey === claveColumnaEnfoque);
                        
                        let idHover = esDiaEnfoque ? 'id="colDiaHoy"' : '';
                        let bgClass = isToday ? 'bg-blue-100 text-[#001e50]' : (esDiaEnfoque ? 'bg-blue-50/40 text-[#001e50]' : 'bg-white text-[#001e50]');
                        
                        return `<th ${idHover} class="p-2 border-b-2 border-r border-gray-200 ${bgClass} text-center min-w-[240px]">
                                  <div class="font-black text-sm">${diaSemana}</div><div class="text-3xl font-black">${diaNum}</div>
                                </th>`;
                    }).join('')}
                  </tr>
                </thead>
                <tbody>`;

        horasLaborales.forEach(hora => {
            html += `<tr><td class="p-3 border-b border-r-2 border-gray-200 bg-gray-50 text-center font-black text-gray-500 text-xl align-top pt-4 sticky left-0 z-10">${hora}:00</td>`;
            diasArrayKeys.forEach(dateKey => {
                let bgTd = (dateKey === hoyKeyLimpio) ? 'bg-blue-50/20' : 'bg-white';
                html += `<td class="p-2.5 border-b border-r border-gray-100 align-top ${bgTd} hover:bg-gray-50"><div class="flex flex-col gap-2 h-full">`;
                
                let cM = agendaEstructurada[dateKey] && agendaEstructurada[dateKey][hora] ? (agendaEstructurada[dateKey][hora].MANUEL || []) : [];
                let cA = agendaEstructurada[dateKey] && agendaEstructurada[dateKey][hora] ? (agendaEstructurada[dateKey][hora].ANTONIO || []) : [];

                function obtenerBloqueo(agenteAbuscar) {
                    if (!window.datosVacaciones) return null;
                    return window.datosVacaciones.find(b => {
                        const agenteBloqueado = b.operarioAfectado || b.agente || 'AMBOS';
                        const tipoBloqueo = b.tipo || 'vacaciones';

                        if (agenteBloqueado !== agenteAbuscar && agenteBloqueado !== 'AMBOS') return false;

                        if (tipoBloqueo === 'dia_completo' || tipoBloqueo === 'vacaciones') {
                            const inicio = b.fechaInicio || b.fecha;
                            const fin = b.fechaFin || b.fechaInicio || b.fecha;
                            return !!inicio && dateKey >= inicio && dateKey <= fin;
                        }

                        if (tipoBloqueo === 'hora_suelta') {
                            const fechaBloqueo = b.fecha || b.fechaInicio;
                            if (fechaBloqueo !== dateKey) return false;

                            const horaCelda = hora + ':00';
                            if (b.hora) return b.hora === horaCelda;

                            if (b.horaInicio && b.horaFin) {
                                return horaCelda >= b.horaInicio && horaCelda <= b.horaFin;
                            }
                        }

                        return false;
                    });
                }

                let bloqueoM = obtenerBloqueo('MANUEL');
                let bloqueoA = obtenerBloqueo('ANTONIO');

                if (bloqueoM) cM = [{ isBlock: true, idBloqueo: bloqueoM.id, modelo: bloqueoM.motivo.toUpperCase(), cliente: "AGENDA CERRADA", matricula: "---", bastidor: "", renting: "" }];
                if (bloqueoA) cA = [{ isBlock: true, idBloqueo: bloqueoA.id, modelo: bloqueoA.motivo.toUpperCase(), cliente: "AGENDA CERRADA", matricula: "---", bastidor: "", renting: "" }];

                let isVacM = !!bloqueoM; 
                let isVacA = !!bloqueoA;

                const renderizarListaCitas = function(lista, agente, bg, textClass, border, unico) {
                    if (!lista || lista.length === 0) {
                        return window.renderizarCeldaCita(null, agente, '#f3f4f6', 'text-gray-400', 'border-gray-300', unico);
                    }
                    
                    // 🔥 NUEVA LÓGICA: Si hay más de 1 vehículo (y no es un bloqueo), mostramos la tarjeta resumen
                    if (lista.length > 1 && !lista[0].isBlock) {
                        const idsStr = lista.map(c => c.id).join(',');
                        const altura = unico ? "min-h-[220px]" : "min-h-[140px]";
                        const borderColorClass = agente === 'ANTONIO' ? 'border-orange-400' : 'border-blue-400';
                        const textColorClass = agente === 'ANTONIO' ? 'text-orange-900' : 'text-blue-900';
                        const bgColorHex = agente === 'ANTONIO' ? '#ffedd5' : '#e0e7ff';
                        
                        return `
                        <div onclick="window.verEntregaConjunta('${idsStr}', '${agente}')" class="cita-tarjeta flex-1 rounded-lg p-3 border-2 border-dashed ${borderColorClass} flex flex-col justify-center items-center cursor-pointer hover:scale-[1.02] transition-transform shadow-sm ${altura}" style="background-color: ${bgColorHex};">
                            <div class="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-1 rounded mb-2 border border-purple-300 uppercase tracking-widest animate-pulse flex items-center gap-1 shadow-sm"><i class="ph-bold ph-stack"></i> Conjunta</div>
                            <div class="text-3xl font-black ${textColorClass} mb-1">${lista.length}</div>
                            <div class="text-[10px] font-bold ${textColorClass} uppercase tracking-widest mb-3">Vehículos</div>
                            <button class="bg-[#001e50] text-white text-[10px] font-black py-1.5 px-4 rounded shadow-sm hover:bg-blue-900 uppercase tracking-widest flex items-center gap-1"><i class="ph-bold ph-eye"></i> Ver Grupo</button>
                        </div>`;
                    }
                    
                    // Si solo hay 1, se pinta la tarjeta normal
                    return lista.map((item) => {
                        const citaConMeta = (lista.length > 1 && !item.isBlock) ? { ...item, _slotConflictCount: lista.length } : item;
                        return window.renderizarCeldaCita(citaConMeta, agente, bg, textClass, border, unico);
                    }).join('');
                };

                if (hora === '19') {
                    let citasAntonioReales = agendaEstructurada[dateKey] && agendaEstructurada[dateKey][hora] ? (agendaEstructurada[dateKey][hora].ANTONIO || []) : [];
                    const listaUnica = [...(cM || []), ...citasAntonioReales];
                    
                    if (listaUnica.length > 1 && !listaUnica[0].isBlock) {
                        const idsStr = listaUnica.map(c => c.id).join(',');
                        html += `
                        <div onclick="window.verEntregaConjunta('${idsStr}', 'MANUEL')" class="cita-tarjeta flex-1 rounded-lg p-3 border-2 border-dashed border-purple-400 flex flex-col justify-center items-center cursor-pointer hover:scale-[1.02] transition-transform shadow-sm min-h-[220px]" style="background-color: #f3e8ff;">
                            <div class="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-1 rounded mb-2 border border-purple-300 uppercase tracking-widest animate-pulse flex items-center gap-1 shadow-sm"><i class="ph-bold ph-stack"></i> Conjunta</div>
                            <div class="text-3xl font-black text-purple-900 mb-1">${listaUnica.length}</div>
                            <div class="text-[10px] font-bold text-purple-800 uppercase tracking-widest mb-3">Vehículos</div>
                            <button class="bg-[#001e50] text-white text-[10px] font-black py-1.5 px-4 rounded shadow-sm hover:bg-blue-900 uppercase tracking-widest flex items-center gap-1"><i class="ph-bold ph-eye"></i> Ver Grupo</button>
                        </div>`;
                    } else if (listaUnica.length === 1) {
                        html += listaUnica.map((item) => {
                            const agenteReal = item.isBlock ? 'MANUEL' : String(item.entregador || item.agente || 'MANUEL').toUpperCase();
                            const esAntonio = agenteReal === 'ANTONIO';
                            const bgBase = esAntonio ? '#f9cb9c' : '#c9daf8';
                            const txtBase = esAntonio ? 'text-orange-900' : 'text-blue-900';
                            const borderBase = esAntonio ? 'border-orange-300' : 'border-blue-200';
                            return window.renderizarCeldaCita(item, agenteReal, item.isBlock ? '#e5e7eb' : bgBase, item.isBlock ? 'text-gray-500' : txtBase, item.isBlock ? 'border-gray-300' : borderBase, true);
                        }).join('');
                    } else {
                        html += window.renderizarCeldaCita(null, 'UNICA ENTREGA', '#f3f4f6', 'text-gray-400', 'border-gray-300', true);
                    }
                } else {
                    html += renderizarListaCitas(cM, 'MANUEL', isVacM ? '#e5e7eb' : '#c9daf8', isVacM ? 'text-gray-500' : 'text-blue-900', isVacM ? 'border-gray-300' : 'border-blue-200', false);
                    html += renderizarListaCitas(cA, 'ANTONIO', isVacA ? '#e5e7eb' : '#f9cb9c', isVacA ? 'text-gray-500' : 'text-orange-900', isVacA ? 'border-gray-300' : 'border-orange-300', false);
                }
                html += `</div></td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div></div>`;
        div.innerHTML = html;

        let intentosScroll = 0;
        let motorScroll = setInterval(() => {
            let contenedor = document.getElementById('scrollContainerAgenda');
            let columnaHoy = document.getElementById('colDiaHoy');
            if (contenedor && columnaHoy && contenedor.scrollWidth > 100) {
                contenedor.scrollLeft = Math.max(0, columnaHoy.offsetLeft - 80); 
                clearInterval(motorScroll);
            }
            intentosScroll++;
            if (intentosScroll > 20) clearInterval(motorScroll); 
        }, 100);
    };

    window.cambiarMesAgenda = function(delta) {
        window.mesVistaActual.setMonth(window.mesVistaActual.getMonth() + delta);
        window.dibujarCuadranteMes();
    }

    // Buscador de la Agenda
    window.buscarEnAgenda = function() {
        let texto = document.getElementById('inputBusquedaAgenda').value.toLowerCase().trim();
        let tarjetas = document.querySelectorAll('.cita-tarjeta');
        
        let primeraCoincidencia = null; 
        
        tarjetas.forEach(t => {
            if (texto === '') {
                t.style.opacity = '1'; t.style.filter = 'none'; t.style.boxShadow = 'none'; t.style.transform = 'scale(1)';
            } else if (t.innerText.toLowerCase().includes(texto)) {
                t.style.opacity = '1'; t.style.filter = 'none'; t.style.boxShadow = '0 0 12px rgba(0, 176, 240, 0.9)'; t.style.transform = 'scale(1.02)';
                if (!primeraCoincidencia) {
                    primeraCoincidencia = t;
                }
            } else {
                t.style.opacity = '0.15'; t.style.filter = 'grayscale(100%)'; t.style.boxShadow = 'none'; t.style.transform = 'scale(1)';
            }
        });

        if (texto !== '' && primeraCoincidencia) {
            primeraCoincidencia.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center',    
                inline: 'center'    
            });
        }
    };

window.verEntregaConjunta = function(idsStr, agenteUI) {
        if (!idsStr) return;
        const ids = idsStr.split(',');
        const citasGrupo = (window.datosAgenda || []).filter(c => ids.includes(c.id));
        
        if (citasGrupo.length === 0) return;
        
        let htmlCitas = citasGrupo.map(cita => {
            const agenteCita = String(cita.entregador || cita.agente || 'MANUEL').toUpperCase();
            const esAntonio = agenteCita === 'ANTONIO';
            const bgBase = esAntonio ? '#f9cb9c' : '#c9daf8';
            const txtBase = esAntonio ? 'text-orange-900' : 'text-blue-900';
            const borderBase = esAntonio ? 'border-orange-300' : 'border-blue-200';
            
            // Usamos false para que las tarjetas salgan en formato compacto dentro del popup
            return `<div class="mb-3 w-full text-left">${window.renderizarCeldaCita(cita, agenteCita, bgBase, txtBase, borderBase, false)}</div>`;
        }).join('');
        
        Swal.fire({
            title: 'ENTREGA CONJUNTA',
            html: `
                <p class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3 text-center">Gestión de ${citasGrupo.length} vehículos</p>
                <div class="max-h-[60vh] overflow-y-auto custom-scrollbar p-1 flex flex-col gap-2">
                    ${htmlCitas}
                </div>
            `,
            width: '450px',
            showConfirmButton: false,
            showCloseButton: true,
            background: '#f8fafc'
        });
    };

   window.renderizarCeldaCita = function(cita, nombreAgente, bgColor, textColor, borderColor, esUnico) {
    let alturaClase = esUnico ? "min-h-[220px]" : "min-h-[140px]";
    
    if (!cita) {
        return `<div class="cita-tarjeta flex-1 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 p-2 flex items-center justify-center ${alturaClase} opacity-60">
                   <span class="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">Libre</span>
                </div>`;
    }
    
    let matCita = cita.matricula ? String(cita.matricula).replace(/\s/g, '').toUpperCase() : '';
    let basCita = cita.bastidor ? String(cita.bastidor).toUpperCase() : '';
    
    let cocheEnBaseDatos = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => 
        (matCita.length > 4 && matCita !== 'S/M' && c.B && String(c.B).replace(/\s/g, '').toUpperCase() === matCita) || 
        (basCita.length > 5 && basCita !== 'N/A' && c.A && String(c.A).toUpperCase() === basCita)
    ) : null;
    
    let citaMarcadaEntregada = (cita.entregado === true || cita.entregado === "true");
    let yaEntregado = citaMarcadaEntregada || (cocheEnBaseDatos && (cocheEnBaseDatos.entregado === true || cocheEnBaseDatos.entregado === "true"));
    let estaRetenido = cocheEnBaseDatos && !yaEntregado && ((cocheEnBaseDatos.enTaller && !cocheEnBaseDatos.finTaller) || (cocheEnBaseDatos.enRecambios && !cocheEnBaseDatos.finRecambios));
    
    let ahora = new Date();
    let fechaCitaObj = cita.fechaHora ? new Date(cita.fechaHora) : ahora;
    let esPasada = fechaCitaObj < ahora;
    let alertaVisual = '';
    
    let esPendiente = cita.estado === 'pendiente';
    let tagPendiente = esPendiente ? `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1 animate-pulse"><i class="ph-bold ph-hourglass"></i> PENDIENTE</span>` : '';
    
    let rolUsuarioLogueado = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');

    if (esPendiente) {
        bgColor = '#fffbeb'; textColor = 'text-amber-800'; borderColor = 'border-amber-400 border-2 border-dashed'; 
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Pendiente de Confirmar"><i class="ph-bold ph-hourglass text-sm"></i></div>`;
    } else if (yaEntregado) {
        bgColor = '#dcfce7'; textColor = 'text-emerald-900'; borderColor = 'border-emerald-400 border-2'; 
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10" title="Vehículo Entregado"><i class="ph-bold ph-check text-sm"></i></div>`;
    } else if (esPasada && !yaEntregado && cita.matricula !== "---" && !cita.isBlock) {
        let diaStr = fechaCitaObj.toLocaleDateString('es-ES');
        let horaStr = fechaCitaObj.getHours() + ":00h";
        let idFb = cocheEnBaseDatos ? cocheEnBaseDatos.fila : 'no_db';
        let modeloSeguro = window.escapeJS(cita.modelo); let matriculaSegura = window.escapeJS(cita.matricula);
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-[#00b0f0] text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce cursor-pointer z-10" onclick="if(window.event) window.event.stopPropagation(); window.preguntarSiEntregado('${idFb}', '${modeloSeguro}', '${matriculaSegura}', '${diaStr}', '${horaStr}', '${cita.id || ''}')"><i class="ph-bold ph-question text-lg"></i></div>`;
        borderColor = "border-[#00b0f0] border-2"; 
    } else if (estaRetenido && cita.matricula !== "---" && !cita.isBlock) {
        let escMat = window.escapeJS(cita.matricula); let escMod = window.escapeJS(cita.modelo);
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse cursor-pointer z-10" onclick="if(window.event) window.event.stopPropagation(); window.comprobarAlertaEntrega('${escMat}', '${escMod}')"><i class="ph-bold ph-warning"></i></div>`;
    }

    let textoVO = (cita.entregaVO) ? String(cita.entregaVO).toUpperCase().trim() : '';
    let tagVO = (textoVO === 'SÍ' || textoVO === 'SI') ? `<span class="bg-purple-200 text-purple-900 border border-purple-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest"><i class="ph-bold ph-car-profile"></i> VO</span>` : '';
    let tagNotas = cita.notas ? `<span class="bg-yellow-200 text-yellow-900 border border-yellow-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1" title="${window.escapeJS(cita.notas)}"><i class="ph-bold ph-note"></i> NOTAS</span>` : '';
    let tagConflicto = (Number(cita._slotConflictCount || 0) > 1)
        ? `<span class="bg-red-200 text-red-900 border border-red-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1"><i class="ph-bold ph-warning"></i> SOLAPE (${cita._slotConflictCount})</span>`
        : '';
    
    // 🔥 NUEVA ETIQUETA: Identifica visualmente si el coche ya está pedido a la campa
    let tagPedido = (cocheEnBaseDatos && cocheEnBaseDatos.cochePedido) ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1" title="Pedido a Campa"><i class="ph-bold ph-truck"></i> PEDIDO</span>` : '';
    
    let opacidad = "opacity-100"; let onclickCode = ""; let cursorClass = "";
    
   if (cita.isBlock) {
        if (rolUsuarioLogueado === 'backoffice' || rolUsuarioLogueado === 'administracion' || rolUsuarioLogueado === 'comercial') {
            cursorClass = "cursor-default";
        } else {
            onclickCode = `onclick="window.borrarBloqueo('${cita.idBloqueo}')"`;
            cursorClass = "cursor-pointer hover:ring-2 hover:ring-red-500 hover:scale-[1.02] shadow-sm";
        }
    } 
    else if (cita.id && cita.matricula !== "---") {
        let d = fechaCitaObj.getFullYear() + "-" + String(fechaCitaObj.getMonth()+1).padStart(2,'0') + "-" + String(fechaCitaObj.getDate()).padStart(2,'0');
        let h = String(fechaCitaObj.getHours()).padStart(2,'0') + ":00";
        let escCliente = window.escapeJS(cita.cliente); let escTlf = window.escapeJS(cita.telefono);
        let escEmail = window.escapeJS(cita.email); let escVO = window.escapeJS(cita.entregaVO);
        let escMod = window.escapeJS(cita.modelo); let escMat = window.escapeJS(cita.matricula);
        let escBas = window.escapeJS(cita.bastidor || '');
        let escRen = window.escapeJS(cita.renting); let escNotas = window.escapeJS(cita.notas);
        
        if (rolUsuarioLogueado === 'backoffice' || rolUsuarioLogueado === 'administracion') {
            onclickCode = `onclick="window.abrirNotasCitaBackoffice('${cita.id}', '${d}', '${h}', '${nombreAgente}', '${escCliente}', '${escMod}', '${escMat}', '${escBas}', '${escTlf}', '${escEmail}', '${escVO}', '${escRen}', '${escNotas}')"`;
            cursorClass = "cursor-pointer hover:ring-2 hover:ring-[#00b0f0] hover:scale-[1.02] shadow-sm";
        } else {
            onclickCode = `onclick="window.abrirEdicionCita('${cita.id}', '${d}', '${h}', '${nombreAgente}', '${escCliente}', '${escMat}', '${escTlf}', '${escEmail}', '${escVO}', '${escNotas}')"`;
            cursorClass = "cursor-pointer hover:ring-2 hover:ring-[#00b0f0] hover:scale-[1.02] shadow-sm";
        }
    }

    let botonesAprobacion = "";
    if (esPendiente && (rolUsuarioLogueado === 'entregas' || rolUsuarioLogueado === 'admin') && rolUsuarioLogueado !== 'comercial') {
        botonesAprobacion = `
        <div class="flex gap-2 mt-2 pt-2 border-t border-amber-200" onclick="if(window.event) window.event.stopPropagation();">
            <button onclick="window.aprobarCitaPendiente('${cita.id}', '${matCita}')" class="flex-1 bg-emerald-500 text-white text-[10px] font-black py-1 rounded shadow-sm hover:bg-emerald-600 transition-colors pointer-events-auto"><i class="ph-bold ph-check"></i> ACEPTAR</button>
            <button onclick="window.rechazarCitaPendiente('${cita.id}', '${window.escapeJS(cita.modelo)}')" class="flex-1 bg-red-500 text-white text-[10px] font-black py-1 rounded shadow-sm hover:bg-red-600 transition-colors pointer-events-auto"><i class="ph-bold ph-x"></i> RECHAZAR</button>
        </div>`;
    }

    return `
    <div ${onclickCode} class="cita-tarjeta flex-1 rounded-lg p-2.5 relative border ${alturaClase} ${opacidad} flex flex-col justify-between transition-all ${cursorClass} ${borderColor}" style="background-color: ${bgColor};">
       ${alertaVisual}
       <div>
         <div class="flex justify-between items-start mb-1 gap-1">
           <h4 class="font-black text-[11px] ${textColor} uppercase leading-tight line-clamp-1 flex-1">${cita.modelo}</h4>
                     <div class="flex items-center flex-wrap justify-end">${tagVO} ${tagPendiente} ${tagNotas} ${tagPedido} ${tagConflicto}</div>
         </div>
         <div class="flex items-center gap-1.5 mb-1 flex-wrap">
            <p class="font-bold text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-gray-900 tracking-widest">${cita.matricula}</p>
            <p class="font-mono text-[9px] text-gray-500 bg-white/50 px-1 py-0.5 rounded border border-gray-200">VIN: ${cita.bastidor || 'S/M'}</p>
         </div>
       </div>
       <div class="mt-1 text-[9px] font-bold ${textColor} leading-tight border-t border-black/10 pt-1.5 space-y-1">
          <p class="truncate uppercase flex items-center gap-1" title="${cita.cliente}"><i class="ph-fill ph-user text-xs"></i> ${cita.cliente}</p>
          ${cita.telefono ? `<p class="truncate flex items-center gap-1" title="${cita.telefono}"><i class="ph-fill ph-phone text-xs"></i> ${cita.telefono}</p>` : ''}
          ${cita.email ? `<p class="truncate flex items-center gap-1" title="${cita.email}"><i class="ph-fill ph-envelope text-xs"></i> ${cita.email}</p>` : ''}
          ${cita.renting ? `<p class="truncate uppercase flex items-center gap-1" title="${cita.renting}"><i class="ph-fill ph-buildings text-xs"></i> ${cita.renting}</p>` : ''}
       </div>
       ${botonesAprobacion}
    </div>`;
};
    window.abrirNotasCitaBackoffice = async function(idCita, fecha, hora, agente, cliente, modelo, matricula, bastidor, telefono, email, vo, renting, notasActuales) {
        const { value: nuevasNotas } = await Swal.fire({
            title: 'Detalle de Cita (Back Office)',
            width: '620px',
            html: `
                <div class="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 space-y-1">
                    <p><b>Cliente:</b> ${cliente || '-'}</p>
                    <p><b>Modelo:</b> ${modelo || '-'}</p>
                    <p><b>Matrícula:</b> ${matricula || '-'}</p>
                    <p><b>Bastidor:</b> ${bastidor || '-'}</p>
                    <p><b>Fecha/Hora:</b> ${fecha || '-'} ${hora || ''}</p>
                    <p><b>Agente:</b> ${agente || '-'}</p>
                    <p><b>Teléfono:</b> ${telefono || '-'}</p>
                    <p><b>Email:</b> ${email || '-'}</p>
                    <p><b>V.O.:</b> ${vo || 'NO'}</p>
                    <p><b>Renting:</b> ${renting || '-'}</p>
                </div>
                <div class="text-left mt-3">
                    <label class="text-xs font-bold text-gray-500 uppercase">Notas</label>
                    <textarea id="bo-notas-cita" class="swal2-textarea !w-full !m-0 !mt-1 text-sm p-3" style="min-height:100px;" placeholder="Escribe una nota para esta cita...">${notasActuales && notasActuales !== 'undefined' ? notasActuales : ''}</textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#001e50',
            confirmButtonText: 'Guardar Nota',
            cancelButtonText: 'Cerrar',
            preConfirm: () => document.getElementById('bo-notas-cita').value.trim()
        });

        if (typeof nuevasNotas === 'string') {
            try {
                await window.updateDoc(window.doc(window.db, "citas_agenda", idCita), {
                    notas: nuevasNotas,
                    notaEditadaPor: window.usuarioActivo || 'BACKOFFICE',
                    notaEditadaTs: new Date().getTime()
                });

                try {
                    const matLimpia = String(matricula || '').replace(/\s/g, '').toUpperCase();
                    const basLimpio = String(bastidor || '').replace(/\s/g, '').toUpperCase();
                    const cocheVinculado = (typeof todosLosCoches !== 'undefined' ? todosLosCoches : []).find(c => {
                        const matVeh = String(c.B || c.matricula || c.Matricula || '').replace(/\s/g, '').toUpperCase();
                        const basVeh = String(c.A || c.bastidor || '').replace(/\s/g, '').toUpperCase();
                        return (matLimpia && matVeh && matVeh === matLimpia) || (basLimpio && basVeh && basVeh === basLimpio);
                    });

                    if (cocheVinculado && cocheVinculado.fila) {
                        await window.updateDoc(window.doc(window.db, "vehiculos", cocheVinculado.fila), {
                            notaAgenda: nuevasNotas,
                            notaAgendaEditadaPor: window.usuarioActivo || 'BACKOFFICE',
                            notaAgendaTs: new Date().getTime()
                        });
                    }
                } catch (eSync) {
                    console.warn('Aviso: no se pudo sincronizar nota en vehículo vinculado', eSync);
                }

                Swal.fire('Guardado', 'Nota actualizada correctamente.', 'success');
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo guardar la nota.', 'error');
            }
        }
    };
    window.abrirEdicionCita = async function(idCita, fechaActual, horaActual, agenteActual, cliente, matricula, telefono, email, vo, notas) {
        const { value: formValues, isDenied } = await Swal.fire({
            title: 'Gestionar Cita',
            width: '700px',
            html: `
                <div class="text-left text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><i class="ph-bold ph-pencil-simple"></i> Datos del Cliente (Editables)</div>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 space-y-4 text-left">
                    
                    <div class="w-full">
                        <label class="text-[10px] uppercase font-bold text-gray-400">Nombre Completo</label>
                        <input id="e-cliente" class="swal2-input !w-full !m-0 !h-11 text-sm font-bold px-3" value="${cliente || ''}">
                    </div>
                    
                    <div class="flex gap-3">
                        <div class="flex-[2]">
                            <label class="text-[10px] uppercase font-bold text-gray-400">Email</label>
                            <input id="e-email" type="email" class="swal2-input !w-full !m-0 !h-11 text-sm font-bold px-3" value="${email || ''}">
                        </div>
                        <div class="flex-1">
                            <label class="text-[10px] uppercase font-bold text-gray-400">Teléfono</label>
                            <input id="e-telefono" type="tel" class="swal2-input !w-full !m-0 !h-11 text-sm font-bold px-3" value="${telefono || ''}">
                        </div>
                        <div class="flex-1">
                            <label class="text-[10px] uppercase font-bold text-gray-400">V.O.</label>
                            <select id="e-vo" class="swal2-select !w-full !m-0 !h-11 text-sm font-bold px-3">
                                <option value="NO" ${vo === 'NO' ? 'selected' : ''}>NO</option>
                                <option value="SI" ${vo === 'SI' || vo === 'SÍ' ? 'selected' : ''}>SÍ</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="text-left text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><i class="ph-bold ph-calendar"></i> Detalles de la Cita</div>
                <div class="flex gap-3 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="flex-1 text-left">
                        <label class="text-[10px] uppercase font-bold text-gray-400">Fecha</label>
                        <input type="date" id="e-fecha" class="swal2-input !w-full !m-0 !h-11 text-sm font-bold px-3" value="${fechaActual}">
                    </div>
                    <div class="flex-1 text-left">
                        <label class="text-[10px] uppercase font-bold text-gray-400">Hora</label>
                        <select id="e-hora" class="swal2-select !w-full !m-0 !h-11 text-sm font-bold px-3">
                            <option value="10:00" ${horaActual === '10:00' ? 'selected' : ''}>10:00</option>
                            <option value="11:00" ${horaActual === '11:00' ? 'selected' : ''}>11:00</option>
                            <option value="12:00" ${horaActual === '12:00' ? 'selected' : ''}>12:00</option>
                            <option value="13:00" ${horaActual === '13:00' ? 'selected' : ''}>13:00</option>
                            <option value="16:00" ${horaActual === '16:00' ? 'selected' : ''}>16:00</option>
                            <option value="17:00" ${horaActual === '17:00' ? 'selected' : ''}>17:00</option>
                            <option value="18:00" ${horaActual === '18:00' ? 'selected' : ''}>18:00</option>
                            <option value="19:00" ${horaActual === '19:00' ? 'selected' : ''}>19:00</option>
                        </select>
                    </div>
                    <div class="flex-1 text-left">
                        <label class="text-[10px] uppercase font-bold text-gray-400">Agente</label>
                        <select id="e-agente" class="swal2-select !w-full !m-0 !h-11 text-sm font-bold px-3">
                            <option value="MANUEL" ${agenteActual === 'MANUEL' ? 'selected' : ''}>MANUEL</option>
                            <option value="ANTONIO" ${agenteActual === 'ANTONIO' ? 'selected' : ''}>ANTONIO</option>
                        </select>
                    </div>
                </div>
                
                <div class="text-left">
                    <label class="text-[10px] uppercase font-bold text-gray-500 mb-1 flex items-center gap-1"><i class="ph-bold ph-note"></i> Notas (Opcional)</label>
                    <textarea id="e-notas" class="swal2-textarea !w-full !m-0 text-sm p-4" style="min-height: 80px;" placeholder="Detalles, retrasos, avisos...">${notas && notas !== 'undefined' ? notas : ''}</textarea>
                </div>
                <div class="mt-4 text-left flex items-center gap-2 bg-purple-50/50 p-3 rounded-lg border border-purple-200 select-none">
                    <input type="checkbox" id="e-conjunta" class="w-4 h-4 accent-purple-600 cursor-pointer">
                    <label for="e-conjunta" class="text-xs font-black text-purple-900 cursor-pointer uppercase tracking-wider">Forzar entrega conjunta (Permitir solapes)</label>
                </div>
            `,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#001e50',
            denyButtonColor: '#ef4444',
            confirmButtonText: 'Guardar',
            denyButtonText: '🗑️ Eliminar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const f = document.getElementById('e-fecha').value;
                const h = document.getElementById('e-hora').value;
                const a = document.getElementById('e-agente').value;
                const c = document.getElementById('e-cliente').value.toUpperCase().trim();
                const t = document.getElementById('e-telefono').value.trim();
                const em = document.getElementById('e-email').value.trim();
                const v = document.getElementById('e-vo').value;
                const n = document.getElementById('e-notas').value.trim();
                
                if (!f) return Swal.showValidationMessage('La fecha es obligatoria');
                if (!c) return Swal.showValidationMessage('El cliente es obligatorio');
                if (h === '19:00' && a === 'ANTONIO') {
                    return Swal.showValidationMessage('A las 19:00h solo Manuel realiza entregas. Reasigna la cita a MANUEL o cambia la hora.');
                }
                const conflictoEdicion = (window.datosAgenda || []).find(cita => {
                    if (!cita || !cita.id || cita.id === idCita || !cita.fechaHora) return false;
                    const fechaCita = new Date(cita.fechaHora);
                    if (isNaN(fechaCita.getTime())) return false;

                    const fechaCitaKey = `${fechaCita.getFullYear()}-${String(fechaCita.getMonth() + 1).padStart(2, '0')}-${String(fechaCita.getDate()).padStart(2, '0')}`;
                    const horaCitaKey = `${String(fechaCita.getHours()).padStart(2, '0')}:00`;
                    const agenteCita = String(cita.entregador || cita.agente || 'MANUEL').toUpperCase();
                    const mismaFechaHora = (fechaCitaKey === f && horaCitaKey === h);

                    if (!mismaFechaHora) return false;
                    if (h === '19:00') return true;

                    return agenteCita === a;
                });

                const forzarConjunta = document.getElementById('e-conjunta') ? document.getElementById('e-conjunta').checked : false;

                if (conflictoEdicion && !forzarConjunta) {
                    if(typeof window.registrarMetricaM2 === 'function') window.registrarMetricaM2('choques_agenda_evitados');
                    const vehiculoConflicto = conflictoEdicion.matricula || conflictoEdicion.modelo || 'otra cita';
                    return Swal.showValidationMessage(`Ese hueco ya está ocupado por ${vehiculoConflicto}. Elige otra hora, o marca "Forzar entrega conjunta".`);
                }
                
                return { fecha: f, hora: h, agente: a, cliente: c, telefono: t, email: em, entregaVO: v, notas: n };
            }
        });

        let tlfLimpio = telefono ? String(telefono).replace(/\s/g, '').replace(/^\+?34/, '') : '';
        let urlWhatsAppBase = tlfLimpio ? `https://wa.me/34${tlfLimpio}?text=` : null;

       if (isDenied) {
        Swal.fire({ title: '¿Seguro?', text: "La cita se borrará.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, Borrar' }).then(async (res) => {
            if (res.isConfirmed) {
                Swal.fire({title: 'Borrando...', didOpen: () => Swal.showLoading()});
                try {
                    // 1. Borramos la cita
                    await window.deleteDoc(window.doc(window.db, "citas_agenda", idCita));
                    
                    // 2. Quitamos la fecha del coche
                    try {
                        let coche = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => c.B && c.B.replace(/\s/g,'') === matricula.replace(/\s/g,'')) : null;
                        if (coche) await window.updateDoc(window.doc(window.db, "vehiculos", coche.fila), { fechaCita: null });
                    } catch (errCoche) {}

                    // 3. Avisamos por WhatsApp
                    if (urlWhatsAppBase) {
                        Swal.fire({ title: 'Cita Eliminada', text: '¿Avisar al cliente por WhatsApp?', icon: 'info', showCancelButton: true, confirmButtonColor: '#25D366', confirmButtonText: 'Sí, avisar' }).then((waRes) => {
                            if (waRes.isConfirmed) {
                                let fAntigua = fechaActual.split('-').reverse().join('/');
                                window.open(urlWhatsAppBase + encodeURIComponent(`Hola ${cliente}, te informamos que por motivos logísticos tu cita prevista para el ${fAntigua} a las ${horaActual}h ha sido anulada. Contactaremos contigo.`), '_blank');
                            }
                        });
                    } else { 
                        Swal.fire('Eliminada', 'La cita ha sido borrada.', 'success'); 
                    }
                } catch (errorGeneral) { 
                    Swal.fire('Error', 'No se pudo eliminar.', 'error'); 
                }
            }
        });
    } else if (formValues) {
        Swal.fire({title: 'Actualizando...', didOpen: () => Swal.showLoading()});
        try {
            // 1. Actualizamos la cita
            await window.updateDoc(window.doc(window.db, "citas_agenda", idCita), formValues);
            
            // 2. Actualizamos el coche
            try {
                let cocheEnBaseDatos = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => c.B && String(c.B).replace(/\s/g, '').toUpperCase() === matricula.replace(/\s/g, '')) : null;
                if (cocheEnBaseDatos) {
                    let fechaVisual = formValues.fecha.split('-').reverse().join('/');
                    await window.updateDoc(window.doc(window.db, "vehiculos", cocheEnBaseDatos.fila), { fechaCita: `${fechaVisual} - ${formValues.hora}h`, agente: formValues.agente, cliente: formValues.cliente, entregaVO: formValues.entregaVO });
                }
            } catch (errCoche) {}
            
            let cambioFecha = (formValues.fecha !== fechaActual || formValues.hora !== horaActual);
            
            // 🔥 DISPARADOR DE CORREO (MODIFICACIÓN)
            if (cambioFecha && typeof window.dispararEmailCita === 'function') {
                window.dispararEmailCita(formValues, "modificar_correo");
            }

            // 3. Avisamos por WhatsApp
            if (cambioFecha && urlWhatsAppBase) {
                Swal.fire({ title: '¡Modificada!', text: '¿Avisar al cliente del cambio por WhatsApp?', icon: 'success', showCancelButton: true, confirmButtonColor: '#25D366', confirmButtonText: 'Sí, avisar' }).then((waRes) => {
                    if (waRes.isConfirmed) {
                        let fNueva = formValues.fecha.split('-').reverse().join('/');
                        window.open(urlWhatsAppBase + encodeURIComponent(`Hola ${formValues.cliente}, te confirmamos que hemos modificado la cita para la gestión de tu vehículo. La nueva fecha es el ${fNueva} a las ${formValues.hora}h. ¡Te esperamos!`), '_blank');
                    }
                });
            } else { 
                Swal.fire('¡Modificada!', 'La agenda se ha actualizado.', 'success'); 
            }
        } catch (errorGeneral) { 
            Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error'); 
        }
    }
}; // <-- Fíjate que termina justo aquí con esta llave y punto y coma.
// ========================================================
// 📅 GESTOR DE BLOQUEOS Y VACACIONES (AVANZADO)
// ========================================================
window.borrarBloqueo = async function(idBloqueo) {
    if (!idBloqueo) return;

    const rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
    if (rolLimpio === 'backoffice' || rolLimpio === 'administracion') {
        Swal.fire('Sin permisos', 'Back Office no puede desbloquear franjas de agenda.', 'warning');
        return;
    }

    const confirmar = await Swal.fire({
        title: '¿Desbloquear esta franja?',
        html: 'Se eliminará el bloqueo de vacaciones/día libre/hora suelta y el hueco volverá a quedar disponible en la agenda.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#001e50',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, desbloquear',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    try {
        await window.deleteDoc(window.doc(window.db, "bloqueos_agenda", idBloqueo));
        Swal.fire({
            icon: 'success',
            title: 'Franja desbloqueada',
            text: 'El bloqueo se ha eliminado correctamente.',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (error) {
        console.error('Error al borrar bloqueo:', error);
        Swal.fire('Error', 'No se ha podido eliminar el bloqueo. Inténtalo de nuevo.', 'error');
    }
};

window.abrirGestorVacaciones = async function() {
    const { value: formValues } = await Swal.fire({
        title: '🔒 Bloquear Fechas / Horas',
        html: `
            <div style="text-align: left; padding: 0 5%; font-family: 'Inter', sans-serif;">
                
                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Afecta a:</label>
                <select id="bv-operario" class="swal2-input" style="width:100%; margin:0 0 15px 0; height:45px; font-weight:bold; color:#001e50;">
                    <option value="AMBOS">Ambos (Manuel y Antonio)</option>
                    <option value="MANUEL">Manuel</option>
                    <option value="ANTONIO">Antonio</option>
                </select>

                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Tipo de Bloqueo:</label>
                <select id="bv-tipo" onchange="window.toggleBloqueoForm(this.value)" class="swal2-input" style="width:100%; margin:0 0 15px 0; height:45px; font-weight:bold; color:#001e50;">
                    <option value="vacaciones">Día(s) Completo(s)</option>
                    <option value="hora_suelta">Horas Sueltas (Día Determinado)</option>
                </select>

                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Fecha Inicio / Día:</label>
                <input type="date" id="bv-fecha-inicio" class="swal2-input" style="width:100%; margin:0 0 15px 0; height:40px;">

                <div id="bv-fecha-fin-container">
                    <label id="bv-fecha-fin-label" style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Fecha Fin (Inclusive):</label>
                    <input type="date" id="bv-fecha-fin" class="swal2-input" style="width:100%; margin:0 0 15px 0; height:40px;">
                </div>

                <div id="bv-hora-container" style="display: none; margin-bottom: 15px;">
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Desde:</label>
                            <select id="bv-hora-inicio" class="swal2-input" style="width:100%; margin:0; height:40px;">
                                <option value="" disabled selected>Elige hora...</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Hasta:</label>
                            <select id="bv-hora-fin" class="swal2-input" style="width:100%; margin:0; height:40px;">
                                <option value="" disabled selected>Elige hora...</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                            </select>
                        </div>
                    </div>
                </div>

                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Motivo del Bloqueo:</label>
                <input type="text" id="bv-motivo" class="swal2-input" style="width:100%; margin:0; height:40px; text-transform:uppercase;" placeholder="Ej: ASUNTOS PROPIOS, REUNIÓN...">
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: '#001e50',
        confirmButtonText: 'Aplicar Bloqueo',
        cancelButtonText: 'Cancelar',
        didOpen: () => {
            window.toggleBloqueoForm = function(val) {
                const campoFechaFin = document.getElementById('bv-fecha-fin-container');
                const contenedorHoras = document.getElementById('bv-hora-container');
                if (val === 'hora_suelta') {
                    if (campoFechaFin) campoFechaFin.style.display = 'none';
                    if (contenedorHoras) contenedorHoras.style.display = 'block';
                } else {
                    if (campoFechaFin) campoFechaFin.style.display = 'block';
                    if (contenedorHoras) contenedorHoras.style.display = 'none';
                }
            };
        },
        preConfirm: () => {
            const operario = document.getElementById('bv-operario').value;
            const tipo = document.getElementById('bv-tipo').value;
            const fechaInicio = document.getElementById('bv-fecha-inicio').value;
            const motivo = document.getElementById('bv-motivo').value.toUpperCase().trim();

            if (!fechaInicio || !motivo) {
                return Swal.showValidationMessage('Por favor, rellena la fecha y el motivo.');
            }

            let datosBloqueo = {
                operarioAfectado: operario, // Guardamos a quién afecta
                tipo: tipo,
                fechaInicio: fechaInicio,
                motivo: motivo,
                creadoPor: window.usuarioActivo,
                timestamp: new Date().getTime()
            };

            if (tipo === 'vacaciones') {
                const fechaFin = document.getElementById('bv-fecha-fin').value;
                if (!fechaFin) return Swal.showValidationMessage('Falta la fecha de fin.');
                datosBloqueo.fechaFin = fechaFin;
            } else {
                const horaInicio = document.getElementById('bv-hora-inicio').value;
                const horaFin = document.getElementById('bv-hora-fin').value;
                if (!horaInicio || !horaFin) return Swal.showValidationMessage('Debes seleccionar las horas de inicio y fin.');
                datosBloqueo.horaInicio = horaInicio;
                datosBloqueo.horaFin = horaFin;
            }

            return datosBloqueo;
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Guardando bloqueo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const idBloqueo = "bloqueo_" + new Date().getTime();
            await window.setDoc(window.doc(window.db, "bloqueos_agenda", idBloqueo), formValues);
            Swal.fire('¡Bloqueado!', 'El calendario ha sido actualizado.', 'success');
            if (typeof window.renderAgenda === 'function') window.renderAgenda();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo registrar el bloqueo.', 'error');
        }
    }
};
// ==========================================
// ➕ CREACIÓN DE CITA MANUAL INTELIGENTE (ENTREGAS / DEVOLUCIONES)
// ==========================================
window.crearCitaManual = async function() {
    const paso1 = await Swal.fire({
        title: 'Programar Nueva Cita (V2)',
        text: '¿Qué tipo de gestión vas a realizar?',
        icon: 'question', showCancelButton: true, showDenyButton: true,
        confirmButtonText: '🚗 Entrega', denyButtonText: '🔄 Devolución', cancelButtonText: 'Cancelar',
        confirmButtonColor: '#001e50', denyButtonColor: '#64748b'
    });

    if (!paso1.isConfirmed && !paso1.isDenied) return; 

    const esDevolucion = paso1.isDenied;
    let htmlCampos = '';
    
    if (esDevolucion) {
        htmlCampos = `
            <div class="mb-3 text-left">
                <label class="text-xs font-bold text-gray-500 uppercase">Matrícula</label>
                <input id="n-mat" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: 1234ABC">
                <div id="aviso-cita-duplicada" class="text-[10px] text-red-600 font-black mt-1 hidden animate-pulse">⚠️ ALERTA: Esta matrícula ya tiene una cita activa en la agenda.</div>
            </div>
            <div class="mb-3 text-left"><label class="text-xs font-bold text-gray-500 uppercase">Nombre Conductor / Cliente</label><input id="n-cli" class="swal2-input !w-full !m-0 !mt-1" placeholder="Nombre completo"></div>
            <div class="mb-3 text-left"><label class="text-xs font-bold text-gray-500 uppercase">Teléfono Conductor</label><input id="n-tlf" type="tel" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: 600000000"></div>
            <div class="mb-3 text-left"><label class="text-xs font-bold text-gray-500 uppercase">Empresa Renting</label><input id="n-renting" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: Arval, LeasePlan..."></div>
        `;
    } else {
        htmlCampos = `
            <div class="mb-3 text-left">
                <label class="text-xs font-bold text-gray-500 uppercase">Matrícula</label>
                <input id="n-mat" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: 1234ABC">
                <div id="aviso-cita-duplicada" class="text-[10px] text-red-600 font-black mt-1 hidden animate-pulse">⚠️ ALERTA: Esta matrícula ya tiene una cita activa en la agenda.</div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Nombre Cliente</label><input id="n-cli" class="swal2-input !w-full !m-0 !mt-1" placeholder="Nombre completo"></div>
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Modelo del Vehículo</label><input id="n-mod" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: Golf, Tiguan..."></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Email</label><input id="n-email" type="email" class="swal2-input !w-full !m-0 !mt-1" placeholder="correo@ejemplo.com"></div>
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Teléfono</label><input id="n-tlf" type="tel" class="swal2-input !w-full !m-0 !mt-1" placeholder="600000000"></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Número Bastidor</label><input id="n-bas" class="swal2-input !w-full !m-0 !mt-1" placeholder="17 caracteres"></div>
                <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Empresa Renting</label><input id="n-renting" class="swal2-input !w-full !m-0 !mt-1" placeholder="Ej: Alphabet..."></div>
            </div>
            <div class="mb-3 text-left flex items-center gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-200 select-none">
                <input type="checkbox" id="n-devuelve" class="w-4 h-4 accent-[#001e50] cursor-pointer">
                <label for="n-devuelve" class="text-xs font-black text-gray-700 cursor-pointer uppercase tracking-wider">¿El cliente devuelve vehículo?</label>
            </div>
        `;
    }

    htmlCampos += `
        <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="text-left"><label class="text-xs font-bold text-gray-500 uppercase">Fecha Cita</label><input type="date" id="n-fec" class="swal2-input !w-full !m-0 !mt-1"></div>
            <div class="text-left">
                <label class="text-xs font-bold text-gray-500 uppercase">Hora Cita</label>
                <select id="n-hor" class="swal2-select !w-full !m-0 !mt-1">
                    <option value="" disabled selected>Elige hora...</option>
                    <option value="10:00">10:00</option> <option value="11:00">11:00</option>
                    <option value="12:00">12:00</option> <option value="13:00">13:00</option>
                    <option value="16:00">16:00</option> <option value="17:00">17:00</option>
                    <option value="18:00">18:00</option> <option value="19:00">19:00</option>
                </select>
            </div>
        </div>
    `;

    htmlCampos += `
        <div class="text-left mb-3">
            <label class="text-xs font-bold text-gray-500 uppercase">Entregador Asignado</label>
            <select id="n-age" class="swal2-select !w-full !m-0 !mt-1">
                <option value="MANUEL">MANUEL</option>
                <option value="ANTONIO">ANTONIO</option>
            </select>
        </div>
        <div class="mb-3 text-left flex items-center gap-2 bg-purple-50/50 p-3 rounded-lg border border-purple-200 select-none">
            <input type="checkbox" id="n-conjunta" class="w-4 h-4 accent-purple-600 cursor-pointer">
            <label for="n-conjunta" class="text-xs font-black text-purple-900 cursor-pointer uppercase tracking-wider">Forzar entrega conjunta (Permitir solapes)</label>
        </div>
    `;

    if (!esDevolucion) {
        htmlCampos += `
            <div class="text-left mb-1">
                <label class="text-xs font-bold text-gray-500 uppercase">Notas Adicionales</label>
                <textarea id="n-not" class="swal2-textarea !w-full !m-0 !mt-1 text-sm p-3" style="min-height: 60px;" placeholder="Detalles de preparación, lavado, etc..."></textarea>
            </div>
        `;
    }

    const { value: formValues } = await Swal.fire({
        title: esDevolucion ? '🔄 Programar Devolución (V2)' : '🚗 Programar Entrega (V2)',
        html: htmlCampos,
        width: '650px', focusConfirm: false, confirmButtonText: 'Guardar Cita', confirmButtonColor: '#001e50',
        didOpen: () => {
            const inputMat = document.getElementById('n-mat');
            if (!inputMat) return;
            inputMat.addEventListener('input', () => {
                let mat = inputMat.value.replace(/\s/g, '').toUpperCase();
                if (mat.length < 4) return; 
                let citaExistente = window.datosAgenda && window.datosAgenda.find(cita => cita.matricula && cita.matricula.replace(/\s/g, '').toUpperCase() === mat);
                const divAviso = document.getElementById('aviso-cita-duplicada');
                if (divAviso) { if (citaExistente) divAviso.classList.remove('hidden'); else divAviso.classList.add('hidden'); }
                let cocheExistente = todosLosCoches.find(c => c.B && c.B.replace(/\s/g, '').toUpperCase() === mat);
                if (cocheExistente) {
                    if (document.getElementById('n-cli') && !document.getElementById('n-cli').value) document.getElementById('n-cli').value = cocheExistente.cliente || '';
                    if (document.getElementById('n-mod') && !document.getElementById('n-mod').value) document.getElementById('n-mod').value = cocheExistente.C || '';
                    if (document.getElementById('n-renting') && !document.getElementById('n-renting').value) document.getElementById('n-renting').value = cocheExistente.renting || '';
                    if (document.getElementById('n-bas') && !document.getElementById('n-bas').value) document.getElementById('n-bas').value = cocheExistente.A || '';
                }
            });
        },
        preConfirm: async () => {
            const mat = document.getElementById('n-mat').value.toUpperCase().trim();
            const cli = document.getElementById('n-cli').value.toUpperCase().trim();
            const fec = document.getElementById('n-fec').value;
            const hor = document.getElementById('n-hor').value;
            const agenteAsignado = document.getElementById('n-age') ? document.getElementById('n-age').value : '';
            if (!mat || !cli || !fec || !hor) { Swal.showValidationMessage('Matrícula, nombre, fecha y hora son obligatorios.'); return false; }
            if (!agenteAsignado) { Swal.showValidationMessage('Debes asignar un entregador.'); return false; }
            if (hor === '19:00' && agenteAsignado === 'ANTONIO') {
                Swal.showValidationMessage('A las 19:00h solo Manuel realiza entregas. Selecciona a MANUEL o cambia la hora.');
                return false;
            }
            try {
                const bloqueosSnapshot = await window.getDocs(window.collection(window.db, "bloqueos_agenda"));
                let conflicto = null;
                bloqueosSnapshot.forEach(doc => {
                    const b = doc.data();
                    if (b.operarioAfectado === "AMBOS" || b.operarioAfectado === agenteAsignado) {
                        if (b.tipo === "vacaciones") {
                            if (fec >= b.fechaInicio && fec <= b.fechaFin) conflicto = `⛔ ${agenteAsignado} está bloqueado/a: ${b.motivo}`;
                        } else if (b.tipo === "hora_suelta") {
                            if (fec === b.fechaInicio && hor >= b.horaInicio && hor <= b.horaFin) conflicto = `⛔ ${agenteAsignado} no está disponible a las ${hor}: ${b.motivo}`;
                        }
                    }
                });
                if (conflicto) {
                    if(typeof window.registrarMetricaM2 === 'function') window.registrarMetricaM2('choques_agenda_evitados');
                    Swal.showValidationMessage(conflicto); return false;
                }
            } catch (err) { console.error("Error al consultar bloqueos", err); }

            const forzarConjunta = document.getElementById('n-conjunta') ? document.getElementById('n-conjunta').checked : false;

            const conflictoCita = (window.datosAgenda || []).find(cita => {
                if (!cita || !cita.fechaHora) return false;
                const fechaCita = new Date(cita.fechaHora);
                if (isNaN(fechaCita.getTime())) return false;

                const fechaCitaKey = `${fechaCita.getFullYear()}-${String(fechaCita.getMonth() + 1).padStart(2, '0')}-${String(fechaCita.getDate()).padStart(2, '0')}`;
                const horaCitaKey = `${String(fechaCita.getHours()).padStart(2, '0')}:00`;
                const agenteCita = String(cita.entregador || cita.agente || 'MANUEL').toUpperCase();
                const mismaFechaHora = (fechaCitaKey === fec && horaCitaKey === hor);

                if (!mismaFechaHora) return false;
                if (hor === '19:00') return true;

                return agenteCita === agenteAsignado;
            });

            // Si hay conflicto PERO no han marcado la casilla conjunta, bloqueamos
            if (conflictoCita && !forzarConjunta) {
                if(typeof window.registrarMetricaM2 === 'function') window.registrarMetricaM2('choques_agenda_evitados');
                const vehiculoConflicto = conflictoCita.matricula || conflictoCita.modelo || 'otra cita';
                Swal.showValidationMessage(`Ese hueco ya está ocupado por ${vehiculoConflicto}. Elige otra hora o marca "Forzar entrega conjunta".`);
                return false;
            }

            let resultadoFormat = {
                matricula: mat, cliente: cli, fecha: fec, hora: hor,
                telefono: document.getElementById('n-tlf') ? document.getElementById('n-tlf').value.trim() : '',
                renting: document.getElementById('n-renting') ? document.getElementById('n-renting').value.toUpperCase().trim() : ''
            };

            if (esDevolucion) {
                resultadoFormat.modelo = 'DEVOLUCIÓN' + (resultadoFormat.renting ? ` - ${resultadoFormat.renting}` : '');
                resultadoFormat.agente = agenteAsignado;
            } else {
                resultadoFormat.modelo = document.getElementById('n-mod').value.toUpperCase().trim();
                resultadoFormat.email = document.getElementById('n-email').value.trim();
                resultadoFormat.bastidor = document.getElementById('n-bas').value.toUpperCase().trim();
                resultadoFormat.devuelveVehiculo = document.getElementById('n-devuelve').checked ? 'SÍ' : 'NO';
                resultadoFormat.agente = document.getElementById('n-age').value;
                resultadoFormat.notas = document.getElementById('n-not').value.trim();
            }
            return resultadoFormat;
        }
    });

    if (formValues) {
        
        let rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
        
        const estadoAsignado = (rolLimpio === "backoffice" || rolLimpio === "administracion" || rolLimpio === "comercial") ? "pendiente" : "confirmada";
        
        try {
            Swal.fire({ title: 'Guardando cita en tiempo real...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

            const nuevaRef = window.doc(window.collection(window.db, "citas_agenda"));
            await window.setDoc(nuevaRef, {
                matricula: formValues.matricula, cliente: formValues.cliente, modelo: formValues.modelo,
                fecha: formValues.fecha, hora: formValues.hora, agente: formValues.agente,
                telefono: formValues.telefono || "", email: formValues.email || "", bastidor: formValues.bastidor || "",
                renting: formValues.renting || "", entregaVO: formValues.devuelveVehiculo || "NO", 
                notas: formValues.notas || "", creadoPor: window.usuarioActivo, 
                estado: estadoAsignado 
            });

            let matLimpiaForm = formValues.matricula.replace(/\s/g, '').toUpperCase();
            let basLimpioForm = (formValues.bastidor || '').replace(/\s/g, '').toUpperCase();

            let cocheEncontrado = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => {
                let mLocal = String(c.matricula || c.Matricula || c.B || '').replace(/\s/g, '').toUpperCase();
                let bLocal = String(c.bastidor || c.A || '').replace(/\s/g, '').toUpperCase();
                return (matLimpiaForm.length > 3 && mLocal === matLimpiaForm) || (basLimpioForm.length > 5 && bLocal === basLimpioForm);
            }) : null;

            if (cocheEncontrado && cocheEncontrado.fila) {
                let fechaVisual = formValues.fecha.split('-').reverse().join('/'); // De AAAA-MM-DD a DD/MM/AAAA
                
                await window.updateDoc(window.doc(window.db, "vehiculos", cocheEncontrado.fila), {
                    fechaCita: `${fechaVisual} - ${formValues.hora}h`,
                    agente: formValues.agente,
                    cliente: formValues.cliente,
                    entregaVO: formValues.devuelveVehiculo || "NO"
                });
            }

            // 🔥 DISPARADOR DE CORREO: Solo enviamos si NO es pendiente
            if(estadoAsignado !== "pendiente" && typeof window.dispararEmailCita === 'function') {
                 window.dispararEmailCita(formValues, "enviar_correo");
            }

            if (estadoAsignado === "pendiente") {
                Swal.fire('Solicitud de Cita', 'Guardada como PENDIENTE. Entregas revisará el hueco en el cuadrante.', 'info');
            } else {
                Swal.fire('¡Agendada!', 'La cita se ha guardado y el vehículo ha sido vinculado correctamente.', 'success');
            }
        } catch (error) { 
            console.error("Error al guardar cita manual:", error);
            Swal.fire('Fallo', 'Error al conectar con Firebase o actualizar el vehículo.', 'error'); 
        }
    }
}; 
// ==========================================
    // ✅ VALIDACIONES DE AGENDA (ENTREGAS)
    // ==========================================
    window.aprobarCitaPendiente = async function(idCita, matricula) {
        try {
            const citaPendiente = (window.datosAgenda || []).find(c => c && c.id === idCita);
            if (citaPendiente && citaPendiente.fechaHora) {
                const fechaPend = new Date(citaPendiente.fechaHora);
                const fechaPendKey = `${fechaPend.getFullYear()}-${String(fechaPend.getMonth() + 1).padStart(2, '0')}-${String(fechaPend.getDate()).padStart(2, '0')}`;
                const horaPendKey = `${String(fechaPend.getHours()).padStart(2, '0')}:00`;
                const agentePend = String(citaPendiente.entregador || citaPendiente.agente || 'MANUEL').toUpperCase();

                const conflictoAprobacion = (window.datosAgenda || []).find(cita => {
                    if (!cita || !cita.id || cita.id === idCita || !cita.fechaHora) return false;
                    const fechaCita = new Date(cita.fechaHora);
                    if (isNaN(fechaCita.getTime())) return false;

                    const fechaCitaKey = `${fechaCita.getFullYear()}-${String(fechaCita.getMonth() + 1).padStart(2, '0')}-${String(fechaCita.getDate()).padStart(2, '0')}`;
                    const horaCitaKey = `${String(fechaCita.getHours()).padStart(2, '0')}:00`;
                    const agenteCita = String(cita.entregador || cita.agente || 'MANUEL').toUpperCase();
                    const mismaFechaHora = (fechaCitaKey === fechaPendKey && horaCitaKey === horaPendKey);

                    if (!mismaFechaHora) return false;
                    if (horaPendKey === '19:00') return true;

                    return agenteCita === agentePend;
                });

                if (conflictoAprobacion) {
                    if(typeof window.registrarMetricaM2 === 'function') window.registrarMetricaM2('choques_agenda_evitados');
                    const vehiculoConflicto = conflictoAprobacion.matricula || conflictoAprobacion.modelo || 'otra cita';
                    Swal.fire('Hueco ocupado', `No se puede confirmar: el hueco ya está ocupado por ${vehiculoConflicto}.`, 'warning');
                    return;
                }
            }

            await window.updateDoc(window.doc(window.db, "citas_agenda", idCita), {
                estado: "confirmada"
            });
            
            // Opcional: También actualizar la fechaCita en la colección 'vehiculos'
            // if (matricula) { ... buscar coche y updateDoc ... }

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cita Confirmada', showConfirmButton: false, timer: 3000 });
        } catch (error) {
            Swal.fire('Error', 'No se pudo confirmar la cita.', 'error');
        }
    };

    window.rechazarCitaPendiente = async function(idCita, modeloVehiculo) {
        const { value: motivo } = await Swal.fire({
            title: 'Rechazar Cita',
            text: `Vas a rechazar la cita solicitada para el ${modeloVehiculo}.`,
            input: 'text',
            inputLabel: 'Escribe el motivo del rechazo para el Back Office:',
            inputPlaceholder: 'Ej: Ese día el lavadero está saturado a esa hora',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Rechazar y Borrar',
            cancelButtonText: 'Cancelar'
        });

        if (motivo !== undefined) {
            try {
                // 1. Recuperamos los datos de la cita antes de borrarla
                const docRef = window.doc(window.db, "citas_agenda", idCita);
                const docSnap = await window.getDoc(docRef);
                
                if (docSnap.exists()) {
                    const datosCita = docSnap.data();
                    
                    // 2. Intentamos crear la notificación, pero la BLINDAMOS por si falla Firebase
                    if (datosCita.creadoPor) {
                        try {
                            const refNotificacion = window.doc(window.collection(window.db, "notificaciones_agenda"));
                            await window.setDoc(refNotificacion, {
                                vehiculo: modeloVehiculo,
                                matricula: datosCita.matricula || "S/M",
                                fechaCita: `${datosCita.fecha} a las ${datosCita.hora}h`,
                                solicitadoPor: datosCita.creadoPor,
                                motivoRechazo: motivo || "No especificado por el agente",
                                fechaRegistro: new Date().toLocaleString(),
                                leido: false
                            });
                        } catch (errorNotificacion) {
                            console.warn("Aviso: La cita se borrará, pero no se pudo enviar la notificación a Back Office", errorNotificacion);
                        }
                    }
                }

                // 3. Ahora sí, borramos la cita (esta línea se ejecutará SIEMPRE, aunque la notificación falle)
                await window.deleteDoc(window.doc(window.db, "citas_agenda", idCita));
                
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Cita rechazada y eliminada', showConfirmButton: false, timer: 3000 });
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo procesar el rechazo de la cita.', 'error');
            }
        }
    };
    // ==========================================
// ❓ PREGUNTA INTERMEDIA PARA CITAS ATRASADAS
// ==========================================
window.preguntarSiEntregado = async function(idFb, modelo, matricula, dia, hora, citaId) {
    const citaEnAgenda = citaId && window.getDoc && window.doc && window.db
        ? await (async () => {
            try {
                const snap = await window.getDoc(window.doc(window.db, 'citas_agenda', citaId));
                return snap.exists() ? snap.data() : null;
            } catch (error) {
                console.warn('No se pudo leer la cita original.', error);
                return null;
            }
        })()
        : null;

    const esCitaDevolucion = (function() {
        const modeloBase = String(citaEnAgenda?.modelo || modelo || '').toUpperCase();
        return modeloBase.includes('DEVOLUCION') || modeloBase.includes('DEVOLUCIÓN');
    })();

    // Si es devolución y no hay ficha de vehículo, completamos desde agenda sin crear tarjeta.
    if (idFb === 'no_db' && esCitaDevolucion) {
        const confirmarDevolucion = await Swal.fire({
            title: 'Completar Devolución',
            html: `
                <p class="text-sm text-gray-700">Esta devolución no tiene tarjeta de vehículo vinculada.</p>
                <p class="mt-2 text-sm text-gray-700">¿Quieres marcarla como completada y enviarla al historial?</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, completar devolución',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmarDevolucion.isConfirmed) return;

        try {
            const tsEntrega = typeof window.obtenerTimestamp === 'function' ? window.obtenerTimestamp() : new Date().getTime();
            const fechaEntregaTexto = typeof window.formatearFechaES === 'function' ? window.formatearFechaES(tsEntrega) : new Date().toLocaleDateString('es-ES');

            let citaObjetivoId = String(citaId || '').trim();
            if (!citaObjetivoId && Array.isArray(window.datosAgenda)) {
                const matObj = String(matricula || '').replace(/\s/g, '').toUpperCase();
                const modeloObj = String(modelo || '').toUpperCase();
                const fechaObj = String(dia || '').trim();
                const horaObj = String(hora || '').replace('h', '').trim();

                const candidata = window.datosAgenda.find(c => {
                    const matCita = String(c?.matricula || '').replace(/\s/g, '').toUpperCase();
                    const modeloCita = String(c?.modelo || '').toUpperCase();
                    const matchMat = matObj && matCita === matObj;
                    const matchModelo = modeloObj && modeloCita.includes('DEVOLUCION');
                    if (!matchMat && !matchModelo) return false;

                    if (!c?.fechaHora) return true;
                    const f = new Date(c.fechaHora);
                    if (isNaN(f.getTime())) return true;
                    const fechaTxt = f.toLocaleDateString('es-ES');
                    const horaTxt = `${f.getHours()}:00`;
                    const mismaFecha = !fechaObj || fechaTxt === fechaObj;
                    const mismaHora = !horaObj || horaTxt === horaObj;
                    return mismaFecha && mismaHora;
                });

                citaObjetivoId = candidata?.id || '';
            }

            if (!citaObjetivoId) {
                Swal.fire('Aviso', 'No se ha encontrado la cita para marcar la devolución. Ábrela desde la agenda del día y repite la acción.', 'warning');
                return;
            }

            await window.updateDoc(window.doc(window.db, "citas_agenda", citaObjetivoId), {
                estado: "confirmada",
                entregado: true,
                fechaEntrega: tsEntrega,
                fechaEntregaTexto: fechaEntregaTexto,
                tipoFinalizacion: 'DEVOLUCION'
            });

            if (Array.isArray(window.datosAgenda)) {
                const idx = window.datosAgenda.findIndex(c => c && c.id === citaObjetivoId);
                if (idx >= 0) {
                    window.datosAgenda[idx].estado = 'confirmada';
                    window.datosAgenda[idx].entregado = true;
                    window.datosAgenda[idx].fechaEntrega = tsEntrega;
                    window.datosAgenda[idx].fechaEntregaTexto = fechaEntregaTexto;
                    window.datosAgenda[idx].tipoFinalizacion = 'DEVOLUCION';
                }
            }

            if (typeof window.registrarMovimientoHistorial === 'function') {
                await window.registrarMovimientoHistorial({
                    tipo: 'DEVOLUCION',
                    citaId: citaObjetivoId,
                    vehiculoId: null,
                    matricula: (citaEnAgenda && citaEnAgenda.matricula) || matricula || 'S/M',
                    bastidor: (citaEnAgenda && citaEnAgenda.bastidor) || 'S/D',
                    modelo: (citaEnAgenda && citaEnAgenda.modelo) || modelo || 'DEVOLUCION',
                    renting: (citaEnAgenda && citaEnAgenda.renting) || '',
                    detalle: 'Devolucion completada desde agenda sin tarjeta de vehiculo'
                });
            }

            Swal.fire({
                icon: 'success',
                title: 'Devolución completada',
                text: 'La cita se ha marcado en verde y ya aparece en el historial de movimientos.',
                confirmButtonColor: '#001e50'
            });

            if (typeof window.renderizarVistas === 'function') window.renderizarVistas();
            if (typeof window.dibujarCuadranteMes === 'function') window.dibujarCuadranteMes();
            return;
        } catch (errorDevolucion) {
            console.error('Error al completar devolución desde agenda:', errorDevolucion);
            Swal.fire('Error', 'No se pudo completar la devolución.', 'error');
            return;
        }
    }

    // Si la cita no tiene un coche vinculado en la base de datos activa, ofrecemos crearlo
    if (idFb === 'no_db') {
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
            const resultadoAlta = await window.crearVehiculoDesdeCitaAgenda(citaEnAgenda || {
                modelo,
                matricula,
                fecha: dia,
                hora,
                renting: citaEnAgenda?.renting || citaEnAgenda?.agencia || ''
            }, { citaId, modelo, matricula, fecha: dia, hora, renting: citaEnAgenda?.renting || citaEnAgenda?.agencia || '' });

            Swal.fire({
                icon: 'success',
                title: 'Vehículo creado',
                text: `Se ha creado la tarjeta de ${resultadoAlta.matricula} y se ha registrado la entrega.`,
                confirmButtonColor: '#001e50'
            });

            return;
        } catch (error) {
            console.error('Error creando vehículo desde cita:', error);
            Swal.fire('Error', 'No se pudo crear la tarjeta del vehículo.', 'error');
            return;
        }
    }

    // Desplegamos la ventana de decisión
    const result = await Swal.fire({
        title: 'Gestión de Cita Atrasada',
        html: `
            <div style="text-align: left; font-family: sans-serif; font-size: 14px; color: #4b5563;">
                <p>La cita programada para el vehículo <b>${modelo}</b> (Matrícula: <b>${matricula}</b>) el día <b>${dia}</b> a las <b>${hora}</b> ha pasado de fecha.</p>
                <p style="margin-top: 15px; font-weight: bold; color: #111827;">¿Qué ha ocurrido con esta entrega?</p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonColor: '#10b981', // Verde para "Entregado"
        denyButtonColor: '#f59e0b',    // Naranja para "Reagendar"
        cancelButtonColor: '#6b7280',  // Gris para "Cancelar"
        confirmButtonText: 'Sí, ya se ha entregado',
        denyButtonText: 'No, necesita reagendarse',
        cancelButtonText: 'Cancelar'
    });

    // Lógica según la respuesta del usuario
    if (result.isConfirmed) {
        // Si se entregó, conectamos con la herramienta de WhatsApp y fotografía
        if (typeof window.marcarComoEntregado === 'function') {
            window.marcarComoEntregado(idFb, { idCita: citaId || null, mantenerCita: true });
        } else {
            Swal.fire('Error', 'La función de entrega no está disponible en este momento.', 'error');
        }
    } else if (result.isDenied) {
        // Si hay que reagendar, indicamos los pasos a seguir
        Swal.fire({
            title: 'Reagendar Cita',
            text: 'Para cambiar la fecha u hora, haz clic sobre el recuadro principal de esta cita en el cuadrante de la agenda y actualiza los datos en el formulario de edición.',
            icon: 'info',
            confirmButtonColor: '#001e50'
        });
    }
};
// ==========================================
// 📧 MÓDULO DE NOTIFICACIONES POR EMAIL (BACKOFFICE)
// ==========================================
window.dispararEmailCita = function(datosCita, accion) {
    // Si no hay email, no hacemos nada para evitar errores
    if (!datosCita.email || datosCita.email.trim() === '') return;

    try {
        const URL_SCRIPT_CORREO = "https://script.google.com/macros/s/AKfycbxQ5mMCC7DA0wrlpaZS6EksUAIkoDgwceIcFObevEXei8mzEw1WVfOzgKdrqBIi76p-CQ/exec";
        
        let payload = {
            action: accion, // "enviar_correo" o "modificar_correo"
            email: datosCita.email.trim(), 
            cliente: datosCita.cliente,
            modelo: datosCita.modelo, 
            matricula: datosCita.matricula,
            fecha: datosCita.fecha.split('-').reverse().join('/'), // Convertimos AAAA-MM-DD a DD/MM/AAAA 
            hora: datosCita.hora, 
            agente: datosCita.agente || "MANUEL"
        };

        // Lanzamos la petición al servidor sin interrumpir la experiencia del usuario (asíncrono)
        fetch(URL_SCRIPT_CORREO, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        }).catch(err => console.log("Fallo menor al intentar enviar correo de confirmación:", err));
        
    } catch (e) {
        console.log("No se ha podido procesar el aviso por correo electrónico.");
    }
};
    // Escuchador en vivo de notificaciones de rechazo exclusivo para Back Office
    window.escucharNotificacionesBackOffice = function() {
        if (window.rolActivo !== "backoffice") return; // Si eres Manuel/Antonio o Taller, esta función no hace nada

        // Escuchamos la colección buscando alertas sin leer destinadas a este usuario activo
        window.onSnapshot(window.collection(window.db, "notificaciones_agenda"), (snapshot) => {
            snapshot.forEach(async (docSnap) => {
                const alerta = docSnap.data();
                
                // Si la alerta coincide con tu nombre de usuario de Back Office y no la has leído
                if (alerta.solicitadoPor === window.usuarioActivo && alerta.leido === false) {
                    
                    // Marcamos la alerta como leída inmediatamente en Firebase para que no se repita el aviso
                    await window.updateDoc(window.doc(window.db, "notificaciones_agenda", docSnap.id), { leido: true });

                    // Lanzamos el aviso en pantalla bien llamativo
                    Swal.fire({
                        title: '❌ Cita Denegada por Entregas',
                        html: `
                            <div class="text-left space-y-2 text-sm text-gray-700 bg-orange-50 p-4 rounded-xl border border-orange-200 mt-2">
                                <p><b>Vehículo:</b> ${alerta.vehiculo} (${alerta.matricula})</p>
                                <p><b>Fecha Solicitada:</b> ${alerta.fechaCita}</p>
                                <hr class="border-orange-200 my-2">
                                <p class="text-red-700"><b>Motivo del Rechazo:</b></p>
                                <p class="font-medium italic text-gray-900">"${alerta.motivoRechazo}"</p>
                            </div>
                        `,
                        icon: 'error',
                        confirmButtonColor: '#001e50',
                        confirmButtonText: 'Entendido, volver a agendar'
                    });
                }
            });
        });
    };