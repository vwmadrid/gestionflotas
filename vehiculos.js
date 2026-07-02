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
// 🚗 GESTIÓN DE VEHÍCULOS, TARJETAS Y LOGÍSTICA
// ==========================================

window.calcularProgreso = function(c) {
    let pct = 20; 
    let enInventario = c.pasoAInventario !== false; 
    if (enInventario) pct += 20; 
    if (enInventario && (!c.enTaller || c.finTaller)) pct += 20;
    if (enInventario && (!c.enRecambios || c.finRecambios)) pct += 20;
    if (c.fechaCita) pct += 20; 
    if (pct > 100) pct = 100;
    if (c.entregado === true || c.entregado === "true") pct = 100;

    let color = 'bg-red-500';
    if (pct >= 40) color = 'bg-orange-500';
    if (pct >= 60) color = 'bg-amber-400';
    if (pct >= 80) color = 'bg-[#00b0f0]';
    if (pct === 100) color = 'bg-emerald-500';
    return { pct, color };
};
// Herramienta global para copiar al portapapeles
window.copiarAlPortapapeles = function(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: '¡Copiado!',
            text: texto,
            showConfirmButton: false,
            timer: 1500
        });
    }).catch(err => {
        console.error('Error al copiar', err);
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Fallo al copiar', showConfirmButton: false, timer: 1500 });
    });
};
// ==========================================
// 🚛 GESTOR DE PEDIDOS A CAMPA
// ==========================================

// ==========================================
// 🚛 GESTOR DE PEDIDOS A CAMPA
// ==========================================

window.abrirGestorPedidosCampa = function() {
    // 1. Buscamos coches que tienen cita, NO están entregados, y NO están pedidos
    let pendientesPedir = todosLosCoches.filter(c => c.fechaCita && c.entregado !== true && c.entregado !== "true" && c.cochePedido !== true);

    if (pendientesPedir.length === 0) {
        return Swal.fire({
            title: '¡Todo al día!',
            text: 'No tienes ningún vehículo agendado pendiente de solicitar a la campa.',
            icon: 'success',
            confirmButtonColor: '#001e50'
        });
    }

    // 🔥 2. ORDENAMOS LA LISTA POR FECHA DE CITA (De más urgente a menos)
    pendientesPedir.sort((a, b) => {
        let parseFecha = (fStr) => {
            if (!fStr) return 0;
            // La fecha viene como "DD/MM/AAAA - HH:MMh", nos quedamos con la parte de la fecha
            let fechaLimpia = fStr.split(' - ')[0]; 
            let partes = fechaLimpia.split('/'); // [DD, MM, AAAA]
            if (partes.length === 3) {
                // Formato año, mes (empieza en 0), día
                return new Date(partes[2], partes[1] - 1, partes[0]).getTime();
            }
            return 0;
        };
        return parseFecha(a.fechaCita) - parseFecha(b.fechaCita);
    });

    // 3. Generamos el HTML de la lista con los datos clave
    let htmlLista = pendientesPedir.map(c => `
        <div id="coche-pedido-${c.fila}" class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2 transition-all duration-300">
            <div class="text-left">
                <p class="font-black text-sm text-[#001e50] uppercase">${c.C}</p>
                <p class="text-xs font-bold text-gray-500 tracking-widest">VIN: ${c.A}</p>
                <p class="text-xs font-bold text-[#00b0f0] mt-1"><i class="ph-bold ph-calendar-check"></i> Cita: ${c.fechaCita}</p>
            </div>
            <button onclick="window.marcarComoPedido('${c.fila}')" class="bg-white border border-gray-300 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500 transition-colors px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm">
                <i class="ph-bold ph-check-square text-lg"></i> Pedir
            </button>
        </div>
    `).join('');

    // 4. Mostramos la ventana emergente con la lista
    Swal.fire({
        title: 'Bastidores Pendientes',
        html: `<div class="max-h-80 overflow-y-auto mt-4 p-1 custom-scrollbar">${htmlLista}</div>`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        cancelButtonColor: '#6b7280',
        width: '600px'
    });
};

window.marcarComoPedido = async function(id) {
    try {
        // Ocultamos visualmente el elemento de la lista al instante
        let divCoche = document.getElementById(`coche-pedido-${id}`);
        if (divCoche) {
            divCoche.style.opacity = '0';
            setTimeout(() => divCoche.style.display = 'none', 300);
        }

        // 🔥 ACTULIZACIÓN LOCAL INSTANTÁNEA PARA QUE LA AGENDA LO VEA
        let cocheLocal = todosLosCoches.find(c => c.fila === id);
        if (cocheLocal) cocheLocal.cochePedido = true;

        // Actualizamos en la base de datos de Firebase
        await window.updateDoc(window.doc(window.db, "vehiculos", id), {
            cochePedido: true
        });

        // 🔥 OBLIGAMOS A LA AGENDA A REPINTARSE PARA MOSTRAR LA ETIQUETA
        if (typeof window.dibujarCuadranteMes === 'function') window.dibujarCuadranteMes();
        if (typeof window.renderizarVistas === 'function') window.renderizarVistas();

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marcado como pedido', showConfirmButton: false, timer: 1500 });
        
    } catch (error) {
        console.error("Error al marcar pedido", error);
        Swal.fire('Error', 'No se pudo guardar la información en la base de datos.', 'error');
    }
};

