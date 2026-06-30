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
  <div class="card-mini ${borderAlerta} p-5 fila-coche">
    ${htmlAlerta}
    <div class="flex justify-between items-start mb-2 gap-2">
      <div class="min-w-0 pr-2">
        <h3 class="font-black text-base text-[#001e50] truncate uppercase">${c.C}</h3>
        <p class="text-[10px] font-bold text-gray-400 mt-0.5 tracking-widest truncate">VIN: ${c.A}</p>
      </div>
      <div class="flex gap-1 flex-shrink-0">
         <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="w-8 h-8 relative bg-[#25D366] text-white rounded-full flex items-center justify-center hover:bg-[#128C7E] shadow-sm"><i class="ph-fill ph-whatsapp-logo text-lg"></i>${burbuja}</button>
         <button onclick="window.editarVehiculoBasico('${c.fila}', '${escA}', '${escB}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-colors" title="Editar info"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
         <button onclick="window.marcarComoEntregado('${c.fila}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-white shadow-sm transition-colors"><i class="ph-bold ph-key text-lg"></i></button>
         <button onclick="window.gestionarTraslado('${c.fila}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-orange-500 hover:text-white shadow-sm transition-colors" title="Traslado a Concesionario"><i class="ph-bold ph-airplane-takeoff text-lg"></i></button>
         <button onclick="window.borrarVehiculo('${c.fila}', '${escC}')" class="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm transition-colors" title="Eliminar"><i class="ph-bold ph-trash text-lg"></i></button>    
      </div>
    </div>
    
    <div class="flex gap-2 mb-3">
        <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-buildings"></i> ${c.renting || 'Renting'}</button>
        <button onclick="window.editarRentingAgencia('${c.fila}', '${escRen}', '${escAge}')" class="text-[9px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-1 rounded font-bold hover:bg-gray-100 truncate flex-1 flex items-center gap-1"><i class="ph-bold ph-truck"></i> ${c.agencia || 'Agencia'}</button>
    </div>

    <div class="flex items-center justify-between mb-3">
       <span class="bg-gray-100 border border-gray-300 text-gray-800 px-2.5 py-1 rounded text-xs font-black tracking-widest shadow-sm">${c.B}</span>
       ${c.fechaCita ? `<div class="bg-blue-50 text-[#001e50] border border-blue-200 px-2 py-1 rounded font-black text-xs flex items-center gap-1"><i class="ph-bold ph-calendar-check"></i> Cita: ${c.fechaCita}</div>` : ''}
    </div>

    <div class="w-full bg-gray-200 rounded-full h-2 mb-3 relative overflow-hidden">
       <div class="${prog.color} h-2 transition-all duration-500" style="width: ${prog.pct}%"></div>
       <span class="absolute inset-0 flex items-center justify-center text-[7px] font-black text-gray-800 drop-shadow-md mix-blend-overlay">${prog.pct}%</span>
    </div>

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
            <button onclick="window.abrirChat('${c.fila}', '${mS}', '${maS}', '${chatJson}')" class="text-[#25D366] hover:scale-110 relative"><i class="ph-fill ph-whatsapp-logo text-xl"></i>${burbuja}</button>
            <button onclick="window.marcarComoEntregado('${c.fila}')" class="text-gray-400 hover:text-emerald-600" title="Entregar"><i class="ph-bold ph-key text-xl"></i></button>
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
    const { value: formValues } = await Swal.fire({
        title: 'Renting y Agencia',
        html: `
            <input id="edit-renting" class="swal2-input !w-[80%] !m-0 !mb-4 text-center uppercase" value="${rentingActual}">
            <input id="edit-agencia" class="swal2-input !w-[80%] !m-0 text-center uppercase" value="${agenciaActual}">
        `,
        showCancelButton: true, confirmButtonColor: '#001e50', confirmButtonText: 'Guardar',
        preConfirm: () => ({ renting: document.getElementById('edit-renting').value.toUpperCase().trim(), agencia: document.getElementById('edit-agencia').value.toUpperCase().trim() })
    });
    if (formValues) {
        await window.updateDoc(window.doc(window.db, "vehiculos", id), formValues);
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Guardado', showConfirmButton: false, timer: 1500 });
    }
};

