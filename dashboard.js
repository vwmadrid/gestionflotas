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

        const esVODelMes = (fechaHoraStr) => {
            if (!fechaHoraStr) return false;
            let p = fechaHoraStr.split('T')[0].split('-'); 
            if (p.length !== 3) return false;
            return p[0] === yearSel && p[1] === monthSel;
        };

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

        document.getElementById('kpi-entregas').innerText = entregasMes;
        document.getElementById('kpi-gruas').innerText = gruasMes;
        document.getElementById('kpi-reparados').innerText = pasosTallerRecambiosMes;
        document.getElementById('kpi-devueltos').innerText = citasVOMes;

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
                let partes = cita.fechaHora.split('T')[0].split('-');
                if (partes.length === 3 && partes[0] === yearSel) {
                    let mesIndex = parseInt(partes[1], 10) - 1;
                    if (mesIndex >= 0 && mesIndex <= 11) recogidasPorMes[mesIndex]++;
                }
            }
        });

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
                        { label: 'Recogidas V.O.', data: recogidasPorMes, backgroundColor: 'rgba(168, 85, 247, 0.85)', borderColor: '#a855f7', borderWidth: 1, borderRadius: 4 }
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