window.marcarComoPedido = async function(id) {
    try {
        // Ocultamos visualmente el elemento de la lista al instante para que la experiencia sea muy rápida
        let divCoche = document.getElementById(`coche-pedido-${id}`);
        if (divCoche) {
            divCoche.style.opacity = '0';
            setTimeout(() => divCoche.style.display = 'none', 300);
        }

        // Actualizamos en la base de datos de Firebase
        await window.updateDoc(window.doc(window.db, "vehiculos", id), {
            cochePedido: true
        });

        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marcado como pedido', showConfirmButton: false, timer: 1500 });
        
    } catch (error) {
        console.error("Error al marcar pedido", error);
        Swal.fire('Error', 'No se pudo guardar la información en la base de datos.', 'error');
    }
};
window.renderizarVistas = function() {
   let activos = todosLosCoches.filter(c => c.pasoAInventario !== false && c.entregado !== true && c.entregado !== "true");
   let inventario = todosLosCoches.filter(c => (c.pasoAInventario === true || c.pasoAInventario === "true") && (c.entregado !== true && c.entregado !== "true"));
   let filtrados = activos.filter(c => {
      let enT = c.enTaller && !c.finTaller; 
      let enR = c.enRecambios && !c.finRecambios;
      let tieneCita = !!c.fechaCita;

      if (filtroActual === 'todos') return true;
      if (filtroActual === 'pendientes') return !enT && !enR && !tieneCita;
      if (filtroActual === 'concita') return !enT && !enR && tieneCita;
      if (filtroActual === 'taller') return enT;
      if (filtroActual === 'recambios') return enR;
      return true;
   });

   if (modoVistaActual === 'tarjetas') {
       let div = document.getElementById('contenedorTarjetas');
       if (filtrados.length === 0) {
           div.innerHTML = `<div class="col-span-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg">No hay vehículos en esta categoría.</p></div>`;
       } else {
           div.innerHTML = filtrados.map(c => window.renderTarjetaCompacta(c)).join('');
       }
   } else {
       window.renderTablaModoExcel(filtrados);
   }

   // 🔥 NUEVO: DESBLOQUEO FORZADO PARA BACKOFFICE
   // Si el usuario es de backoffice, reactivamos los botones de peticiones
   if (window.rolActivo === 'backoffice' || window.rolActivo === 'admin') {
       // Usamos un pequeño retardo para asegurar que el navegador ya ha terminado de pintar los botones
       setTimeout(() => {
           // Buscamos cualquier botón o celda de tabla que contenga la llamada a "pedirInst"
           const botonesBloqueados = document.querySelectorAll('button[onclick*="pedirInst"], td[onclick*="pedirInst"]');
           
           botonesBloqueados.forEach(btn => {
               btn.disabled = false;               // Quitamos el estado deshabilitado del navegador
               btn.style.pointerEvents = 'auto';   // Permitimos que el clic funcione
               btn.style.cursor = 'pointer';       // Restauramos el cursor de la manita
               btn.style.opacity = '1';            // Le devolvemos el color original si estaba atenuado
               btn.classList.remove('cursor-not-allowed', 'opacity-50'); // Limpiamos clases de bloqueo de Tailwind si las hubiera
           });
       }, 50);
   }
};
window.renderTarjetaCompacta = function(c) {
  let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27"); 
  let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
  let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
  
  let escA = window.escapeJS(c.A); let escB = window.escapeJS(c.B); let escC = window.escapeJS(c.C);
  let escRen = window.escapeJS(c.renting); let escAge = window.escapeJS(c.agencia);

  let enT = c.enTaller && !c.finTaller;
  let enR = c.enRecambios && !c.finRecambios;
  let tieneCita = !!c.fechaCita;

  let isAlerta = tieneCita && (enT || enR);
  let borderAlerta = isAlerta ? 'border-l-8 border-red-600 bg-red-50/50' : 'border-l-8 border-[#001e50]';
  let prog = window.calcularProgreso(c);

  let bTaller = c.finTaller ? `<span class="status-btn bg-emerald-100 text-emerald-800"><i class="ph-bold ph-check"></i> Tall. OK</span>` : c.enTaller ? `<button onclick="window.pedirInst(this, '${c.fila}', 'taller')" class="status-btn bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 shadow-sm"><i class="ph-bold ph-plus"></i> Añadir Petición</button>` : `<button onclick="window.pedirInst(this, '${c.fila}', 'taller')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm">Taller <i class="ph-bold ph-plus"></i></button>`;
  let bRecambios = c.finRecambios ? `<span class="status-btn bg-emerald-100 text-emerald-800"><i class="ph-bold ph-check"></i> Rec. OK</span>` : c.enRecambios ? `<button onclick="window.pedirInst(this, '${c.fila}', 'recambios')" class="status-btn bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200 shadow-sm"><i class="ph-bold ph-plus"></i> Añadir Petición</button>` : `<button onclick="window.pedirInst(this, '${c.fila}', 'recambios')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm">Recambios <i class="ph-bold ph-plus"></i></button>`;

  let arrTaller = c.peticionesTaller || (c.instruccionTaller ? [{fecha: c.fechaEntradaTaller || '-', motivo: c.instruccionTaller, url: c.urlParte}] : []);
  let arrRecambios = c.peticionesRecambios || (c.instruccionRecambios ? [{fecha: c.fechaEntradaRecambios || '-', motivo: c.instruccionRecambios, url: c.urlParte}] : []);

  let txtTallerInfo = c.enTaller ? `<div class="text-[9px] bg-amber-50 text-amber-800 px-2 py-1 rounded mt-1 font-bold">OR: ${c.ordenTaller||'Pte'} | Prev: ${c.fechaTaller||'Pte'}</div>` : '';
  let txtRecambiosInfo = c.enRecambios ? `<div class="text-[9px] bg-teal-50 text-teal-800 px-2 py-1 rounded mt-1 font-bold">Ped: ${c.ordenRecambios||'Pte'} | Prev: ${c.fechaRecambios||'Pte'}</div>` : '';

  txtTallerInfo += arrTaller.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-amber-400 pl-1.5"><b class="text-amber-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');
  txtRecambiosInfo += arrRecambios.map(p => `<div class="text-[9px] leading-tight text-gray-600 mt-1 border-l-2 border-teal-500 pl-1.5"><b class="text-teal-700">${p.fecha}:</b> ${p.motivo} ${p.url ? `<a href="${p.url}" target="_blank" class="text-blue-500 hover:text-blue-700 ml-1" title="Ver Acta"><i class="ph-bold ph-paperclip"></i></a>` : ''}</div>`).join('');

  let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';
  let htmlAlerta = isAlerta ? `<div class="bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded flex items-center justify-center gap-1.5 animate-pulse shadow-md w-full mb-3"><i class="ph-bold ph-warning-circle text-sm"></i> ¡URGENTE! TIENE CITA EL ${c.fechaCita}</div>` : '';

  return `
  <!-- Añadimos h-full flex flex-col para que ocupe todo el alto de su celda y no flote -->
  <div class="card-mini ${borderAlerta} p-5 fila-coche h-full flex flex-col">
    ${htmlAlerta}
    <div class="flex justify-between items-start mb-2 gap-2">
      <div class="min-w-0 pr-2 flex-1">
        <h3 class="font-black text-base text-[#001e50] truncate uppercase">${c.C}</h3>
      </div>
      <div class="flex gap-1 flex-shrink-0 flex-wrap justify-end max-w-[150px]">
         <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-8 h-8 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-lg"></i>${burbuja}</button>
         <button onclick="window.editarVehiculoBasico('${c.fila}', '${escA}', '${escB}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-colors" title="Editar info"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
         <button onclick="window.marcarComoEntregado('${c.fila}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white shadow-sm transition-colors" title="Entregar Vehículo"><i class="ph-bold ph-key text-lg"></i></button>
         
         <button onclick="window.revertirLogistica('${c.fila}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-amber-500 hover:text-white shadow-sm transition-colors" title="Devolver a Logística"><i class="ph-bold ph-arrow-u-up-left text-lg"></i></button>
         
         <button onclick="window.gestionarTraslado('${c.fila}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white shadow-sm transition-colors" title="Traslado a Concesionario"><i class="ph-bold ph-airplane-takeoff text-lg"></i></button>
         <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm transition-colors" title="Eliminar"><i class="ph-bold ph-trash text-lg"></i></button>  
      </div>
    </div>
    
    <div class="flex gap-2 mb-3">
        <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-buildings"></i> ${c.renting || 'Renting'}</button>
        <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-truck"></i> ${c.agencia || 'Agencia'}</button>
    </div>

    <!-- 🔧 ZONA REPARADA: Matrícula, Bastidor y Etiquetas -->
    <div class="flex items-start justify-between mb-3 gap-2 overflow-hidden">
       <!-- Botones clicables con restricción de ancho (truncate) -->
       <div class="flex flex-col gap-1.5 min-w-0 flex-1">
           <button onclick="window.copiarAlPortapapeles('${escB}')" title="Copiar" class="cursor-pointer hover:bg-gray-200 transition-colors bg-gray-100 border border-gray-300 text-gray-800 px-2 py-1.5 rounded text-xs font-black tracking-widest shadow-sm flex items-center justify-between gap-1 w-full overflow-hidden">
               <span class="truncate">${c.B}</span> <i class="ph-bold ph-copy text-gray-400 flex-shrink-0"></i>
           </button>
           <button onclick="window.copiarAlPortapapeles('${escA}')" title="Copiar" class="cursor-pointer hover:bg-gray-100 transition-colors bg-white border border-gray-300 text-gray-700 px-2 py-1.5 rounded text-xs font-black tracking-widest shadow-sm flex items-center justify-between gap-1 w-full overflow-hidden">
               <span class="truncate">VIN: ${c.A}</span> <i class="ph-bold ph-copy text-gray-400 flex-shrink-0"></i>
           </button>
       </div>
       
       <!-- Etiquetas de Cita y Pedido -->
       <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
           ${c.fechaCita ? `<div class="bg-blue-50 text-[#001e50] border border-blue-200 px-2 py-1.5 rounded font-black text-[10px] flex items-center gap-1 shadow-sm uppercase"><i class="ph-bold ph-calendar-check"></i> Cita: ${c.fechaCita}</div>` : ''}
           ${c.cochePedido ? `<div class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1.5 rounded font-black text-[10px] flex items-center gap-1 shadow-sm uppercase tracking-widest"><i class="ph-bold ph-truck"></i> Pedido</div>` : ''}
       </div>
    </div>

    <!-- Barra de progreso -->
    <div class="w-full bg-gray-200 rounded-full h-2 mb-3 relative overflow-hidden flex-shrink-0">
       <div class="${prog.color} h-2 transition-all duration-500" style="width: ${prog.pct}%"></div>
       <span class="absolute inset-0 flex items-center justify-center text-[7px] font-black text-gray-800 drop-shadow-md mix-blend-overlay">${prog.pct}%</span>
    </div>

    <!-- MT-AUTO: Empuja el contenedor de botones de taller hacia abajo para igualar el diseño -->
    <div class="flex flex-col gap-2 mt-auto">
      <div class="flex gap-2 w-full">
        <div class="w-1/2 flex flex-col">${bTaller} ${txtTallerInfo}</div>
        <div class="w-1/2 flex flex-col">${bRecambios} ${txtRecambiosInfo}</div>
      </div>
    </div>
  </div>`;
};

window.renderTablaModoExcel = function(datosFiltrados) {
   let contenedor = document.getElementById('contenedorTabla');
   if(datosFiltrados.length === 0){ contenedor.innerHTML = "<p class='text-center p-10 font-bold text-gray-500'>Sin resultados en esta categoría.</p>"; return; }
   
   let html = `
   <table class="tabla-excel whitespace-nowrap">
     <thead>
       <tr>
         <th>Progreso</th><th>Modelo</th><th>Matrícula</th><th>Bastidor</th><th>Renting</th><th>Agencia</th>
         <th>Taller</th><th>Instr. Taller</th><th>Nº Orden</th><th>Entrada Tall.</th><th>Prev. Tall.</th><th>Fin Tall.</th>
         <th>Recambios</th><th>Instr. Recambios</th><th>Nº Pedido</th><th>Entrada Rec.</th><th>Prev. Rec.</th><th>Fin Rec.</th>
         <th class="bg-[#00b0f0]">Cita Entrega</th><th>Gestión</th>
       </tr>
     </thead><tbody id="filasTablaExcel">`;

   datosFiltrados.forEach(c => {
      let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
      let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27"); 
      let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27");
      let checkTaller = c.finTaller ? `<div class="excel-check check-fin">✓</div> FIN` : (c.enTaller ? `<div class="excel-check check-curso">X</div> CURSO` : `<div class="excel-check"></div> SOLICITAR`);
      let checkRecambios = c.finRecambios ? `<div class="excel-check check-fin">✓</div> FIN` : (c.enRecambios ? `<div class="excel-check check-curso">X</div> CURSO` : `<div class="excel-check"></div> SOLICITAR`);
      let prog = window.calcularProgreso(c);
      
      let escC = window.escapeJS(c.C);
      let escRen = window.escapeJS(c.renting); let escAge = window.escapeJS(c.agencia);
      let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';

      html += `
      <tr class="fila-coche hover:bg-[#e0f2fe]">
         <td class="text-center font-bold text-white ${prog.color}">${prog.pct}%</td>
         <td class="font-bold text-gray-900">${c.C}</td>
         <td class="font-bold bg-gray-50 text-center border-l border-r border-gray-200">${c.B}</td>
         <td class="font-mono text-gray-500 text-[10px]">${c.A}</td>
         <td class="cursor-pointer text-blue-600 hover:underline" onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')">${c.renting || '-'}</td>
         <td class="cursor-pointer text-blue-600 hover:underline border-r border-gray-200" onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')">${c.agencia || '-'}</td>

         <td class="cursor-pointer hover:bg-gray-100" onclick="window.pedirInst(this, '${c.fila}', 'taller')">${checkTaller}</td>
         <td class="text-gray-500 truncate max-w-[120px]" title="${c.instruccionTaller||''}">${c.instruccionTaller || '-'}</td>
         <td class="text-center font-bold text-gray-600">${c.ordenTaller || '-'}</td>
         <td class="text-center text-gray-400">${c.fechaEntradaTaller || '-'}</td>
         <td class="text-center text-gray-500">${c.fechaTaller || '-'}</td>
         <td class="text-center text-emerald-600 font-bold border-r border-gray-200">${c.fechaFinTaller || '-'}</td>
         
         <td class="cursor-pointer hover:bg-gray-100" onclick="window.pedirInst(this, '${c.fila}', 'recambios')">${checkRecambios}</td>
         <td class="text-gray-500 truncate max-w-[120px]" title="${c.instruccionRecambios||''}">${c.instruccionRecambios || '-'}</td>
         <td class="text-center font-bold text-gray-600">${c.ordenRecambios || '-'}</td>
         <td class="text-center text-gray-400">${c.fechaEntradaRecambios || '-'}</td>
         <td class="text-center text-gray-500">${c.fechaRecambios || '-'}</td>
         <td class="text-center text-emerald-600 font-bold border-r border-gray-200">${c.fechaFinRecambios || '-'}</td>
         
         <td class="font-bold text-[#001e50] text-center bg-blue-50">${c.fechaCita || '-'}</td>
         <td class="text-center flex items-center justify-center gap-3 pt-2 pb-2 px-2">
            <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="text-[#25D366] hover:scale-110 relative" title="Abrir Chat"><i class="ph-fill ph-whatsapp-logo text-xl"></i>${burbuja}</button>
            <button onclick="window.marcarComoEntregado('${c.fila}')" class="text-gray-400 hover:text-emerald-600" title="Entregar"><i class="ph-bold ph-key text-xl"></i></button>
            
            <!-- 🔥 NUEVO BOTÓN EXCEL: Revertir a logística -->
            <button onclick="window.revertirLogistica('${c.fila}')" class="text-gray-400 hover:text-amber-500" title="Devolver a Logística"><i class="ph-bold ph-arrow-u-up-left text-xl"></i></button>
            
            <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="text-red-400 hover:text-red-600" title="Eliminar vehículo"><i class="ph-bold ph-trash text-xl"></i></button>
         </td>
      </tr>`;
   });
   html += `</tbody></table>`; contenedor.innerHTML = html;
};

window.renderizarDepartamentos = function(depto) {
   let divP = document.getElementById('contenedorTarjetas');
   let activos = todosLosCoches.filter(c => (c.entregado !== true && c.entregado !== "true") && (depto === 'taller' ? (c.enTaller && !c.finTaller) : (c.enRecambios && !c.finRecambios)));
   let p = depto === 'taller' ? 'p' : 'r';
   let propInfo = depto === 'taller' ? 'ordenTaller' : 'ordenRecambios';
   let Tipo = depto === 'taller' ? 'Taller' : 'Recambios';

   let nuevos = activos.filter(c => !c[propInfo]);
   let enRep = activos.filter(c => c[propInfo]);

   divP.innerHTML = `
     <div class="col-span-full mb-1"><h3 class="text-xl font-black flex items-center gap-2 text-[#001e50]"><i class="ph-fill ph-tray-arrow-down"></i> Bandeja Entrada (Nuevas Peticiones)</h3></div>
     ${nuevos.length ? nuevos.map(c => window.renderActivaDpto(c, p, c, Tipo)).join('') : '<p class="text-gray-400 font-bold col-span-full mb-6 bg-white p-4 rounded-xl border border-gray-200 text-center">Ninguna petición pendiente.</p>'}
     
     <div class="col-span-full mb-1 mt-6 border-t border-gray-200 pt-6"><h3 class="text-xl font-black flex items-center gap-2 text-[#001e50]"><i class="ph-fill ${depto==='taller'?'ph-wrench':'ph-package'}"></i> Gestión en Curso</h3></div>
     ${enRep.length ? enRep.map(c => window.renderActivaDpto(c, p, c, Tipo)).join('') : '<p class="text-gray-400 font-bold col-span-full bg-white p-4 rounded-xl border border-gray-200 text-center">Sin vehículos en curso.</p>'}
   `;
};

window.renderActivaDpto = function(c, pre, obj, tipo) {
  let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27");
  let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
  let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
  
  let bClass = tipo === 'Taller' ? 'border-t-4 border-amber-400' : 'border-t-4 border-teal-500';
  let fEntrada = tipo === 'Taller' ? c.fechaEntradaTaller : c.fechaEntradaRecambios;

  let arrHistorial = tipo === 'Taller' 
      ? (c.peticionesTaller || (c.instruccionTaller ? [{fecha: c.fechaEntradaTaller || '-', motivo: c.instruccionTaller, url: c.urlParte}] : []))
      : (c.peticionesRecambios || (c.instruccionRecambios ? [{fecha: c.fechaEntradaRecambios || '-', motivo: c.instruccionRecambios, url: c.urlParte}] : []));

  let btnInterDepto = '';
  
  if (tipo === 'Taller') {
      let btnR = c.finRecambios ? `<span class="status-btn bg-emerald-100 text-emerald-800 w-full animate-pulse border border-emerald-500 shadow-md"><i class="ph-bold ph-check"></i> Recambios Listos</span>` 
               : c.enRecambios  ? `<span class="status-btn bg-teal-100 text-teal-800 w-full"><i class="ph-bold ph-package"></i> Pedido en Curso</span>` 
                                : `<button onclick="window.pedirInst(this, '${c.fila}', 'recambios')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm w-full"><i class="ph-bold ph-plus"></i> Solicitar Recambios</button>`;
      
      btnInterDepto = `
      <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/2">Estado Recambios:</span> 
          <div class="w-1/2">${btnR}</div>
      </div>`;
      
  } else if (tipo === 'Recambios') {
      let btnT = c.finTaller ? `<span class="status-btn bg-emerald-100 text-emerald-800 w-full animate-pulse border border-emerald-500 shadow-md"><i class="ph-bold ph-check"></i> Taller Listo</span>` 
               : c.enTaller  ? `<span class="status-btn bg-amber-100 text-amber-800 w-full"><i class="ph-bold ph-wrench"></i> Taller en Curso</span>` 
                             : `<button onclick="window.pedirInst(this, '${c.fila}', 'taller')" class="status-btn bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 shadow-sm w-full"><i class="ph-bold ph-plus"></i> Enviar a Taller</button>`;
      
      btnInterDepto = `
      <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/2">Estado Taller:</span> 
          <div class="w-1/2">${btnT}</div>
      </div>`;
  }

  let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';

  return `
  <div class="card-mini ${bClass} p-5 flex flex-col fila-coche">
    <div class="flex justify-between items-start mb-3">
       <div class="min-w-0 pr-2">
         <h3 class="font-black text-lg text-[#001e50] uppercase truncate">${c.C}</h3>
         <p class="text-[11px] font-bold text-gray-400 mt-1 tracking-widest truncate">VIN: ${c.A}</p>
       </div>
       <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-10 h-10 flex-shrink-0 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm relative transition-transform hover:scale-105"><i class="ph-fill ph-whatsapp-logo text-xl"></i>${burbuja}</button>
    </div>
    
    <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
       <span class="bg-gray-100 border border-gray-200 text-gray-800 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">${c.B}</span>
       <span class="text-[9px] font-bold text-gray-400">Petición: ${fEntrada || '-'}</span>
    </div>

    <div class="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200 flex-grow max-h-48 overflow-y-auto custom-scrollbar">
      <p class="text-[10px] uppercase font-bold text-gray-400 mb-2 sticky top-0 bg-gray-50 pb-1">Historial de Peticiones</p>
      
      ${arrHistorial.length > 0 
          ? arrHistorial.map(p => `
              <div class="mb-2 pb-2 border-b border-gray-200/80 last:border-0 last:mb-0 last:pb-0">
                  <div class="text-[10px] text-gray-500 font-bold mb-0.5"><i class="ph-bold ph-calendar-blank"></i> Solicitado el: ${p.fecha}</div>
                  <div class="text-sm font-bold text-gray-800">${p.motivo}</div>
                  ${p.url ? `<a href="${p.url}" target="_blank" class="text-xs text-red-600 font-bold mt-1.5 inline-flex items-center gap-1 hover:underline"><i class="ph-bold ph-file-pdf"></i> Ver Acta Adjunta</a>` : ''}
              </div>`).join('')
          : `<p class="text-sm font-bold text-gray-800">No hay instrucciones registradas.</p>`
      }
      
      ${btnInterDepto}
    </div>

    <div class="space-y-3">
      <div class="flex gap-2">
         <div class="flex-1">
           <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Nº Orden / Pedido</label>
           <input type="text" id="o-${pre}-${c.fila}" value="${c.ordenTaller || c.ordenRecambios || ''}" placeholder="Tu Nº Interno..." class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#00b0f0] shadow-sm">
         </div>
         <div class="flex-1">
           <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Previsión Fin</label>
           <input type="date" id="f-${pre}-${c.fila}" value="${c.fechaTaller || c.fechaRecambios || ''}" class="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#00b0f0] shadow-sm">
         </div>
      </div>
      <div class="flex gap-2">
        <button onclick="window.ejecutarDpto('${tipo}', '${c.fila}', false)" class="flex-1 bg-gray-200 text-gray-800 font-bold py-2.5 rounded-lg text-[11px] hover:bg-gray-300 transition-colors uppercase shadow-sm"><i class="ph-bold ph-floppy-disk"></i> Guardar</button>
        <button onclick="window.ejecutarDpto('${tipo}', '${c.fila}', true)" class="flex-[1.5] bg-[#001e50] text-white font-bold py-2.5 rounded-lg text-[11px] hover:bg-blue-900 transition-colors uppercase flex items-center justify-center gap-1 shadow-sm"><i class="ph-bold ph-check-circle text-sm"></i> Finalizar Trabajo</button>
      </div>
    </div>
  </div>`;
};

window.abrirLectorPDF = function() { document.getElementById('inputUploadPDF').click(); };
window.procesarPDFs = function(event) { Swal.fire('En Desarrollo', 'La subida múltiple estará disponible próximamente.', 'info'); };

window.editarRentingAgencia = async function(id, rentingActual, agenciaActual) {
    // 1. Limpiamos los textos automáticos para que las cajas salgan vacías si no hay datos reales
    let valRenting = (!rentingActual || rentingActual === 'Renting' || rentingActual === 'null') ? '' : rentingActual;
    let valAgencia = (!agenciaActual || agenciaActual === 'Agencia' || agenciaActual === 'null') ? '' : agenciaActual;

    const { value: formValues } = await Swal.fire({
        title: 'Renting y Agencia',
        html: `
            <div style="text-align: left; padding: 0 10%; margin-top: 10px;">
                <p style="font-size: 11px; font-weight: bold; color: #666; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Compañía de Renting:</p>
                <input id="edit-renting" class="swal2-input !w-full !m-0 !mb-4 text-center uppercase" placeholder="Ej: ARVAL, ALD, LEASEPLAN..." value="${valRenting}">
                
                <p style="font-size: 11px; font-weight: bold; color: #666; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px;">Agencia de Transporte:</p>
                <input id="edit-agencia" class="swal2-input !w-full !m-0 text-center uppercase" placeholder="Ej: TRADISA, SINTAX..." value="${valAgencia}">
            </div>
        `,
        showCancelButton: true, 
        confirmButtonColor: '#001e50', 
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            return { 
                renting: document.getElementById('edit-renting').value.toUpperCase().trim(), 
                agencia: document.getElementById('edit-agencia').value.toUpperCase().trim() 
            };
        }
    });

    if (formValues) {
        await window.updateDoc(window.doc(window.db, "vehiculos", id), formValues);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500 });
 
        if (typeof window.renderizarVistas === 'function') {
            setTimeout(() => window.renderizarVistas(), 400);
        }
    }
};

window.anadirVehiculoManual = async function() {
    const { value: formValues } = await Swal.fire({
        title: 'Añadir Vehículo Manual',
        html: `
            <input id="add-bastidor" class="swal2-input !w-[80%] !m-0 !mb-3 text-center uppercase" placeholder="VIN (Bastidor)">
            <input id="add-matricula" class="swal2-input !w-[80%] !m-0 !mb-3 text-center uppercase" placeholder="Matrícula">
            <input id="add-modelo" class="swal2-input !w-[80%] !m-0 text-center uppercase" placeholder="Modelo">
        `,
        showCancelButton: true, 
        confirmButtonColor: '#001e50', 
        confirmButtonText: 'Añadir',
        preConfirm: () => {
            const b = document.getElementById('add-bastidor').value.toUpperCase().trim().replace(/\s/g, '');
            const m = document.getElementById('add-matricula').value.toUpperCase().trim().replace(/\s/g, '');
            const mod = document.getElementById('add-modelo').value.toUpperCase().trim() || "VW";
            
            if (!b) return Swal.showValidationMessage('El bastidor es obligatorio');
            
            return { bastidor: b, matricula: m || "S/M", modelo: mod };
        }
    });

    if (formValues) {
        // 🔥 BARRIDO EN MEMORIA LOCAL (Bypass a la falta de window.where)
        // Buscamos de forma ultra-segura cruzando tanto los nombres de campos nuevos como los antiguos de vuestra base de datos (A, B, bastidor, matricula)

        // 🛡️ BARRERA 1: Comprobar si el BASTIDOR ya existe en el array local
        let existeBastidor = todosLosCoches.some(c => {
            let bLocal = String(c.bastidor || c.A || '').toUpperCase().replace(/\s/g, '');
            return bLocal === formValues.bastidor;
        });

        if (existeBastidor) {
            return Swal.fire({
                title: '¡BASTIDOR DUPLICADO!', 
                html: `El bastidor <b style="color:#ff4444;">${formValues.bastidor}</b> ya existe en el sistema.`, 
                icon: 'warning', 
                confirmButtonColor: '#001e50'
            });
        }

        // 🛡️ BARRERA 2: Comprobar si la MATRÍCULA ya existe en el array local (Solo si no es "S/M")
        if (formValues.matricula !== "S/M") {
            let existeMatricula = todosLosCoches.some(c => {
                let mLocal = String(c.matricula || c.Matricula || c.B || '').toUpperCase().replace(/\s/g, '');
                return mLocal === formValues.matricula;
            });
            
            if (existeMatricula) {
                return Swal.fire({
                    title: '¡MATRÍCULA DUPLICADA!', 
                    html: `La matrícula <b style="color:#ff4444;">${formValues.matricula}</b> ya está registrada en otro vehículo.`, 
                    icon: 'warning', 
                    confirmButtonColor: '#001e50'
                });
            }
        }

        // ✅ VÍA LIBRE: Si ha pasado los dos filtros, guardamos en Firebase usando las funciones que SÍ existen
        try {
            let idNuevo = new Date().getTime().toString();
            await window.setDoc(window.doc(window.db, "vehiculos", idNuevo), { 
                bastidor: formValues.bastidor, 
                matricula: formValues.matricula, 
                Matricula: formValues.matricula, 
                modelo: formValues.modelo, 
                pasoAInventario: false, 
                entregado: false, 
                creadoEn: new Date().getTime() 
            });
            
            Swal.fire('¡Añadido!', 'Vehículo registrado correctamente en Logística.', 'success');
            
        } catch (error) {
            console.error("Error al guardar el vehículo:", error);
            Swal.fire('Error de Permisos', 'No tienes permisos suficientes o estás usando un usuario sin autorización de escritura.', 'error');
        }
    }
};

window.editarVehiculoBasico = async function(id, bastidorActual, matriculaActual, modeloActual) {
    const { value: formValues } = await Swal.fire({
        title: 'Editar Vehículo',
        html: `<input id="edit-bastidor" class="swal2-input !w-full !m-0 !mb-4 text-center uppercase" value="${bastidorActual}"><input id="edit-matricula" class="swal2-input !w-full !m-0 !mb-4 text-center uppercase" value="${matriculaActual}"><input id="edit-modelo" class="swal2-input !w-full !m-0 text-center uppercase" value="${modeloActual}">`,
        showCancelButton: true, confirmButtonColor: '#001e50', confirmButtonText: 'Guardar',
        preConfirm: () => {
            const b = document.getElementById('edit-bastidor').value.toUpperCase().trim();
            const mod = document.getElementById('edit-modelo').value.toUpperCase().trim();
            if (!b) { Swal.showValidationMessage('Bastidor obligatorio'); return false; }
            return { bastidor: b, matricula: document.getElementById('edit-matricula').value.toUpperCase().trim() || "S/M", modelo: mod };
        }
    });
    if (formValues) {
        await window.updateDoc(window.doc(window.db, "vehiculos", id), { bastidor: formValues.bastidor, matricula: formValues.matricula, Matricula: formValues.matricula, modelo: formValues.modelo });
        Swal.fire('¡Actualizado!', 'Datos corregidos.', 'success');
    }
};

window.borrarVehiculo = async function(id, modelo) {
    const result = await Swal.fire({ title: '¿Eliminar?', text: `Se borrará: ${modelo}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Borrar' });
    if (result.isConfirmed) { await window.deleteDoc(window.doc(window.db, "vehiculos", id)); Swal.fire('Borrado', 'Eliminado.', 'success'); }
};

