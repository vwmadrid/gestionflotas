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

   window.renderAgenda = function() { 
    let div = document.getElementById('contenedorAgenda');
    div.innerHTML = `<div class="bg-white p-16 rounded-xl shadow-sm border border-gray-200 text-center flex flex-col items-center"><i class="ph-bold ph-spinner animate-spin text-5xl text-[#001e50] mb-4"></i><p class="font-black text-gray-500 tracking-widest uppercase">Conectando Radares en Vivo...</p></div>`;

    try {
        if (!window.mesVistaActual) {
            window.mesVistaActual = new Date(); window.mesVistaActual.setDate(1);
        }

        // 1. Radar de Citas
        window.onSnapshot(window.collection(window.db, "citas_agenda"), (querySnapshot) => {
            window.datosAgenda = []; 
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                window.datosAgenda.push({
                    id: doc.id, fechaHora: `${data.fecha}T${data.hora}:00`, 
                    cliente: data.cliente || "Cliente", telefono: data.telefono || "", email: data.email || "",
                    matricula: data.matricula || "S/M", modelo: data.modelo || "Vehículo", bastidor: data.bastidor || "",
                    renting: data.renting || "", entregaVO: data.entregaVO || "NO", agente: data.agente || "MANUEL",
                    notas: data.notas || "", estado: data.estado || "confirmada", isBlock: false
                });
            });
            window.dibujarCuadranteMes();
            window.comprobarAtrasosGenerales(); 
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
            window.dibujarCuadranteMes(); 
        }, (error) => {
            if (typeof window.mostrarErrorFirebase === 'function') window.mostrarErrorFirebase(error, 'Error al cargar bloqueos de agenda');
            else console.error('Error al cargar bloqueos de agenda', error);
        });

    } catch (error) {
        div.innerHTML = `<div class="bg-red-50 p-10 rounded-xl shadow-sm border border-red-200 text-center"><p class="font-bold text-red-600 text-lg">Error de conexión en vivo</p></div>`;
    }
};

    window.comprobarAtrasosGenerales = function() {
    let atrasados = [];
    let hoyLimpio = new Date();
    hoyLimpio.setHours(0, 0, 0, 0); 
    
    window.datosAgenda.forEach(cita => {
        if (!cita.fechaHora || cita.matricula === "---") return;
        
        let fechaCitaPartes = cita.fechaHora.split('T')[0].split('-');
        if(fechaCitaPartes.length !== 3) return;

        let fechaCitaLimpia = new Date(fechaCitaPartes[0], fechaCitaPartes[1] - 1, fechaCitaPartes[2]);
        fechaCitaLimpia.setHours(0, 0, 0, 0);
        
        let matCita = cita.matricula ? String(cita.matricula).replace(/\s/g, '').toUpperCase() : '';
        let basCita = cita.bastidor ? String(cita.bastidor).toUpperCase() : '';
        
        let cocheEnBaseDatos = typeof todosLosCoches !== 'undefined' ? todosLosCoches.find(c => 
            (c.B && String(c.B).replace(/\s/g, '').toUpperCase() === matCita) || 
            (c.A && String(c.A).toUpperCase() === basCita)
        ) : null;
        
        let yaEntregado = cocheEnBaseDatos && (cocheEnBaseDatos.entregado === true || cocheEnBaseDatos.entregado === "true");
        
        if (fechaCitaLimpia < hoyLimpio && !yaEntregado) {
            let fechaCitaRaw = cita.fechaHora.split('T')[0]; 
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

    window.dibujarCuadranteMes = function() {
        let div = document.getElementById('contenedorAgenda');
        let agendaEstructurada = {};
        const horasLaborales = ['10', '11', '12', '13', '16', '17', '18', '19'];

        window.datosAgenda.forEach(cita => {
            if (!cita.fechaHora) return;
            let fecha = new Date(cita.fechaHora);
            if (isNaN(fecha.getTime())) return;
            let dateKey = fecha.getFullYear() + "-" + String(fecha.getMonth()+1).padStart(2,'0') + "-" + String(fecha.getDate()).padStart(2,'0');
            let horaStr = fecha.getHours().toString().padStart(2, '0');
            if (!agendaEstructurada[dateKey]) agendaEstructurada[dateKey] = {};
            if (!agendaEstructurada[dateKey][horaStr]) agendaEstructurada[dateKey][horaStr] = { MANUEL: null, ANTONIO: null };
            let nombreAgente = (cita.entregador || cita.agente || "MANUEL").toUpperCase();
            agendaEstructurada[dateKey][horaStr][nombreAgente] = cita;
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

        let html = `
        <div class="bg-white rounded-xl shadow-xl border border-[#001e50] flex flex-col h-[calc(100vh-140px)] w-full relative">
            <div class="bg-[#001e50] text-white p-3 px-6 flex justify-between items-center shrink-0 z-30">
               <h2 class="text-base font-black tracking-widest uppercase flex items-center gap-2"><i class="ph-bold ph-calendar-grid-week text-xl text-[#00b0f0]"></i> Cuadrante</h2>
               
               <div class="relative w-64">
                   <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                   <input type="text" id="inputBusquedaAgenda" onkeyup="window.buscarEnAgenda()" placeholder="Buscar cliente, matrícula, modelo..." class="w-full pl-9 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-[#00b0f0] transition-all">
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
                
                let cM = agendaEstructurada[dateKey] && agendaEstructurada[dateKey][hora] ? agendaEstructurada[dateKey][hora].MANUEL : null;
                let cA = agendaEstructurada[dateKey] && agendaEstructurada[dateKey][hora] ? agendaEstructurada[dateKey][hora].ANTONIO : null;

                function obtenerBloqueo(agenteAbuscar) {
                    if (!window.datosVacaciones) return null;
                    return window.datosVacaciones.find(b => {
                        if(b.agente !== agenteAbuscar && b.agente !== 'AMBOS') return false;
                        if(b.tipo === 'dia_completo') return dateKey >= b.fechaInicio && dateKey <= b.fechaFin;
                        if(b.tipo === 'hora_suelta') return b.fecha === dateKey && b.hora === (hora + ':00');
                        return false;
                    });
                }

                let bloqueoM = obtenerBloqueo('MANUEL');
                let bloqueoA = obtenerBloqueo('ANTONIO');

                if (bloqueoM) cM = { isBlock: true, idBloqueo: bloqueoM.id, modelo: bloqueoM.motivo.toUpperCase(), cliente: "AGENDA CERRADA", matricula: "---", bastidor: "", renting: "" };
                if (bloqueoA) cA = { isBlock: true, idBloqueo: bloqueoA.id, modelo: bloqueoA.motivo.toUpperCase(), cliente: "AGENDA CERRADA", matricula: "---", bastidor: "", renting: "" };

                let isVacM = !!bloqueoM; 
                let isVacA = !!bloqueoA;

                if (hora === '19') {
                    if (cM) html += window.renderizarCeldaCita(cM, 'MANUEL', isVacM ? '#e5e7eb' : '#c9daf8', isVacM ? 'text-gray-500' : 'text-blue-900', isVacM ? 'border-gray-300' : 'border-blue-200', true);
                    else if (cA) html += window.renderizarCeldaCita(cA, 'ANTONIO', isVacA ? '#e5e7eb' : '#f9cb9c', isVacA ? 'text-gray-500' : 'text-orange-900', isVacA ? 'border-gray-300' : 'border-orange-300', true);
                    else html += window.renderizarCeldaCita(null, 'ÚNICA ENTREGA', '#f3f4f6', 'text-gray-400', 'border-gray-300', true);
                } else {
                    html += window.renderizarCeldaCita(cM, 'MANUEL', isVacM ? '#e5e7eb' : '#c9daf8', isVacM ? 'text-gray-500' : 'text-blue-900', isVacM ? 'border-gray-300' : 'border-blue-200', false);
                    html += window.renderizarCeldaCita(cA, 'ANTONIO', isVacA ? '#e5e7eb' : '#f9cb9c', isVacA ? 'text-gray-500' : 'text-orange-900', isVacA ? 'border-gray-300' : 'border-orange-300', false);
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
    
    let yaEntregado = cocheEnBaseDatos && (cocheEnBaseDatos.entregado === true || cocheEnBaseDatos.entregado === "true");
    let estaRetenido = cocheEnBaseDatos && !yaEntregado && ((cocheEnBaseDatos.enTaller && !cocheEnBaseDatos.finTaller) || (cocheEnBaseDatos.enRecambios && !cocheEnBaseDatos.finRecambios));
    
    let ahora = new Date();
    let fechaCitaObj = cita.fechaHora ? new Date(cita.fechaHora) : ahora;
    let esPasada = fechaCitaObj < ahora;
    let alertaVisual = '';
    
    let esPendiente = cita.estado === 'pendiente';
    let tagPendiente = esPendiente ? `<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1 animate-pulse"><i class="ph-bold ph-hourglass"></i> PENDIENTE</span>` : '';
    
    // Estandarizamos el rol a minúsculas para que no falle por mayúsculas en las tarjetas
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
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-[#00b0f0] text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce cursor-pointer z-10" onclick="if(window.event) window.event.stopPropagation(); window.preguntarSiEntregado('${idFb}', '${modeloSeguro}', '${matriculaSegura}', '${diaStr}', '${horaStr}')"><i class="ph-bold ph-question text-lg"></i></div>`;
        borderColor = "border-[#00b0f0] border-2"; 
    } else if (estaRetenido && cita.matricula !== "---" && !cita.isBlock) {
        let escMat = window.escapeJS(cita.matricula); let escMod = window.escapeJS(cita.modelo);
        alertaVisual = `<div class="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse cursor-pointer z-10" onclick="if(window.event) window.event.stopPropagation(); window.comprobarAlertaEntrega('${escMat}', '${escMod}')"><i class="ph-bold ph-warning"></i></div>`;
    }

    let textoVO = (cita.entregaVO) ? String(cita.entregaVO).toUpperCase().trim() : '';
    let tagVO = (textoVO === 'SÍ' || textoVO === 'SI') ? `<span class="bg-purple-200 text-purple-900 border border-purple-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest"><i class="ph-bold ph-car-profile"></i> VO</span>` : '';
    let tagNotas = cita.notas ? `<span class="bg-yellow-200 text-yellow-900 border border-yellow-300 text-[8px] px-1 py-0.5 rounded shadow-sm font-black tracking-widest ml-1" title="${window.escapeJS(cita.notas)}"><i class="ph-bold ph-note"></i> NOTAS</span>` : '';
    
    let opacidad = "opacity-100"; let onclickCode = ""; let cursorClass = "";
    
    if (cita.isBlock) {
        onclickCode = `onclick="window.borrarBloqueo('${cita.idBloqueo}')"`;
        cursorClass = "cursor-pointer hover:ring-2 hover:ring-red-500 hover:scale-[1.02] shadow-sm";
    } 
    else if (cita.id && cita.matricula !== "---") {
        let d = fechaCitaObj.getFullYear() + "-" + String(fechaCitaObj.getMonth()+1).padStart(2,'0') + "-" + String(fechaCitaObj.getDate()).padStart(2,'0');
        let h = String(fechaCitaObj.getHours()).padStart(2,'0') + ":00";
        let escCliente = window.escapeJS(cita.cliente); let escTlf = window.escapeJS(cita.telefono);
        let escEmail = window.escapeJS(cita.email); let escVO = window.escapeJS(cita.entregaVO);
        let escMod = window.escapeJS(cita.modelo); let escMat = window.escapeJS(cita.matricula);
        let escRen = window.escapeJS(cita.renting); let escNotas = window.escapeJS(cita.notas);
        
        if (esPendiente && window.rolActivo === "backoffice") {
            cursorClass = "cursor-not-allowed";
        } else {
            onclickCode = `onclick="window.abrirEdicionCita('${cita.id}', '${d}', '${h}', '${nombreAgente}', '${escCliente}', '${escMat}', '${escTlf}', '${escEmail}', '${escVO}', '${escNotas}')"`;
            cursorClass = "cursor-pointer hover:ring-2 hover:ring-[#00b0f0] hover:scale-[1.02] shadow-sm";
        }
    }

    // Botones rápidos para que Entregas acepte o rechace sin abrir la cita
    let botonesAprobacion = "";
    if (esPendiente && (rolUsuarioLogueado === 'entregas' || rolUsuarioLogueado === 'admin')) {
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
         <div class="flex justify-between items-start mb-1">
           <h4 class="font-black text-[11px] ${textColor} uppercase leading-tight line-clamp-1 flex-1">${cita.modelo}</h4>
           <div class="flex items-center">${tagVO} ${tagPendiente} ${tagNotas}</div>
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

    if (!esDevolucion) {
        htmlCampos += `
            <div class="text-left mb-3">
                <label class="text-xs font-bold text-gray-500 uppercase">Entregador Asignado</label>
                <select id="n-age" class="swal2-select !w-full !m-0 !mt-1">
                    <option value="MANUEL">MANUEL</option>
                    <option value="ANTONIO">ANTONIO</option>
                </select>
            </div>
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
            if (!mat || !cli || !fec || !hor) { Swal.showValidationMessage('Matrícula, nombre, fecha y hora son obligatorios.'); return false; }
            const agenteAsignado = esDevolucion ? 'MANUEL' : document.getElementById('n-age').value;
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

            let resultadoFormat = {
                matricula: mat, cliente: cli, fecha: fec, hora: hor,
                telefono: document.getElementById('n-tlf') ? document.getElementById('n-tlf').value.trim() : '',
                renting: document.getElementById('n-renting') ? document.getElementById('n-renting').value.toUpperCase().trim() : ''
            };

            if (esDevolucion) {
                resultadoFormat.modelo = 'DEVOLUCIÓN' + (resultadoFormat.renting ? ` - ${resultadoFormat.renting}` : '');
                resultadoFormat.agente = 'MANUEL'; 
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
        // 1. Limpiamos el texto del rol para evitar fallos por mayúsculas o espacios
        let rolLimpio = String(window.rolActivo || '').toLowerCase().replace(/\s/g, '');
        
        // 2. Asignamos el estado correcto
        const estadoAsignado = (rolLimpio === "backoffice" || rolLimpio === "administracion") ? "pendiente" : "confirmada";
        
        try {
            const nuevaRef = window.doc(window.collection(window.db, "citas_agenda"));
            await window.setDoc(nuevaRef, {
                matricula: formValues.matricula, cliente: formValues.cliente, modelo: formValues.modelo,
                fecha: formValues.fecha, hora: formValues.hora, agente: formValues.agente,
                telefono: formValues.telefono || "", email: formValues.email || "", bastidor: formValues.bastidor || "",
                renting: formValues.renting || "", entregaVO: formValues.devuelveVehiculo || "NO", 
                notas: formValues.notas || "", creadoPor: window.usuarioActivo, 
                estado: estadoAsignado // <-- Se inyecta el estado correcto
            });

            // 🔥 DISPARADOR DE CORREO: Solo enviamos si NO es pendiente
            if(estadoAsignado !== "pendiente" && typeof window.dispararEmailCita === 'function') {
                 window.dispararEmailCita(formValues, "enviar_correo");
            }

            // Mostramos la alerta correcta según el estado
            if (estadoAsignado === "pendiente") {
                Swal.fire('Solicitud de Cita', 'Guardada como PENDIENTE. Entregas revisará el hueco en el cuadrante.', 'info');
            } else {
                Swal.fire('¡Agendada!', 'La cita se ha guardado de forma segura en tiempo real.', 'success');
            }
        } catch (error) { 
            Swal.fire('Fallo', 'Error al conectar con Firebase.', 'error'); 
        }
    }
}; // <-- Fin de la función crearCitaManual
    window.generarListadoDiario = async function() {
    const { value: fechaSeleccionada } = await Swal.fire({
        title: 'Hoja de Preparaciones',
        input: 'date',
        inputLabel: 'Selecciona el día para generar el listado de lavaderos/preparadores:',
        inputValue: new Date().toISOString().split('T')[0],
        showCancelButton: true,
        confirmButtonColor: '#001e50',
        confirmButtonText: 'Generar Hoja'
    });

    if (!fechaSeleccionada) return;

    let partes = fechaSeleccionada.split('-');
    let fechaVisual = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let entregasDelDia = window.datosAgenda.filter(cita => {
        return cita.fechaHora.startsWith(fechaSeleccionada) && !cita.isBlock && !cita.modelo.startsWith('DEVOLUCIÓN');
    });

    entregasDelDia.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));

    if (entregasDelDia.length === 0) {
        return Swal.fire('Día Libre', `No hay vehículos para entregar programados el día ${fechaVisual}.`, 'info');
    }

    // Dibujamos las filas, incluyendo la nueva celda de Renting
    let filasHTML = entregasDelDia.map(cita => {
        let hora = cita.fechaHora.split('T')[1].substring(0, 5);
        let notas = cita.notas ? cita.notas : '';
        let rentingStr = cita.renting ? cita.renting : 'N/A'; // <-- Capturamos el Renting

        return `
            <tr style="border-bottom: 1px solid #cbd5e1; background-color: #f8fafc;">
                <td style="padding: 12px 10px; font-weight: 900; font-size: 16px; color: #001e50; border-right: 1px solid #cbd5e1;">${hora}</td>
                <td style="padding: 12px 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; border-right: 1px solid #cbd5e1;">${cita.modelo}</td>
                <td style="padding: 12px 10px; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #475569; border-right: 1px solid #cbd5e1;">${rentingStr}</td>
                <td style="padding: 12px 10px; border-right: 1px solid #cbd5e1;">
                    <span style="font-size: 14px; font-weight: 900; background: white; padding: 2px 6px; border: 1px solid #cbd5e1; border-radius: 4px;">${cita.matricula}</span>
                    <div style="font-size: 10px; color: #64748b; margin-top: 4px;">VIN: ${cita.bastidor || 'N/A'}</div>
                </td>
                <td style="padding: 12px 10px; color: #475569; font-size: 12px; font-style: italic; border-right: 1px solid #cbd5e1;">${notas}</td>
                <td style="padding: 12px 10px; width: 60px;"></td>
            </tr>
        `;
    }).join('');

    // Estructura del PDF con la nueva cabecera
    let elementoFalso = document.createElement('div');
    elementoFalso.innerHTML = `
        <div style="padding: 30px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #001e50; padding-bottom: 15px; margin-bottom: 25px;">
                <div>
                    <h1 style="margin:0; font-size: 24px; text-transform: uppercase; font-weight: 900; color: #001e50;">HOJA DE PREPARACIONES</h1>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 12px; font-weight: bold; color: #64748b;">FECHA OPERATIVA</p>
                    <h2 style="margin: 0; font-size: 24px; color: #00b0f0;">${fechaVisual}</h2>
                </div>
            </div>
            <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #001e50; color: white;">
                        <th style="padding: 12px 10px; width: 60px;">Hora</th>
                        <th style="padding: 12px 10px;">Vehículo</th>
                        <th style="padding: 12px 10px; width: 110px;">Renting</th>
                        <th style="padding: 12px 10px; width: 130px;">Matrícula / VIN</th>
                        <th style="padding: 12px 10px;">Notas</th>
                        <th style="padding: 12px 10px; text-align: center; width: 50px;">OK</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
            </table>
        </div>
    `;

    let opcionesPDF = {
        margin:       0.4,
        filename:     `Preparaciones_${fechaSeleccionada}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    Swal.fire({ title: 'Procesando Listado...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    html2pdf().set(opcionesPDF).from(elementoFalso).outputPdf('blob').then(function(pdfBlob) {
        let pdfUrl = URL.createObjectURL(pdfBlob);
        
        Swal.fire({
            title: '📄 Hoja Generada',
            text: '¿Cómo se lo quieres enviar a los preparadores?',
            icon: 'success',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            denyButtonColor: '#3b82f6', 
            cancelButtonColor: '#25D366', 
            confirmButtonText: '⬇️ Descargar',
            denyButtonText: '🖨️ Imprimir',
            cancelButtonText: '💬 WhatsApp'
        }).then((result) => {
            if (result.isConfirmed) {
                html2pdf().set(opcionesPDF).from(elementoFalso).save();
            } else if (result.isDenied) {
                let iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = pdfUrl;
                document.body.appendChild(iframe);
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                html2pdf().set(opcionesPDF).from(elementoFalso).save();
                let msg = `¡Hola Equipo! Os adjunto la Hoja de Preparaciones y Lavado de vehículos para el día *${fechaVisual}*.`;
                Swal.fire({
                    title: 'Abriendo WhatsApp...',
                    html: '<p class="text-sm text-gray-600">El listado se ha descargado en tu ordenador.<br><br><b>Arrastra el PDF</b> a la ventana de WhatsApp Web para pasarlo por el grupo.</p>',
                    icon: 'info', confirmButtonColor: '#001e50'
                });
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            }
        });
    });
};
// ==========================================
    // ✅ VALIDACIONES DE AGENDA (ENTREGAS)
    // ==========================================
    window.aprobarCitaPendiente = async function(idCita, matricula) {
        try {
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
                // 1. Recuperamos los datos de la cita antes de borrarla para saber quién la creó
                const docRef = window.doc(window.db, "citas_agenda", idCita);
                const docSnap = await window.getDoc(docRef);
                
                if (docSnap.exists()) {
                    const datosCita = docSnap.data();
                    
                    // 2. Si la cita la creó un usuario de Back Office, le creamos una notificación
                    if (datosCita.creadoPor) {
                        const refNotificacion = window.doc(window.collection(window.db, "notificaciones_agenda"));
                        await window.setDoc(refNotificacion, {
                            vehiculo: modeloVehiculo,
                            matricula: datosCita.matricula || "S/M",
                            fechaCita: `${datosCita.fecha} a las ${datosCita.hora}h`,
                            solicitadoPor: datosCita.creadoPor, // Guardará el nombre del Back Office
                            motivoRechazo: motivo || "No especificado por el agente",
                            fechaRegistro: new Date().toLocaleString(),
                            leido: false // Para saber si ya vio el aviso
                        });
                    }
                }

                // 3. Ahora sí, borramos la cita pendiente para liberar el hueco en el cuadrante
                await window.deleteDoc(window.doc(window.db, "citas_agenda", idCita));
                
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Cita rechazada y notificada', showConfirmButton: false, timer: 3000 });
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo procesar el rechazo de la cita.', 'error');
            }
        }
    };
    // ==========================================
// ❓ PREGUNTA INTERMEDIA PARA CITAS ATRASADAS
// ==========================================
window.preguntarSiEntregado = async function(idFb, modelo, matricula, dia, hora) {
    // Si la cita no tiene un coche vinculado en la base de datos activa
    if (idFb === 'no_db') {
        return Swal.fire('Aviso', 'Este vehículo no se encuentra en la base de datos activa.', 'info');
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
            window.marcarComoEntregado(idFb);
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