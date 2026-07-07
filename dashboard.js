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

        const esDelMes = (fechaStr) => {
            if (!fechaStr) return false;
            let p = fechaStr.split('/'); 
            if (p.length !== 3) return false;
            let m = String(parseInt(p[1], 10)).padStart(2, '0');
            return p[2] === yearSel && m === monthSel;
        };

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
            const f = new Date(String(valor).replace(' ', 'T'));
            return isNaN(f.getTime()) ? null : f;
        };

        const esVODelMes = (fechaHoraRaw) => {
            const fecha = normalizarFechaDashboard(fechaHoraRaw);
            if (!fecha) return false;
            return String(fecha.getFullYear()) === yearSel && String(fecha.getMonth() + 1).padStart(2, '0') === monthSel;
        };

        const esFechaMesPorTsOTexto = (timestampRaw, fechaTextoRaw) => {
            const fechaTs = normalizarFechaDashboard(timestampRaw);
            if (fechaTs) {
                return String(fechaTs.getFullYear()) === yearSel && String(fechaTs.getMonth() + 1).padStart(2, '0') === monthSel;
            }
            if (!fechaTextoRaw) return false;
            return esDelMes(String(fechaTextoRaw));
        };

        const movimientosFuente = Array.isArray(window.movimientosHistorial) ? window.movimientosHistorial : [];
        const hayMovimientos = movimientosFuente.length > 0;

        // 2. Filtrado de datos
        let todosEntregados = todosLosCoches.filter(c => c.entregado === true || c.entregado === "true");
        let noEntregados = todosLosCoches.filter(c => c.entregado !== true && c.entregado !== "true");
        
        let entregasClientesTotal = todosEntregados.filter(c => c.tipoFinalizacion !== 'TRASLADO');
        let trasladosGruaTotal = todosEntregados.filter(c => c.tipoFinalizacion === 'TRASLADO');

        // 3. Cálculos EXCLUSIVOS para el MES SELECCIONADO (Cifras de arriba)
        let entregasMes = entregasClientesTotal.filter(c => esDelMes(c.fechaEntrega)).length;
        let gruasMes = trasladosGruaTotal.filter(c => esDelMes(c.fechaEntrega)).length;
        
        let pasosTallerRecambiosMes = todosLosCoches.filter(c => 
            esDelMes(c.fechaEntradaTaller) || esDelMes(c.fechaFinTaller) || 
            esDelMes(c.fechaEntradaRecambios) || esDelMes(c.fechaFinRecambios)
        ).length;

        let citasVOMes = (window.datosAgenda || []).filter(cita => {
            let vo = String(cita.entregaVO || '').toUpperCase().trim();
            return (vo === 'SÍ' || vo === 'SI') && esVODelMes(cita.fechaHora);
        }).length;

        let devolucionesMes = (window.datosAgenda || []).filter(cita => {
            let modelo = String(cita?.modelo || '').toUpperCase();
            let tipoFin = String(cita?.tipoFinalizacion || '').toUpperCase();
            let esDevolucion = tipoFin === 'DEVOLUCION' || modelo.includes('DEVOLUCION') || modelo.includes('DEVOLUCIÓN');
            let estaCompletada = (cita?.entregado === true || cita?.entregado === "true");
            return esDevolucion && estaCompletada && esFechaMesPorTsOTexto(cita?.fechaEntrega, cita?.fechaEntregaTexto);
        }).length;

        if (hayMovimientos) {
            let entregasMesMov = 0;
            let gruasMesMov = 0;
            let devolucionesMesMov = 0;

            movimientosFuente.forEach(mov => {
                const tipo = String(mov.tipo || mov.tipoFinalizacion || '').toUpperCase();
                const fechaMov = normalizarFechaDashboard(mov.ts || mov.fechaEntregaTs || mov.fechaEntrega) || normalizarFechaDashboard(mov.fechaTexto);
                if (!fechaMov) return;
                if (String(fechaMov.getFullYear()) !== yearSel || String(fechaMov.getMonth() + 1).padStart(2, '0') !== monthSel) return;

                if (tipo === 'TRASLADO') gruasMesMov++;
                else if (tipo === 'DEVOLUCION') devolucionesMesMov++;
                else entregasMesMov++;
            });

            entregasMes = entregasMesMov;
            gruasMes = gruasMesMov;
            devolucionesMes = devolucionesMesMov;
        }

        document.getElementById('kpi-entregas').innerText = entregasMes;
        document.getElementById('kpi-gruas').innerText = gruasMes;
        document.getElementById('kpi-reparados').innerText = pasosTallerRecambiosMes;
        document.getElementById('kpi-devueltos').innerText = citasVOMes;
        const kpiDevoluciones = document.getElementById('kpi-devoluciones');
        if (kpiDevoluciones) kpiDevoluciones.innerText = devolucionesMes;

        // 4. Cálculos para el Gráfico Donut (INVENTARIO ACTIVO - No depende del mes)
        let enTaller = noEntregados.filter(c => c.enTaller && !c.finTaller).length;
        let enRecambios = noEntregados.filter(c => c.enRecambios && !c.finRecambios).length;
        let pteLogistica = noEntregados.filter(c => c.pasoAInventario === false && !(c.enTaller && !c.finTaller) && !(c.enRecambios && !c.finRecambios)).length;
        let listos = noEntregados.filter(c => c.pasoAInventario !== false && !(c.enTaller && !c.finTaller) && !(c.enRecambios && !c.finRecambios)).length;

        // 5. Cálculos para el Gráfico de Barras Comparativo (Todo el Año)
        document.getElementById('tituloGraficoAnual').innerText = `Comparativa Mensual del Año ${yearSel}`;
        let mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let entregasPorMes = new Array(12).fill(0);
        let recogidasPorMes = new Array(12).fill(0);
        let devolucionesPorMes = new Array(12).fill(0);

        entregasClientesTotal.forEach(c => {
            if (c.fechaEntrega) {
                let partes = c.fechaEntrega.split('/');
                if (partes.length === 3 && partes[2] === yearSel) {
                    let mesIndex = parseInt(partes[1], 10) - 1;
                    if (mesIndex >= 0 && mesIndex <= 11) entregasPorMes[mesIndex]++;
                }
            }
        });

        (window.datosAgenda || []).forEach(cita => {
            let vo = String(cita.entregaVO || '').toUpperCase().trim();
            if ((vo === 'SÍ' || vo === 'SI') && cita.fechaHora) {
                const fechaCita = normalizarFechaDashboard(cita.fechaHora);
                if (fechaCita && String(fechaCita.getFullYear()) === yearSel) {
                    let mesIndex = fechaCita.getMonth();
                    if (mesIndex >= 0 && mesIndex <= 11) recogidasPorMes[mesIndex]++;
                }
            }
        });

        (window.datosAgenda || []).forEach(cita => {
            let modelo = String(cita?.modelo || '').toUpperCase();
            let tipoFin = String(cita?.tipoFinalizacion || '').toUpperCase();
            let esDevolucion = tipoFin === 'DEVOLUCION' || modelo.includes('DEVOLUCION') || modelo.includes('DEVOLUCIÓN');
            let estaCompletada = (cita?.entregado === true || cita?.entregado === "true");
            if (!esDevolucion || !estaCompletada) return;

            const fechaCita = normalizarFechaDashboard(cita?.fechaEntrega) || normalizarFechaDashboard(cita?.fechaHora);
            if (fechaCita && String(fechaCita.getFullYear()) === yearSel) {
                let mesIndex = fechaCita.getMonth();
                if (mesIndex >= 0 && mesIndex <= 11) devolucionesPorMes[mesIndex]++;
            }
        });

        if (hayMovimientos) {
            entregasPorMes.fill(0);
            recogidasPorMes.fill(0);
            devolucionesPorMes.fill(0);

            movimientosFuente.forEach(mov => {
                const tipo = String(mov.tipo || mov.tipoFinalizacion || '').toUpperCase();
                const fechaMov = normalizarFechaDashboard(mov.ts || mov.fechaEntregaTs || mov.fechaEntrega) || normalizarFechaDashboard(mov.fechaTexto);
                if (!fechaMov || String(fechaMov.getFullYear()) !== yearSel) return;

                const mesIndex = fechaMov.getMonth();
                if (mesIndex < 0 || mesIndex > 11) return;

                if (tipo === 'TRASLADO') recogidasPorMes[mesIndex]++;
                else if (tipo === 'DEVOLUCION') devolucionesPorMes[mesIndex]++;
                else entregasPorMes[mesIndex]++;
            });
        }

        // 6. Destruir y dibujar gráficos
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
                        { label: 'Recogidas V.O.', data: recogidasPorMes, backgroundColor: 'rgba(168, 85, 247, 0.85)', borderColor: '#a855f7', borderWidth: 1, borderRadius: 4 },
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