// ==========================================
// 🚀 FUNCIÓN DE ENTREGA Y WHATSAPP AUTOMÁTICO
// ==========================================
window.marcarComoEntregado = function(id) {
    // 1. Buscamos el coche en nuestra memoria local
    let coche = todosLosCoches.find(c => c.fila === id);
    if (!coche) return Swal.fire('Error', 'Vehículo no encontrado en el sistema.', 'error');
    
    // 2. Buscamos el teléfono en la agenda cruzando la matrícula
    let cita = window.datosAgenda && window.datosAgenda.find(cita => (cita.matricula && coche.B && String(cita.matricula).replace(/\s/g, '') === String(coche.B).replace(/\s/g, '')));
    let tlf = cita ? cita.telefono : "";

    // 3. Desplegamos el formulario
    Swal.fire({
        title: '¿Completar Entrega?',
        html: `
            <div style="text-align: left; font-family: 'Inter', sans-serif;">
                <p class="text-sm text-gray-600 mb-3 font-bold">El vehículo pasará al historial de GesCar OS. Sube una foto opcional de la entrega:</p>
                <input type="file" id="fileFotos" accept="image/*" class="swal2-file text-sm w-full mb-3">
                <div class="mt-4 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <input type="checkbox" id="pedirResena" checked class="w-4 h-4 accent-[#001e50] cursor-pointer"> 
                    <label for="pedirResena" class="text-xs font-bold text-gray-700 uppercase cursor-pointer">Solicitar reseña en Google</label>
                </div>
            </div>
        `,
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonColor: '#10b981', 
        confirmButtonText: 'Procesar Entrega',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let inputFoto = document.getElementById('fileFotos').files[0];
            let pedirResena = document.getElementById('pedirResena').checked;
            
            // Función interna para cerrar el proceso y lanzar WhatsApp de forma segura
            const finalizar = async (urlFoto) => {
                // A. Actualizamos el estado en la base de datos
                await window.updateDoc(window.doc(window.db, "vehiculos", id), { 
                    entregado: true, 
                    fechaEntrega: new Date().toLocaleDateString('es-ES') 
                });
                
                // B. Construimos el mensaje dinámico
                let msg = `¡Hola! Un placer entregarte tu ${coche.C}. `;
                if (urlFoto) msg += `Aquí tienes un recuerdo de tu entrega: ${urlFoto} `;
                if (pedirResena) msg += `Te agradeceríamos mucho si nos dejas una pequeña reseña en Google: https://search.google.com/local/writereview?placeid=ChIJc6vL3fIvQg0RGT8iQzPAenc`;
                
                let enlaceWhatsApp = `https://wa.me/34${tlf.replace(/\s/g, '')}?text=${encodeURIComponent(msg)}`;

                // C. Mostramos el botón manual para EVITAR el bloqueo del navegador
                Swal.fire({
                    title: '¡Operación Registrada!',
                    text: 'El vehículo ya está en el historial de finalizados.',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonColor: '#25D366',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: '<i class="ph-bold ph-whatsapp-logo text-lg"></i> Enviar WhatsApp',
                    cancelButtonText: 'Cerrar sin enviar'
                }).then((waResult) => {
                    if (waResult.isConfirmed) {
                        window.open(enlaceWhatsApp, "_blank");
                    }
                    // Refrescamos la pantalla al final de todo el proceso
                    if (typeof window.renderizarVistas === 'function') window.renderizarVistas();
                });
            };

            // 4. Si hay foto, la subimos primero a Apps Script
            if (inputFoto) {
                Swal.fire({ title: 'Procesando fotografía...', text: 'Subiendo a la nube, por favor espera.', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
                const reader = new FileReader(); 
                reader.readAsDataURL(inputFoto);
                reader.onload = async () => {
                    try {
                        const res = await fetch('https://script.google.com/macros/s/AKfycbxec72BCUB3fA_ZtBAe8Zs7dqE00MScDbCGSqeQguIVHlH6S8q0vqNBbtGwk_1vPeNYjw/exec', { 
                            method: 'POST', 
                            body: JSON.stringify({ base64: reader.result, fileName: inputFoto.name, mimeType: inputFoto.type }) 
                        });
                        const data = await res.json(); 
                        await finalizar(data.url); // Llamamos a finalizar con la URL de Drive
                    } catch (e) {
                        console.error(e);
                        Swal.fire('Error', 'Hubo un problema al subir la fotografía a Drive.', 'error');
                    }
                };
            } else { 
                // Si no hay foto, pasamos directamente
                await finalizar(null); 
            }
        }
    });
};

// ==========================================
// 🚛 GESTIÓN DE TRASLADOS EN GRÚA
// ==========================================
window.gestionarTraslado = async function(id) {
    const { value: formValues } = await Swal.fire({
        title: 'Traslado en Grúa',
        html: `
            <div style="text-align:left; font-family: 'Inter', sans-serif;">
                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Concesionario Destino:</label>
                <input id="concesionario-destino" class="swal2-input !w-full !m-0 !mb-4 text-center uppercase" placeholder="Ej: Castellana Wagen">
                
                <label style="display:block; font-size:11px; font-weight:bold; color:#666; margin-bottom:5px; text-transform:uppercase;">Acta de Traslado (PDF/Imagen):</label>
                <input type="file" id="acta-traslado" accept=".pdf,image/*" class="swal2-file text-sm w-full border border-gray-300 rounded p-2">
            </div>
        `,
        confirmButtonText: 'Finalizar Traslado', 
        confirmButtonColor: '#f97316', 
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        preConfirm: () => { 
            const dest = document.getElementById('concesionario-destino').value.toUpperCase().trim();
            const file = document.getElementById('acta-traslado').files[0];
            
            if(!dest) return Swal.showValidationMessage('El destino es obligatorio'); 
            
            return { dest, file }; 
        }
    });

    if (formValues) {
        // Función interna encargada de escribir en Firebase
        const guardarEnBaseDeDatos = async (urlArchivo) => {
            await window.updateDoc(window.doc(window.db, "vehiculos", id), { 
                entregado: true, 
                fechaEntrega: new Date().toLocaleDateString('es-ES'), 
                tipoFinalizacion: 'TRASLADO', 
                concesionarioDestino: formValues.dest, // Se ha corregido el error tipográfico
                urlActaTraslado: urlArchivo || null    // Almacenamos el enlace del PDF si se subió
            });
            
            Swal.fire('Registrado', 'El traslado y el acta se han guardado en el historial.', 'success');
            
            // Actualizamos la vista para que el cambio se refleje inmediatamente
            setTimeout(() => {
                if(typeof window.renderizarVistas === 'function') window.renderizarVistas();
                if(typeof window.renderEntregados === 'function') window.renderEntregados();
            }, 500);
        };

        // Lógica de subida: comprobamos si el usuario ha adjuntado un archivo
        if (formValues.file) {
            Swal.fire({ 
                title: 'Procesando acta...', 
                text: 'Subiendo documento a la nube.', 
                didOpen: () => Swal.showLoading(), 
                allowOutsideClick: false 
            });
            
            const reader = new FileReader(); 
            reader.readAsDataURL(formValues.file);
            
            reader.onload = async () => {
                try {
                    // Llamada al script de subida
                    const res = await fetch('https://script.google.com/macros/s/AKfycbxec72BCUB3fA_ZtBAe8Zs7dqE00MScDbCGSqeQguIVHlH6S8q0vqNBbtGwk_1vPeNYjw/exec', { 
                        method: 'POST', 
                        body: JSON.stringify({ 
                            base64: reader.result, 
                            fileName: formValues.file.name, 
                            mimeType: formValues.file.type 
                        }) 
                    });
                    
                    const data = await res.json(); 
                    
                    // Al recibir la URL del archivo, escribimos en Firebase
                    await guardarEnBaseDeDatos(data.url);
                    
                } catch (error) {
                    console.error("Error al subir el acta:", error);
                    Swal.fire('Error de conexión', 'No se pudo subir el archivo. Inténtalo de nuevo.', 'error');
                }
            };
        } else {
            // Si el usuario no adjuntó ningún archivo, guardamos directamente los datos de texto
            Swal.fire({ 
                title: 'Registrando traslado...', 
                didOpen: () => Swal.showLoading(), 
                allowOutsideClick: false 
            });
            await guardarEnBaseDeDatos(null);
        }
    }
};

window.pasarAInventario = async function(id) {
    await window.updateDoc(window.doc(window.db, "vehiculos", id), { pasoAInventario: true });
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Listo para entrega', showConfirmButton: false, timer: 1500 });
};

window.marcarPaso = async function(id, campo) {
    let updateData = {}; updateData[campo] = new Date().toLocaleDateString('es-ES');
    await window.updateDoc(window.doc(window.db, "vehiculos", id), updateData);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Fase completada', showConfirmButton: false, timer: 1500 });
};

window.ejecutarDpto = async function(tipo, id, fin) {
  const p = tipo === 'Taller' ? 'p' : 'r'; let fFin = fin ? new Date().toLocaleDateString() : "";
  let upd = tipo === 'Taller' ? { finTaller: fin, ordenTaller: document.getElementById(`o-${p}-${id}`).value, fechaTaller: document.getElementById(`f-${p}-${id}`).value, fechaFinTaller: fFin } : { finRecambios: fin, ordenRecambios: document.getElementById(`o-${p}-${id}`).value, fechaRecambios: document.getElementById(`f-${p}-${id}`).value, fechaFinRecambios: fFin };
  await window.updateDoc(window.doc(window.db, "vehiculos", id), upd);
  Swal.fire({ icon: 'success', title: fin ? 'Finalizado' : 'Guardado', showConfirmButton: false, timer: 1000 });
};

// ==========================================
// 🛠️ AUTORIZACIÓN DE ENVÍOS (MODO DIAGNÓSTICO)
// ==========================================
window.pedirInst = function(btn, id, depto) {
    console.log("🛠️ Intentando abrir departamento:", depto);
    console.log("👤 Rol detectado en el sistema:", window.rolActivo);

    // 🔥 1. COMPROBACIÓN DE INVENTARIO Y PERMISOS ESPECIALES
    let coche = todosLosCoches.find(c => c.fila === id);
    let enInventario = coche && coche.pasoAInventario !== false;
    
    let rolLimpio = String(window.rolActivo || '').toLowerCase().trim();
    // ✅ HEMOS AÑADIDO 'entregas' A LA LISTA DE SUPERPODERES
    let tieneSuperpoderes = (rolLimpio === 'backoffice' || rolLimpio === 'admin' || rolLimpio === 'administracion' || rolLimpio === 'entregas');

    // Si no está en inventario y NO tiene superpoderes, bloqueamos.
    if (!enInventario && !tieneSuperpoderes) {
        Swal.fire({
            title: 'Vehículo en Tránsito',
            text: 'Este vehículo aún no ha llegado físicamente a la campa. Solo los equipos autorizados pueden adelantar peticiones antes de su llegada.',
            icon: 'warning',
            confirmButtonColor: '#001e50'
        });
        return; // Frenazo: no seguimos ejecutando el código
    }

    // 🔥 2. Si pasa el filtro, abrimos la ventana normal
    Swal.fire({ 
        title: 'Enviar a ' + String(depto).toUpperCase(), 
        html: `
            <div style="text-align:left; font-family:sans-serif; font-size:12px; color:#666;">
                <p class="mb-2 font-bold uppercase">Escribe la orden de trabajo o recambio:</p>
                <input type="text" id="ins" class="swal2-input !w-full !m-0" placeholder="Ej: Revisión general, chapa, etc...">
                <p class="mt-4 mb-2 font-bold uppercase">Adjuntar documento / Acta (Opcional):</p>
                <input type="file" id="fileInput" class="text-sm w-full bg-gray-50 p-2 rounded border">
            </div>
        `, 
        showCancelButton: true,
        confirmButtonColor: '#001e50',
        confirmButtonText: 'Registrar Petición',
        cancelButtonText: 'Cancelar'
    }).then((res) => {
        if (res.isConfirmed) {
            let ins = document.getElementById('ins').value.trim(); 
            let file = document.getElementById('fileInput').files[0];
            let departamento = String(depto).toLowerCase().trim();
            
            try {
                if(file) { 
                    window.subirYEnviar(id, departamento, ins, file); 
                } else { 
                    window.mandarSinArchivo(id, departamento, ins); 
                }
            } catch (error) {
                console.error("❌ Fallo crítico al intentar guardar:", error);
                Swal.fire('Error interno', 'El proceso se ha roto al intentar guardar. Revisa la consola.', 'error');
            }
        }
    });
};

window.subirYEnviar = async function(id, depto, ins, file) {
  const reader = new FileReader(); reader.readAsDataURL(file);
  reader.onload = async () => {
    const res = await fetch('https://script.google.com/macros/s/AKfycbxec72BCUB3fA_ZtBAe8Zs7dqE00MScDbCGSqeQguIVHlH6S8q0vqNBbtGwk_1vPeNYjw/exec', { method: 'POST', body: JSON.stringify({ base64: reader.result, fileName: file.name, mimeType: file.type }) });
    const data = await res.json(); let fHoy = new Date().toLocaleDateString('es-ES');
    let nuevaPeticion = { motivo: ins || "Sin especificar", url: data.url, fecha: fHoy };
    let upd = depto === 'taller' ? { enTaller: true, peticionesTaller: window.arrayUnion(nuevaPeticion), fechaEntradaTaller: fHoy, finTaller: false } : { enRecambios: true, peticionesRecambios: window.arrayUnion(nuevaPeticion), fechaEntradaRecambios: fHoy, finRecambios: false };
    await window.updateDoc(window.doc(window.db, "vehiculos", id), upd);
    Swal.fire('Éxito', 'Petición registrada.', 'success');
  };
};

window.mandarSinArchivo = async function(id, depto, ins) {
  let fHoy = new Date().toLocaleDateString('es-ES');
  let nuevaPeticion = { motivo: ins || "Sin especificar", url: null, fecha: fHoy };
  let upd = depto === 'taller' ? { enTaller: true, peticionesTaller: window.arrayUnion(nuevaPeticion), fechaEntradaTaller: fHoy, finTaller: false } : { enRecambios: true, peticionesRecambios: window.arrayUnion(nuevaPeticion), fechaEntradaRecambios: fHoy, finRecambios: false };
  await window.updateDoc(window.doc(window.db, "vehiculos", id), upd);
  Swal.fire('Éxito', 'Petición registrada sin archivos.', 'success');
};

// ==========================================
// 📜 HISTORIAL PREMIUM (PAGINADO, BUSCADOR Y CHAT)
// ==========================================
window.cochesHistorialMemoria = [];
window.limiteHistorial = 20;

// Generador de la estructura principal (Buscador + Cabecera de Tabla)
window.cargarUltimosHistorialDpto = function() {
    const contenedor = document.getElementById('visorHistorialDinamico');
    if (!contenedor) return;

    if (!todosLosCoches || todosLosCoches.length === 0) {
        contenedor.innerHTML = '<div class="w-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-6"><p class="text-gray-500 font-bold text-lg"><i class="ph-bold ph-spinner-gap animate-spin"></i> Esperando sincronización de datos...</p></div>';
        return;
    }

    // Filtrado inteligente por departamento
    window.cochesHistorialMemoria = todosLosCoches.filter(c => {
        if (window.rolActivo === 'taller') return c.finTaller === true || c.finTaller === "true";
        if (window.rolActivo === 'recambios') return c.finRecambios === true || c.finRecambios === "true";
        return false;
    });

    window.cochesHistorialMemoria.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));

    if (window.cochesHistorialMemoria.length === 0) {
        contenedor.innerHTML = `
        <div class="w-full bg-white p-12 rounded-xl shadow-sm text-center border border-gray-200 mt-4">
            <i class="ph-bold ph-archive text-4xl text-gray-300 mb-3 block"></i>
            <p class="text-gray-500 font-bold text-lg">Tu departamento no tiene vehículos finalizados.</p>
        </div>`;
        return;
    }

    // Dibujamos la tabla COMPLETA (<table>, <thead> y <tbody>) para que el navegador no rompa el diseño
    contenedor.innerHTML = `
    <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 mt-4 mb-4 gap-4">
        <div class="relative w-full max-w-md">
            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"></i>
            <input type="text" id="buscadorHistorialLocal" onkeyup="window.filtrarHistorialLocal()" placeholder="Buscar Bastidor, Matrícula o Modelo..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium outline-none focus:border-[#001e50] focus:ring-1 focus:ring-[#001e50] transition-all">
        </div>
        <div class="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 whitespace-nowrap">
            <span id="contadorHistorial" class="text-[#001e50] font-black">${window.cochesHistorialMemoria.length}</span> Operaciones Registradas
        </div>
    </div>
    
    <div class="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
            <thead class="bg-[#001e50] text-white">
                <tr>
                    <th class="p-4 text-[10px] tracking-widest font-black uppercase w-1/5">Vehículo</th>
                    <th class="p-4 text-[10px] tracking-widest font-black uppercase">Operación</th>
                    <th class="p-4 text-[10px] tracking-widest font-black uppercase">Fechas</th>
                    <th class="p-4 text-[10px] tracking-widest font-black uppercase w-1/3">Notas y Adjuntos</th>
                    <th class="p-4 text-[10px] tracking-widest font-black uppercase text-center">Chat</th>
                </tr>
            </thead>
            <tbody id="cuerpoTablaHistorial" class="divide-y divide-gray-100">
            </tbody>
        </table>
        <div id="btnCargarMasContainer" class="p-4 bg-gray-50 border-t border-gray-200 text-center transition-colors hover:bg-gray-100 cursor-pointer" onclick="window.cargarMasHistorial()">
            <button class="text-[#001e50] font-black text-xs flex items-center justify-center gap-1 mx-auto uppercase tracking-widest"><i class="ph-bold ph-plus-circle text-base"></i> Cargar operaciones anteriores</button>
        </div>
    </div>`;

    window.limiteHistorial = 20;
    window.pintarFilasHistorial(window.cochesHistorialMemoria.slice(0, window.limiteHistorial));
};