window.anadirVehiculoManual = async function() {
    const { value: formValues } = await Swal.fire({
        title: 'Añadir Vehículo Manual',
        html: `<input id="add-bastidor" class="swal2-input !w-[80%] !m-0 !mb-3 text-center uppercase" placeholder="VIN"><input id="add-matricula" class="swal2-input !w-[80%] !m-0 !mb-3 text-center uppercase" placeholder="Matrícula"><input id="add-modelo" class="swal2-input !w-[80%] !m-0 text-center uppercase" placeholder="Modelo">`,
        showCancelButton: true, confirmButtonColor: '#001e50', confirmButtonText: 'Añadir',
        preConfirm: () => {
            const b = document.getElementById('add-bastidor').value.toUpperCase().trim();
            if (!b) return Swal.showValidationMessage('El bastidor es obligatorio');
            return { bastidor: b, matricula: document.getElementById('add-matricula').value.toUpperCase().trim() || "S/M", modelo: document.getElementById('add-modelo').value.toUpperCase().trim() || "VW" };
        }
    });
    if (formValues) {
        let idNuevo = new Date().getTime().toString();
        await window.setDoc(window.doc(window.db, "vehiculos", idNuevo), { bastidor: formValues.bastidor, matricula: formValues.matricula, Matricula: formValues.matricula, modelo: formValues.modelo, pasoAInventario: false, entregado: false, creadoEn: new Date().getTime() });
        Swal.fire('¡Añadido!', 'Vehículo registrado.', 'success');
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

window.marcarComoEntregado = function(id) {
    let coche = todosLosCoches.find(c => c.fila === id);
    if (!coche) return Swal.fire('Error', 'Vehículo no encontrado.', 'error');
    let cita = window.datosAgenda.find(cita => (cita.matricula && coche.B && String(cita.matricula).replace(/\s/g, '') === String(coche.B).replace(/\s/g, '')));
    let nombre = cita ? cita.cliente : (coche.cliente || "Familia");
    let tlf = cita ? cita.telefono : "";

    Swal.fire({
        title: '¿Completar Entrega?',
        html: `<p class="text-sm text-gray-600">El coche pasará al historial. Sube una foto opcional:</p><input type="file" id="fileFotos" accept="image/*" class="swal2-file text-sm w-full"><div class="mt-4"><input type="checkbox" id="pedirResena" checked> <label for="pedirResena">Solicitar reseña en Google</label></div>`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#10b981', confirmButtonText: 'Entregar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let { fileFotos, pedirResena } = document.getElementById('fileFotos').files[0] ? { archivoFoto: document.getElementById('fileFotos').files[0], pedirResena: document.getElementById('pedirResena').checked } : { archivoFoto: null, pedirResena: document.getElementById('pedirResena').checked };
            
            const finalizar = async (urlFoto) => {
                await window.updateDoc(window.doc(window.db, "vehiculos", id), { entregado: true, fechaEntrega: new Date().toLocaleDateString('es-ES') });
                let msg = `¡Hola! Un placer entregarte tu ${coche.C}. `;
                if(urlFoto) msg += `Foto: ${urlFoto} `;
                if(pedirResena) msg += `Reseña Google: https://search.google.com/local/writereview?placeid=ChIJc6vL3fIvQg0RGT8iQzPAenc`;
                window.open(`https://wa.me/34${tlf.replace(/\s/g, '')}?text=${encodeURIComponent(msg)}`, "_blank");
                Swal.fire('¡Entregado!', 'Vehículo archivado.', 'success');
            };

            let inputFoto = document.getElementById('fileFotos').files[0];
            if (inputFoto) {
                Swal.fire({ title: 'Subiendo...', didOpen: () => Swal.showLoading() });
                const reader = new FileReader(); reader.readAsDataURL(inputFoto);
                reader.onload = async () => {
                    const res = await fetch('https://script.google.com/macros/s/AKfycbxec72BCUB3fA_ZtBAe8Zs7dqE00MScDbCGSqeQguIVHlH6S8q0vqNBbtGwk_1vPeNYjw/exec', { method: 'POST', body: JSON.stringify({ base64: reader.result, fileName: inputFoto.name, mimeType: inputFoto.type }) });
                    const data = await res.json(); await finalizar(data.url);
                };
            } else { await finalizar(null); }
        }
    });
};

window.gestionarTraslado = async function(id) {
    const { value: formValues } = await Swal.fire({
        title: 'Traslado',
        html: `<input id="concesionario-destino" class="swal2-input !w-full !m-0 !mb-3" placeholder="Destino"><input type="file" id="acta-traslado" accept=".pdf,image/*" class="swal2-file text-sm w-full">`,
        confirmButtonText: 'Finalizar', confirmButtonColor: '#f97316', showCancelButton: true,
        preConfirm: () => { if(!document.getElementById('concesionario-destino').value) return Swal.showValidationMessage('Destino obligatorio'); return { dest: document.getElementById('concesionario-destino').value, file: document.getElementById('acta-traslado').files[0] }; }
    });
    if(formValues) {
        await window.updateDoc(window.doc(window.db, "vehiculos", id), { entregado: true, fechaEntrega: new Date().toLocaleDateString('es-ES'), tipoFinalizacion: 'TRASLADO', conesionarioDestino: formValues.dest });
        Swal.fire('Registrado', 'Traslado completado.', 'success');
        setTimeout(() => window.renderizarVistas(), 500);
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

window.pedirInst = function(btn, id, depto) {
  Swal.fire({ title: 'Enviar a ' + depto, html: `<input type="text" id="ins" class="swal2-input" placeholder="Instrucción..."><br><input type="file" id="fileInput" class="mt-4 text-sm w-3/4">`, showCancelButton: true }).then((res) => {
    if (res.isConfirmed) {
        let ins = document.getElementById('ins').value; let file = document.getElementById('fileInput').files[0];
        if(file) { window.subirYEnviar(id, depto, ins, file); } 
        else { window.mandarSinArchivo(id, depto, ins); }
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
// 🗂️ CONTROLADOR DEL HISTORIAL DE DEPARTAMENTOS
// ==========================================

window.cargarUltimosHistorialDpto = function() {
    let finalizados = [];
    
    // 1. Buscamos los coches finalizados según tu departamento
    if (window.rolActivo === 'taller') {
        finalizados = todosLosCoches.filter(c => c.finTaller === true || c.finTaller === "true");
    } else if (window.rolActivo === 'recambios') {
        finalizados = todosLosCoches.filter(c => c.finRecambios === true || c.finRecambios === "true");
    }

    // 2. Ordenamos del más reciente al más antiguo y los guardamos en memoria
    finalizados.sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
    window.cochesHistorialMemoria = finalizados; 

    // 3. Llamamos al pintor de la tabla
    window.renderizarTablaHistorialDpto(finalizados);
};

window.renderizarTablaHistorialDpto = function(coches) {
    const tbody = document.getElementById('tablaResultadosDpto');
    if (!tbody) return;

    if (coches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-400 font-bold text-base"><i class="ph-bold ph-archive text-3xl mb-2 block"></i>Tu departamento no tiene vehículos finalizados en el historial.</td></tr>';
        return;
    }

    // Dibujamos únicamente filas (<tr>)
    tbody.innerHTML = coches.map(c => {
        let esTaller = window.rolActivo === 'taller';
        let fechaEntrada = esTaller ? (c.fechaEntradaTaller || 'Sin registro') : (c.fechaEntradaRecambios || 'Sin registro');
        let fechaSalida = esTaller ? (c.fechaFinTaller || c.fechaTaller || 'Sin registro') : (c.fechaFinRecambios || c.fechaRecambios || 'Sin registro');
        let infoDpto = esTaller ? `OR: ${c.ordenTaller || '-'}` : `Ped: ${c.ordenRecambios || '-'}`;
        
        // Etiquetas dinámicas
        let labelEntrada = esTaller ? 'Entrada Taller' : 'Entrada Recambios';
        let labelSalida = esTaller ? 'Salida Taller' : 'Salida Recambios';

        // Formateador de Fechas avanzado (DD/MM/YYYY)
        const formatearFechaHora = (fechaString) => {
            if (!fechaString || fechaString === 'Sin registro' || fechaString === '-') return 'S/D';
            try {
                if (fechaString.includes('-') || fechaString.includes('T')) {
                    let f = new Date(fechaString);
                    if (!isNaN(f.getTime())) {
                        let dia = String(f.getDate()).padStart(2, '0');
                        let mes = String(f.getMonth() + 1).padStart(2, '0');
                        let anio = f.getFullYear();
                        return `${dia}/${mes}/${anio}`;
                    }
                }
                return fechaString; 
            } catch(e) {
                return fechaString;
            }
        };

        return `
        <tr class="border-b border-gray-100 hover:bg-blue-50 transition-colors">
            <td class="p-4 text-xs font-bold text-gray-500 tracking-wider">${c.bastidor || c.A || '-'}</td>
            <td class="p-4 text-sm font-black text-[#001e50]">${c.matricula || c.B || 'S/M'}</td>
            <td class="p-4 text-xs font-bold text-gray-700 uppercase">${c.modelo || c.C || '-'}</td>
            <td class="p-4 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg px-3">${infoDpto}</td>
            <td class="p-4 text-xs font-bold text-blue-600">
                <div class="mb-0.5 text-gray-400 text-[9px] uppercase tracking-widest">${labelEntrada}</div>
                <i class="ph-bold ph-arrow-right text-base align-middle mr-1"></i> ${formatearFechaHora(fechaEntrada)}
            </td>
            <td class="p-4 text-xs font-bold text-emerald-600">
                <div class="mb-0.5 text-gray-400 text-[9px] uppercase tracking-widest">${labelSalida}</div>
                <i class="ph-bold ph-check-circle text-base align-middle mr-1"></i> ${formatearFechaHora(fechaSalida)}
            </td>
        </tr>`;
    }).join('');
};

// ==========================================
// 🔍 ACTIVACIÓN DEL BUSCADOR LOCAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const buscadorInput = document.getElementById('buscadorinput');
    if(buscadorinput) {
        buscadorinput.addEventListener('keyup', function() {
            let texto = this.value.toLowerCase().trim();
            if (!window.cochesHistorialMemoria) return;
            
            if (texto === '') {
                window.renderizarTablaHistorialDpto(window.cochesHistorialMemoria);
                return;
            }

            let filtrados = window.cochesHistorialMemoria.filter(c => {
                let cadena = ((c.A||'') + ' ' + (c.B||'') + ' ' + (c.C||'')).toLowerCase();
                return cadena.includes(texto);
            });
            window.renderizarTablaHistorialDpto(filtrados);
        });
    }
});

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
