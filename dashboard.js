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
    // 📊 FUNCIONES DE DASHBOARD
    // ==========================================
window.renderizarDashboard = function() {
    // 1. Establecer y obtener el mes seleccionado
    let inputMes = document.getElementById('mesDashboard');
    if (!inputMes.value) {
        let hoy = new Date();
        let mesActualStr = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        inputMes.value = mesActualStr;
    }
    let [yearSel, monthSel] = inputMes.value.split('-');

    const normalizarFechaDashboard = (valor) => {
        if (!valor) return null;
        if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
        if (typeof valor?.toDate === 'function') {
            const f = valor.toDate();
            return isNaN(f.getTime()) ? null : f;
        }
        if (typeof valor?.seconds === 'number') {
            const f = new Date(valor.seconds * 1000);
            return isNaN(f.getTime()) ? null : f;
        }
        if (typeof valor === 'number') {
            const f = new Date(valor);
            return isNaN(f.getTime()) ? null : f;
        }
        const texto = String(valor).trim();
        if (/^\d+$/.test(texto)) {
            const f = new Date(Number(texto));
            return isNaN(f.getTime()) ? null : f;
        }
        if (texto.includes('/')) {
            const partes = texto.split('/');
            if (partes.length === 3) {
                const f = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
                if (!isNaN(f.getTime())) return f;
            }
        }
        const f = new Date(texto.replace(' ', 'T'));
        return isNaN(f.getTime()) ? null : f;
    };

    // 2. Extraer TODA la fuente de datos fusionada (Pasado + Presente)
    const movimientosFuente = typeof window.obtenerMovimientosHistorial === 'function' ? window.obtenerMovimientosHistorial() : [];

    // Contadores para el Mes Seleccionado
    let entregasMes = 0, gruasMes = 0, devolucionesMes = 0, citasVOMes = 0;
    
    // Contadores para el Gráfico Anual
    let entregasPorMes = new Array(12).fill(0);
    let gruasPorMes = new Array(12).fill(0);
    let devolucionesPorMes = new Array(12).fill(0);
    let voPorMes = new Array(12).fill(0);

    // 3. 🧠 MOTOR DE CÁLCULO INTELIGENTE (Cruza historial con vehículos originales)
    movimientosFuente.forEach(mov => {
        const tipo = String(mov.tipo || mov.tipoFinalizacion || '').toUpperCase();
        const modelo = String(mov.C || mov.modelo || '').toUpperCase();
        const fechaMov = normalizarFechaDashboard(mov.ts || mov.fechaEntregaTs || mov.fechaEntrega) || normalizarFechaDashboard(mov.fechaTexto);
        
        if (!fechaMov) return;
        
        const esMismoAno = String(fechaMov.getFullYear()) === yearSel;
        const esMismoMes = esMismoAno && String(fechaMov.getMonth() + 1).padStart(2, '0') === monthSel;
        const mesIndex = fechaMov.getMonth();

        // Clasificación del tipo de operación
        let esTraslado = (tipo === 'TRASLADO');
        let esDevolucion = (tipo === 'DEVOLUCION' || modelo.includes('DEVOLUCION') || modelo.includes('DEVOLUCIÓN'));
        
        // Búsqueda profunda: ¿Este coche tenía V.O.?
        let cocheOriginal = todosLosCoches.find(c => c.fila === mov.fila);
        let teniaVO = cocheOriginal ? String(cocheOriginal.entregaVO || '').toUpperCase().trim() : 'NO';
        let esVO = (teniaVO === 'SÍ' || teniaVO === 'SI');

        // Sumar al Gráfico Anual
        if (esMismoAno) {
            if (esTraslado) gruasPorMes[mesIndex]++;
            else if (esDevolucion) devolucionesPorMes[mesIndex]++;
            else entregasPorMes[mesIndex]++;

            if (esVO) voPorMes[mesIndex]++;
        }

        // Sumar a los KPIs del Mes
        if (esMismoMes) {
            if (esTraslado) gruasMes++;
            else if (esDevolucion) devolucionesMes++;
            else entregasMes++;

            if (esVO) citasVOMes++;
        }
    });

    // 4. Renderizar KPIs Superiores
    if(document.getElementById('kpi-entregas')) document.getElementById('kpi-entregas').innerText = entregasMes;
    if(document.getElementById('kpi-gruas')) document.getElementById('kpi-gruas').innerText = gruasMes;
    if(document.getElementById('kpi-devueltos')) document.getElementById('kpi-devueltos').innerText = citasVOMes;
    if(document.getElementById('kpi-devoluciones')) document.getElementById('kpi-devoluciones').innerText = devolucionesMes;

    // Calcular Pasos por Taller/Recambios del mes actual
    let pasosTallerRecambiosMes = todosLosCoches.filter(c => {
        let ft = normalizarFechaDashboard(c.fechaEntradaTaller) || normalizarFechaDashboard(c.fechaFinTaller);
        let fr = normalizarFechaDashboard(c.fechaEntradaRecambios) || normalizarFechaDashboard(c.fechaFinRecambios);
        let tOk = ft && String(ft.getFullYear()) === yearSel && String(ft.getMonth() + 1).padStart(2, '0') === monthSel;
        let rOk = fr && String(fr.getFullYear()) === yearSel && String(fr.getMonth() + 1).padStart(2, '0') === monthSel;
        return tOk || rOk;
    }).length;
    if(document.getElementById('kpi-reparados')) document.getElementById('kpi-reparados').innerText = pasosTallerRecambiosMes;

    // 5. Cálculos para el Gráfico Donut (INVENTARIO ACTIVO - No depende del mes)
    let noEntregados = todosLosCoches.filter(c => c.entregado !== true && c.entregado !== "true");
    let enTaller = noEntregados.filter(c => c.enTaller && !c.finTaller).length;
    let enRecambios = noEntregados.filter(c => c.enRecambios && !c.finRecambios).length;
    let pteLogistica = noEntregados.filter(c => c.pasoAInventario === false && !(c.enTaller && !c.finTaller) && !(c.enRecambios && !c.finRecambios)).length;
    let listos = noEntregados.filter(c => c.pasoAInventario !== false && !(c.enTaller && !c.finTaller) && !(c.enRecambios && !c.finRecambios)).length;

    // 6. Destruir y dibujar gráficos
    if(document.getElementById('tituloGraficoAnual')) document.getElementById('tituloGraficoAnual').innerText = `Comparativa Mensual del Año ${yearSel}`;
    let mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if(window.chartObjDonut) window.chartObjDonut.destroy();
    if(window.chartObjMeses) window.chartObjMeses.destroy();

    const canvasDonut = document.getElementById('graficoDonut');
    if (canvasDonut) {
        const ctxDonut = canvasDonut.getContext('2d');
        window.chartObjDonut = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Listos/Cita', 'Taller', 'Recambios', 'Logística Ptea.'],
                datasets: [{
                    data: [listos, enTaller, enRecambios, pteLogistica],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8'],
                    borderWidth: 0, hoverOffset: 8
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 10, font: { size: 10 } } } }, cutout: '65%' }
        });
    }

    const canvasMeses = document.getElementById('graficoMeses');
    if (canvasMeses) {
        const ctxMeses = canvasMeses.getContext('2d');
        window.chartObjMeses = new Chart(ctxMeses, {
            type: 'bar',
            data: {
                labels: mesesNombres,
                datasets: [
                    { label: 'Entregas Clientes', data: entregasPorMes, backgroundColor: 'rgba(16, 185, 129, 0.85)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
                    { label: 'Traslados (Grúa)', data: gruasPorMes, backgroundColor: 'rgba(249, 115, 22, 0.85)', borderColor: '#f97316', borderWidth: 1, borderRadius: 4 },
                    { label: 'Recogidas V.O.', data: voPorMes, backgroundColor: 'rgba(168, 85, 247, 0.85)', borderColor: '#a855f7', borderWidth: 1, borderRadius: 4 },
                    { label: 'Devoluciones Completadas', data: devolucionesPorMes, backgroundColor: 'rgba(8, 145, 178, 0.85)', borderColor: '#0891b2', borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }, x: { grid: { display: false } } }, 
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { mode: 'index', intersect: false } } 
            }
        });
    }
};
    // ==========================================