// Pintor de Filas y Fechas
window.pintarFilasHistorial = function(lista) {
    const tbody = document.getElementById('cuerpoTablaHistorial');
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400 font-bold text-base"><i class="ph-bold ph-magnifying-glass text-3xl mb-2 block"></i>No hay resultados para esta búsqueda.</td></tr>';
        document.getElementById('btnCargarMasContainer').style.display = 'none';
        return;
    }

    tbody.innerHTML = lista.map(c => {
        // Formateador robusto a Español (DD/MM/YYYY)
        const formatear = (str) => {
            if (!str || str === '-' || str === 'Sin registro') return 'S/D';
            try {
                if (str.includes('-') || str.includes('T')) {
                    let f = new Date(str);
                    if (!isNaN(f.getTime())) {
                        let dia = String(f.getDate()).padStart(2, '0');
                        let mes = String(f.getMonth() + 1).padStart(2, '0');
                        let anio = f.getFullYear();
                        return `${dia}/${mes}/${anio}`;
                    }
                }
                return str;
            } catch(e) { return str; }
        };

        let esTaller = window.rolActivo === 'taller';
        let fEntrada = esTaller ? (c.fechaEntradaTaller || '-') : (c.fechaEntradaRecambios || '-');
        let fCierre = esTaller ? (c.fechaFinTaller || c.fechaTaller || '-') : (c.fechaFinRecambios || c.fechaRecambios || '-');
        let infoDpto = esTaller ? `OR: ${c.ordenTaller || '-'}` : `Ped: ${c.ordenRecambios || '-'}`;
        
        let labelEntrada = esTaller ? 'Entrada Taller' : 'Entrada Recambios';
        let labelSalida = esTaller ? 'Salida Taller' : 'Salida Recambios';

        let chatJson = encodeURIComponent(JSON.stringify(c.chatData || {history:[]})).replace(/'/g, "%27"); 
        let mS = encodeURIComponent(c.C || '').replace(/'/g, "%27"); 
        let maS = encodeURIComponent(c.B || '').replace(/'/g, "%27");
        let burbuja = typeof window.obtenerBurbujaChat === 'function' ? window.obtenerBurbujaChat(c.chatData) : '';
        let btnChat = `<button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-8 h-8 mx-auto relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-lg"></i>${burbuja}</button>`;

        let arrPeticiones = esTaller ? 
            (c.peticionesTaller || (c.instruccionTaller ? [{fecha: c.fechaEntradaTaller||'-', motivo: c.instruccionTaller, url: c.urlParte}] : [])) :
            (c.peticionesRecambios || (c.instruccionRecambios ? [{fecha: c.fechaEntradaRecambios||'-', motivo: c.instruccionRecambios, url: c.urlParte}] : []));
        
        let htmlDocs = arrPeticiones.map(p => {
            let adjunto = p.url ? `<a href="${p.url}" target="_blank" class="text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[10px] ml-1 font-black"><i class="ph-bold ph-paperclip"></i> PDF</a>` : '';
            return `<div class="text-[11px] text-gray-600 mb-1.5 leading-tight bg-gray-50 p-2 rounded border border-gray-100"><b class="text-[#001e50]">${formatear(p.fecha)}:</b> ${p.motivo} ${adjunto}</div>`;
        }).join('') || '<span class="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">No hay notas adjuntas</span>';

        return `
        <tr class="hover:bg-blue-50 transition-colors border-b border-gray-100">
            <td class="p-4">
                <div class="font-black text-[#001e50] uppercase text-sm">${c.modelo || c.C || '-'}</div>
                <div class="text-[10px] font-bold text-gray-400 tracking-wider mt-1">VIN: ${c.bastidor || c.A || '-'} <br> MAT: ${c.matricula || c.B || 'S/M'}</div>
            </td>
            <td class="p-4">
                <span class="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">${infoDpto}</span>
            </td>
            <td class="p-4 text-xs font-bold whitespace-nowrap">
                <div class="text-blue-600 mb-1.5">
                    <span class="text-gray-400 text-[9px] uppercase tracking-widest block mb-0.5">${labelEntrada}</span>
                    <i class="ph-bold ph-arrow-right"></i> ${formatear(fEntrada)}
                </div>
                <div class="text-emerald-600">
                    <span class="text-gray-400 text-[9px] uppercase tracking-widest block mb-0.5">${labelSalida}</span>
                    <i class="ph-bold ph-check-circle"></i> ${formatear(fCierre)}
                </div>
            </td>
            <td class="p-4">${htmlDocs}</td>
            <td class="p-4 text-center">${btnChat}</td>
        </tr>`;
    }).join('');

    let buscando = document.getElementById('buscadorHistorialLocal') && document.getElementById('buscadorHistorialLocal').value.trim() !== "";
    if (lista.length >= window.cochesHistorialMemoria.length || buscando) {
        document.getElementById('btnCargarMasContainer').style.display = 'none';
    } else {
        document.getElementById('btnCargarMasContainer').style.display = 'block';
    }
};

window.filtrarHistorialLocal = function() {
    let texto = document.getElementById('buscadorHistorialLocal').value.toLowerCase().trim();
    if (texto === '') {
        window.pintarFilasHistorial(window.cochesHistorialMemoria.slice(0, window.limiteHistorial));
        document.getElementById('contadorHistorial').innerText = window.cochesHistorialMemoria.length;
        return;
    }
    let filtrados = window.cochesHistorialMemoria.filter(c => {
        let cadenaFiltro = ((c.bastidor||'') + ' ' + (c.A||'') + ' ' + (c.matricula||'') + ' ' + (c.B||'') + ' ' + (c.modelo||'') + ' ' + (c.C||'')).toLowerCase();
        return cadenaFiltro.includes(texto);
    });
    window.pintarFilasHistorial(filtrados);
    document.getElementById('contadorHistorial').innerText = filtrados.length;
};

window.cargarMasHistorial = function() {
    window.limiteHistorial += 20;
    window.pintarFilasHistorial(window.cochesHistorialMemoria.slice(0, window.limiteHistorial));
};

window.renderEntregados = function() {
   let div = document.getElementById('contenedorEntregados');
   div.innerHTML = `
   <div class="max-w-2xl mx-auto mt-6 space-y-6">
       <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
           <h2 class="text-xl font-black text-[#001e50] uppercase mb-1 flex items-center gap-2"><i class="ph-bold ph-magnifying-glass text-blue-500"></i> Buscar por Vehículo</h2>
           <div class="flex gap-2">
               <input type="text" id="inputBusquedaHistorial" onkeyup="if(event.key === 'Enter') window.buscarEnHistorial()" placeholder="Ej: 1234ABC o WVWZZZ..." class="flex-1 p-3 border border-gray-300 rounded-lg text-base font-black text-center uppercase outline-none focus:ring-2 focus:ring-[#00b0f0] shadow-inner text-[#001e50]">
               <button onclick="window.buscarEnHistorial()" class="bg-[#001e50] text-white px-6 py-3 rounded-lg font-black hover:bg-blue-900 transition-colors shadow-sm text-xs flex items-center gap-1"><i class="ph-bold ph-magnifying-glass"></i> BUSCAR</button>
           </div>
       </div>
       
       <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200">
           <h2 class="text-xl font-black text-[#001e50] uppercase mb-1 flex items-center gap-2"><i class="ph-bold ph-calendar text-emerald-600"></i> Filtrar por Fechas</h2>
           <div class="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 mb-4">
               <div>
                   <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Fecha Inicio (o Día a Buscar)</label>
                   <input type="date" id="hist-fecha-inicio" class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 outline-none">
               </div>
               <div>
                   <label class="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Fecha Fin (Solo Rango Excel)</label>
                   <input type="date" id="hist-fecha-fin" class="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 outline-none">
               </div>
           </div>
           <div class="flex gap-3">
               <button onclick="window.buscarPorDiaManual()" class="flex-1 bg-gray-200 text-gray-800 font-black py-3 rounded-lg text-xs hover:bg-gray-300 transition-colors uppercase shadow-sm"><i class="ph-bold ph-eye"></i> Entregas del día</button>
               <button onclick="window.descargarExcelHistorialRango()" class="flex-1 bg-[#107c41] text-white font-black py-3 rounded-lg text-xs hover:bg-[#0c5e31] transition-colors uppercase shadow-sm"><i class="ph-bold ph-microsoft-excel-logo"></i> Descargar Excel</button>
           </div>
       </div>
       <div id="resultadoBusquedaHistorial" class="mt-6"></div>
   </div>`;
   setTimeout(() => { 
       if(document.getElementById('inputBusquedaHistorial')) document.getElementById('inputBusquedaHistorial').focus();
       let entregados = todosLosCoches.filter(c => c.entregado === true || c.entregado === "true");
       let ultimos = entregados.slice(0, 15);
       window.inyectarResultadosHistorial(ultimos, document.getElementById('resultadoBusquedaHistorial'), "Últimos Movimientos Registrados");
   }, 100);
}

window.buscarEnHistorial = function() {
   let inputVal = document.getElementById('inputBusquedaHistorial').value.toUpperCase().trim().replace(/\s/g, '');
   let contenedor = document.getElementById('resultadoBusquedaHistorial');
   if (!inputVal) { contenedor.innerHTML = ''; return; }
   
   let entregados = todosLosCoches.filter(c => c.entregado === true || c.entregado === "true");
   let resultados = entregados.filter(c => (c.B && c.B.replace(/\s/g, '').includes(inputVal)) || (c.A && c.A.includes(inputVal)));
   window.inyectarResultadosHistorial(resultados, contenedor, `el dato: ${inputVal}`);
};

window.buscarPorDiaManual = function() {
   let fechaInput = document.getElementById('hist-fecha-inicio').value; 
   let contenedor = document.getElementById('resultadoBusquedaHistorial');
   if (!fechaInput) { Swal.fire('Atención', 'Selecciona "Fecha Inicio"', 'info'); return; }
   
   let parts = fechaInput.split('-');
   let fechaBuscadaLocal = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`; 

   let entregados = todosLosCoches.filter(c => c.entregado === true || c.entregado === "true");
   let resultados = entregados.filter(c => {
       if (!c.fechaEntrega) return false;
       let pCoche = c.fechaEntrega.trim().split('/');
       let fechaCocheLimpia = `${parseInt(pCoche[0])}/${parseInt(pCoche[1])}/${pCoche[2]}`;
       return fechaCocheLimpia === fechaBuscadaLocal;
   });
   window.inyectarResultadosHistorial(resultados, contenedor, `el día: ${parts[2]}/${parts[1]}/${parts[0]}`);
};

window.inyectarResultadosHistorial = function(resultados, contenedor, criterioTexto) {
    if (resultados.length === 0) {
        contenedor.innerHTML = `<div class="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-200"><p class="font-bold text-sm">No hay entregas para ${criterioTexto}</p></div>`;
        return;
    }
    
    contenedor.innerHTML = `<p class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Resultados (${resultados.length}):</p>` + 
    resultados.map(c => {
        let esTraslado = c.tipoFinalizacion === 'TRASLADO';
        let bgTag = esTraslado ? 'bg-orange-500' : 'bg-emerald-500';
        let textoTag = esTraslado ? 'Traslado' : 'Entregado';
        let borderTag = esTraslado ? 'border-orange-500' : 'border-emerald-500';
        
        let infoTraslado = esTraslado ? `
            <p class="text-[10px] font-bold text-orange-600 mb-1"><i class="ph-bold ph-map-pin"></i> Destino: ${c.concesionarioDestino || 'N/A'}</p>
            ${c.urlActaTraslado ? `<a href="${c.urlActaTraslado}" target="_blank" class="text-[10px] text-blue-600 font-bold hover:underline mb-2 block"><i class="ph-bold ph-file-pdf"></i> Ver Acta de Traslado</a>` : ''}
        ` : '';

        return `
        <div class="bg-white rounded-xl ${esTraslado ? 'border-l-8 border-orange-500' : 'border-l-8 border-emerald-500'} p-5 shadow-sm mb-3 relative overflow-hidden">
            <div class="absolute top-0 right-0 ${bgTag} text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase">${textoTag}</div>
            <h3 class="font-black text-base text-[#001e50] uppercase">${c.C}</h3>
            <p class="text-[10px] font-bold text-gray-400 tracking-widest mb-2">VIN: ${c.A} | MAT: ${c.B}</p>
            
            ${infoTraslado}
            
            <p class="font-black ${esTraslado ? 'text-orange-600' : 'text-emerald-600'} text-sm mb-2"><i class="ph-bold ph-calendar-check"></i> ${c.fechaEntrega || 'Completado'}</p>
            <div class="flex gap-2 text-[9px] font-bold text-gray-400 uppercase mb-4">
                <span class="bg-gray-100 px-2 py-1 rounded border">${c.entregador || c.agente || 'N/A'}</span>
                <span class="bg-gray-100 px-2 py-1 rounded border">${c.renting || '-'}</span>
            </div>
            
            <button onclick="window.deshacerEntrega('${c.fila}')" class="absolute bottom-3 right-3 text-xs bg-amber-50 text-amber-600 font-bold px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm flex items-center gap-1">
                <i class="ph-bold ph-arrow-u-up-left"></i> Revertir a Activo
            </button>
        </div>
        `;
    }).join('');
};

window.descargarExcelHistorialRango = function() {
   let fInicioRaw = document.getElementById('hist-fecha-inicio').value;
   let fFinRaw = document.getElementById('hist-fecha-fin').value;
   if (!fInicioRaw || !fFinRaw) { Swal.fire('Aviso', 'Rellena ambas fechas.', 'warning'); return; }
   
   let dateInicio = new Date(fInicioRaw); dateInicio.setHours(0,0,0,0);
   let dateFin = new Date(fFinRaw); dateFin.setHours(23,59,59,999);
   
   let entregados = todosLosCoches.filter(c => c.entregado === true || c.entregado === "true");
   let filtrados = entregados.filter(c => {
       if (!c.fechaEntrega) return false;
       let p = c.fechaEntrega.split('/');
       let dateCoche = new Date(p[2], p[1] - 1, p[0]);
       return dateCoche >= dateInicio && dateCoche <= dateFin;
   });

   if (filtrados.length === 0) { Swal.fire('Aviso', 'Sin registros en esas fechas.', 'info'); return; }
   Swal.fire({title: 'Generando Excel...', didOpen: () => Swal.showLoading()});
   
   let datosExcel = filtrados.map(c => ({
       "FECHA": c.fechaEntrega || "Completado", "MODELO": c.C, "MATRÍCULA": c.B, "BASTIDOR": c.A,
       "RENTING": c.renting || "", "AGENCIA": c.agencia || "", "AGENTE": c.entregador || c.agente || ""
   }));
   const worksheet = XLSX.utils.json_to_sheet(datosExcel); const workbook = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(workbook, worksheet, "Entregas");
   XLSX.writeFile(workbook, `Entregas_VW_${fInicioRaw}_a_${fFinRaw}.xlsx`);
   Swal.close();
};

window.descargarExcelReal = function() {
    let activos = todosLosCoches.filter(c => c.pasoAInventario !== false && c.entregado !== true && c.entregado !== "true");
    if (activos.length === 0) return Swal.fire('Aviso', 'No hay datos para exportar.', 'info');
    
    let datos = activos.map(c => ({
        "MODELO": c.C, "MATRÍCULA": c.B, "BASTIDOR": c.A,
        "ESTADO TALLER": c.finTaller ? "FIN" : (c.enTaller ? "CURSO" : "PTE"),
        "ESTADO RECAMBIOS": c.finRecambios ? "FIN" : (c.enRecambios ? "CURSO" : "PTE"),
        "CITA": c.fechaCita || "Sin cita"
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehiculos_Activos");
    XLSX.writeFile(wb, "Inventario_Activo.xlsx");
};


window.deshacerEntrega = async function(id) {
    let coche = todosLosCoches.find(c => c.fila === id);
    let modeloCoche = coche ? coche.C : "el vehículo seleccionado";

    Swal.fire({
        title: '¿Deshacer entrega?',
        text: `El vehículo ${window.escapeJS(modeloCoche)} volverá a la lista de activos.`,
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#6b7280', confirmButtonText: 'Sí, restaurar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({title: 'Restaurando...', didOpen: () => Swal.showLoading()});
            try {
                await window.updateDoc(window.doc(window.db, "vehiculos", id), { entregado: false, fechaEntrega: "" });
                Swal.fire('¡Restaurado!', 'El vehículo vuelve a estar en curso.', 'success');
                setTimeout(() => {
                    if (document.getElementById('inputBusquedaHistorial') && document.getElementById('inputBusquedaHistorial').value) { window.buscarEnHistorial(); } 
                    else if (document.getElementById('hist-fecha-inicio') && document.getElementById('hist-fecha-inicio').value) { window.buscarPorDiaManual(); } 
                    else { window.renderEntregados(); }
                }, 500);
            } catch (error) { Swal.fire('Error', 'No se pudo restaurar el vehículo.', 'error'); }
        }
    });
};
// ==========================================
// ⏪ REVERTIR VEHÍCULO A LOGÍSTICA
// ==========================================
window.revertirLogistica = function(id) {
    Swal.fire({
        title: '¿Devolver a Logística?',
        text: 'El vehículo saldrá del inventario actual y volverá a estar "En Tránsito" en la pestaña de Logística Renting.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b', // Color ámbar para advertencias reversibles
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, devolver',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                Swal.fire({title: 'Revirtiendo...', didOpen: () => Swal.showLoading()});
                // Cambiamos el estado pasoAInventario de nuevo a false
                await window.updateDoc(window.doc(window.db, "vehiculos", id), { pasoAInventario: false });
                Swal.fire('¡Devuelto!', 'El vehículo ha regresado a Logística.', 'success');
                // Refrescamos la vista para que el cambio sea inmediato
                if(typeof window.renderizarVistas === 'function') window.renderizarVistas();
            } catch (error) {
                console.error("Error al revertir:", error);
                Swal.fire('Error', 'No se pudo revertir el vehículo.', 'error');
            }
        }
    });
};