// 📝 SISTEMA DE ENCUESTAS DE CLIENTES
// ==========================================

window.renderEncuestas = function() {
    // 1. Mostramos el contenedor principal en la pantalla
    document.getElementById('contenedorEncuestas').style.display = 'block';
    
    // 2. Buscamos el lugar exacto donde inyectaremos la tabla
    const tabla = document.getElementById('tablaEncuestas');
    
    // 3. Nos conectamos a la colección 'app_feedback' de Firebase en tiempo real
    window.onSnapshot(window.collection(window.db, "app_feedback"), (snapshot) => {
        // Preparamos la cabecera de la tabla HTML
        let html = `
        <table class="tabla-excel w-full">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Modelo</th>
                    <th>Facilidad</th>
                    <th>Utilidad</th>
                    <th>Comentario</th>
                </tr>
            </thead>
            <tbody>`;
        
        // 4. Recorremos cada encuesta recibida desde la base de datos
        snapshot.forEach(doc => {
            let d = doc.data();
            
            // Creamos una nueva fila por cada encuesta. 
            // Usamos 'repeat' para dibujar las estrellas según la puntuación (de 1 a 5)
            html += `
                <tr>
                    <td class="font-bold text-gray-500">${d.fecha || '-'}</td>
                    <td class="font-bold text-[#001e50]">${d.cliente || 'Anónimo'}</td>
                    <td>${d.modelo || '-'}</td>
                    <td class="text-center text-lg text-yellow-500">${'★'.repeat(d.facilidadUso || 0)}</td>
                    <td class="text-center text-lg text-yellow-500">${'★'.repeat(d.utilidadVideos || 0)}</td>
                    <td class="italic text-gray-600">${d.comentario || '-'}</td>
                </tr>`;
        });
        
        // Cerramos la tabla HTML
        html += `</tbody></table>`;
        
        // 5. Inyectamos todo el código generado en nuestra pantalla
        if (tabla) {
            tabla.innerHTML = html;
        }
        
    }, (error) => {
        // En caso de que haya un error de lectura, mostramos un aviso
        if (typeof window.mostrarErrorFirebase === 'function') {
            window.mostrarErrorFirebase(error, 'Error al cargar encuestas');
        }
    });
};