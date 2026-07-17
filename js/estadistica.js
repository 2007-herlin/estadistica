// js/estadistica.js - Control del Panel de Estadísticas de SIGEA

const StatsCharts = {
    histograma: null,
    ojiva: null,
    boxplot: null,
    dispersion: null
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await initEstadisticaModule();
        } catch (e) {
            console.error("Error al inicializar módulo de estadísticas:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

async function initEstadisticaModule() {
    // Navegación de Sub-Páginas Estadísticas
    const navItems = document.querySelectorAll('.stats-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const subPage = item.getAttribute('data-sub');
            const subPages = document.querySelectorAll('.sub-stats-page');
            subPages.forEach(p => p.style.display = 'none');
            document.getElementById(`sub-stats-${subPage}`).style.display = 'block';

            triggerSubPageCalculations(subPage);
        });
    });

    // Cargar dropdown de categorías de Binomial
    const cats = await DB.getCategorias();
    const binCatSel = document.getElementById('bin-select-cat');
    binCatSel.innerHTML = '';
    cats.forEach(c => {
        binCatSel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    // Cargar productos para predicción de stockout
    const prods = await DB.getProductos();
    const predProdSel = document.getElementById('predict-select-prod');
    predProdSel.innerHTML = '';
    prods.forEach(p => {
        predProdSel.innerHTML += `<option value="${p.id}">${p.nombre} (Stock: ${p.stock_minimo || 5} min)</option>`;
    });

    // Forzar carga de descriptiva
    triggerSubPageCalculations('descriptiva');
}

async function triggerSubPageCalculations(subPage) {
    const ventas = await DB.getVentas();
    const productos = await DB.getProductos();
    const publicidad = await DB.getPublicidadDiaria();

    if (subPage === 'descriptiva') {
        document.getElementById('btn-calcular-descriptiva').onclick = async () => {
            const variable = document.getElementById('stats-select-variable').value;
            let dataset = [];

            if (variable === 'ventas_totales') {
                const daily = {};
                ventas.forEach(v => {
                    if (v.estado === 'EMITIDA') {
                        const d = v.fecha.split('T')[0];
                        daily[d] = (daily[d] || 0) + v.total;
                    }
                });
                dataset = Object.values(daily);
            } else if (variable === 'ventas_cantidades') {
                const details = await getLocalDetallesVentas();
                dataset = details.map(d => d.cantidad);
            } else if (variable === 'publicidad') {
                dataset = Object.values(publicidad);
            }

            if (dataset.length === 0) {
                showToast("No hay datos suficientes para calcular.", "warning");
                return;
            }

            // Realizar cálculos
            const media = Stats.mean(dataset);
            const mediana = Stats.median(dataset);
            const modaObj = Stats.mode(dataset);
            const sd = Stats.stdDev(dataset);
            const variance = Stats.variance(dataset);
            const cv = Stats.coeffVariation(dataset);
            const range = Stats.range(dataset);
            const quarts = Stats.quartiles(dataset);

            document.getElementById('stats-res-media').textContent = media.toLocaleString('es-PE', { maximumFractionDigits: 2 });
            document.getElementById('stats-res-mediana').textContent = mediana.toLocaleString('es-PE', { maximumFractionDigits: 2 });
            document.getElementById('stats-res-moda').textContent = modaObj.modes.length > 0 
                ? `${modaObj.modes.join(', ')} (freq: ${modaObj.frequency})` 
                : 'Sin moda repetida';
            document.getElementById('stats-res-desviacion').textContent = sd.toLocaleString('es-PE', { maximumFractionDigits: 2 });
            document.getElementById('stats-res-varianza').textContent = variance.toLocaleString('es-PE', { maximumFractionDigits: 2 });
            document.getElementById('stats-res-cv').textContent = `${cv.toFixed(2)} %`;
            document.getElementById('stats-res-rango').textContent = range.toLocaleString('es-PE', { maximumFractionDigits: 2 });
            document.getElementById('stats-res-cuartiles').textContent = `Q1: ${quarts.Q1.toFixed(1)} | Q2: ${quarts.Q2.toFixed(1)} | Q3: ${quarts.Q3.toFixed(1)}`;

            // Sturges Frequencies Table
            const freqTable = Stats.frequencies(dataset);
            const freqTBody = document.getElementById('stats-table-frequencies-body');
            freqTBody.innerHTML = '';
            
            freqTable.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><b>[${row.lower.toFixed(2)} - ${row.upper.toFixed(2)})</b></td>
                    <td>${row.midpoint.toFixed(2)}</td>
                    <td><b>${row.fa}</b></td>
                    <td>${(row.fr * 100).toFixed(2)} %</td>
                    <td>${row.fi}</td>
                    <td>${(row.fri * 100).toFixed(2)} %</td>
                `;
                freqTBody.appendChild(tr);
            });

            // Dibujar gráficos descriptivos
            renderDescriptivaCharts(freqTable, dataset);
        };

        document.getElementById('btn-calcular-descriptiva').click();

    } else if (subPage === 'probabilidad') {
        const runBinomial = async () => {
            const n = parseInt(document.getElementById('bin-n').value);
            const k = parseInt(document.getElementById('bin-k').value);
            const catId = parseInt(document.getElementById('bin-select-cat').value);
            
            if (isNaN(n) || isNaN(k) || n <= 0 || k < 0 || k > n) {
                showToast("Ingrese valores N y K válidos.", "warning");
                return;
            }

            const detalles = await getLocalDetallesVentas();
            let totalUnidadesVendidas = 0;
            let unidadesCat = 0;
            
            detalles.forEach(d => {
                totalUnidadesVendidas += d.cantidad;
                const prod = productos.find(p => p.id === d.producto_id);
                if (prod && prod.categoria_id === catId) {
                    unidadesCat += d.cantidad;
                }
            });

            const pReal = totalUnidadesVendidas > 0 ? parseFloat((unidadesCat / totalUnidadesVendidas).toFixed(4)) : 0.25;
            document.getElementById('bin-lbl-p').textContent = pReal.toFixed(4);
            document.getElementById('bin-p-val').value = pReal.toFixed(4);

            const probExacta = Stats.binomialCumulative(k, n, pReal, 'exact');
            const probAlMenos = Stats.binomialCumulative(k, n, pReal, 'at_least');
            const probAlMaximo = Stats.binomialCumulative(k, n, pReal, 'at_most');

            const resultsText = document.getElementById('binomial-results-text');
            resultsText.innerHTML = `
                <li>La probabilidad de éxito unitaria para la categoría seleccionada es de <b>p = ${pReal.toFixed(4)}</b> (${(pReal*100).toFixed(2)}%).</li>
                <li>Probabilidad de vender exactamente <b>${k}</b> unidades: <b>${(probExacta * 100).toFixed(4)}%</b> (P(X = ${k}) = ${probExacta.toFixed(6)})</li>
                <li>Probabilidad de vender al menos <b>${k}</b> unidades: <b>${(probAlMenos * 100).toFixed(4)}%</b> (P(X >= ${k}) = ${probAlMenos.toFixed(6)})</li>
                <li>Probabilidad de vender a lo mucho <b>${k}</b> unidades: <b>${(probAlMaximo * 100).toFixed(4)}%</b> (P(X <= ${k}) = ${probAlMaximo.toFixed(6)})</li>
            `;
        };
        
        document.getElementById('btn-calcular-binomial').onclick = runBinomial;
        document.getElementById('bin-select-cat').onchange = runBinomial;

        // Poisson
        document.getElementById('btn-calcular-poisson').onclick = () => {
            const lambda = parseFloat(document.getElementById('poisson-lambda').value);
            const k = parseInt(document.getElementById('poisson-k').value);
            const dir = document.getElementById('poisson-direction').value;

            if (isNaN(lambda) || isNaN(k) || lambda <= 0 || k < 0) {
                showToast("Parámetros de Poisson incorrectos.", "warning");
                return;
            }

            const prob = Stats.poissonCumulative(k, lambda, dir);
            
            let dirText = `exactamente ${k} clientes`;
            if (dir === 'more_than') dirText = `más de ${k} clientes`;
            if (dir === 'at_most') dirText = `a lo mucho ${k} clientes`;
            if (dir === 'at_least') dirText = `como mínimo ${k} clientes`;

            const resultsText = document.getElementById('poisson-results-text');
            resultsText.innerHTML = `
                <li>Tasa promedio parametrizada: <b>λ = ${lambda}</b> clientes/hora.</li>
                <li>La probabilidad de recibir <b>${dirText}</b> es de: <b>${(prob * 100).toFixed(4)}%</b> (Probabilidad = ${prob.toFixed(6)}).</li>
            `;
        };

        // Normal & Intervalos
        const daily = {};
        ventas.forEach(v => {
            if (v.estado === 'EMITIDA') {
                const d = v.fecha.split('T')[0];
                daily[d] = (daily[d] || 0) + v.total;
            }
        });
        const datasetVentas = Object.values(daily);
        const meanV = Stats.mean(datasetVentas);
        const sdV = Stats.stdDev(datasetVentas);

        document.getElementById('normal-mean').value = meanV.toFixed(2);
        document.getElementById('normal-sd').value = sdV.toFixed(2);

        document.getElementById('btn-calcular-normal').onclick = () => {
            const u = parseFloat(document.getElementById('normal-mean').value);
            const sd = parseFloat(document.getElementById('normal-sd').value);
            const xVal = parseFloat(document.getElementById('normal-x').value);
            const dir = document.getElementById('normal-direction').value;

            if (sd <= 0) {
                showToast("Desviación estándar inválida.", "danger");
                return;
            }

            const zScore = (xVal - u) / sd;
            let prob = Stats.normalCumulative(xVal, u, sd);
            if (dir === 'more_than') {
                prob = 1 - prob;
            }

            const ci95 = Stats.confidenceIntervalMean(datasetVentas, 0.95);
            const ci99 = Stats.confidenceIntervalMean(datasetVentas, 0.99);

            const resultsText = document.getElementById('normal-results-text');
            resultsText.innerHTML = `
                <li><b>Z-Score:</b> Para un valor X = S/. ${xVal.toFixed(2)}, el valor Z es <b>${zScore.toFixed(4)}</b>.</li>
                <li>La probabilidad de vender ${dir === 'less_than' ? 'menos o igual a' : 'más o igual a'} S/. ${xVal.toFixed(2)} es del <b>${(prob * 100).toFixed(4)}%</b> (P = ${prob.toFixed(6)}).</li>
                <li><b>Intervalo de Confianza del 95%:</b> Con un 95% de confianza, las ventas diarias promedio del negocio se sitúan entre <b>S/. ${ci95.lower.toLocaleString('es-PE')}</b> y <b>S/. ${ci95.upper.toLocaleString('es-PE')}</b>.</li>
                <li><b>Intervalo de Confianza del 99%:</b> Con un 99% de confianza, las ventas diarias promedio se sitúan entre <b>S/. ${ci99.lower.toLocaleString('es-PE')}</b> y <b>S/. ${ci99.upper.toLocaleString('es-PE')}</b>.</li>
            `;
        };

        // Contraste Hipótesis
        document.getElementById('btn-ejecutar-hipotesis').onclick = () => {
            const test = Stats.hypothesisTestingPromotions(ventas);
            const resultsText = document.getElementById('hipotesis-results-text');
            
            if (!test.available) {
                resultsText.innerHTML = `<li>${test.message}</li>`;
                return;
            }

            resultsText.innerHTML = `
                <li>Ticket promedio con promociones (Descuento > 0): <b>S/. ${test.mean_promo.toFixed(2)}</b> (N = ${test.n_promo})</li>
                <li>Ticket promedio ordinario (Sin descuento): <b>S/. ${test.mean_control.toFixed(2)}</b> (N = ${test.n_control})</li>
                <li>Estadístico t obtenido: <b>t = ${test.t_statistic.toFixed(4)}</b> (Grados de libertad df = ${test.df})</li>
                <li>Valor P de significancia obtenido: <b>p-valor = ${test.p_value.toFixed(6)}</b></li>
                <li>Nivel de significancia establecido: <b>alpha = 0.05 (5%)</b></li>
                <li><b>Conclusión:</b> <span style="color:${test.rejectH0 ? '#81C784' : '#E57373'}; font-weight:600;">${test.conclusion}</span></li>
            `;
        };

    } else if (subPage === 'regresion') {
        // Regresión
        const daily = {};
        ventas.forEach(v => {
            if (v.estado === 'EMITIDA') {
                const d = v.fecha.split('T')[0];
                daily[d] = (daily[d] || 0) + v.total;
            }
        });

        const fechas = Object.keys(publicidad).sort();
        const pubArray = [];
        const ventArray = [];
        
        fechas.forEach(f => {
            if (daily[f]) {
                pubArray.push(publicidad[f]);
                ventArray.push(daily[f]);
            }
        });

        const reg = Stats.linearRegression(pubArray, ventArray);

        document.getElementById('stats-equation-val').textContent = reg.equation;
        document.getElementById('stats-pearson-val').textContent = `${reg.r.toFixed(4)}`;
        document.getElementById('stats-r2-val').textContent = `${(reg.r2 * 100).toFixed(2)} %`;

        renderDispersionChart(pubArray, ventArray, reg);

        document.getElementById('btn-pronosticar-ventas').onclick = () => {
            const inputPub = parseFloat(document.getElementById('predict-adv-cost').value);
            if (isNaN(inputPub) || inputPub < 0) {
                showToast("Ingrese inversión de publicidad correcta.", "warning");
                return;
            }
            const predicted = reg.predict(inputPub);
            document.getElementById('stats-predicted-sales-val').textContent = `S/. ${predicted.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
        };
        document.getElementById('btn-pronosticar-ventas').click();

        // Predicción Stockout
        document.getElementById('btn-predecir-stockout').onclick = async () => {
            const pId = parseInt(document.getElementById('predict-select-prod').value);
            const invList = await DB.getInventario();
            const invItem = invList.find(i => i.producto_id === pId);
            if (!invItem) {
                showToast("Producto no encontrado.", "danger");
                return;
            }

            const detV = await getLocalDetallesVentas();
            const dailyOutflows = Array(30).fill(0);
            
            const baseD = new Date();
            baseD.setDate(baseD.getDate() - 30);
            const dateMap = {};
            for (let i = 0; i < 30; i++) {
                const tempD = new Date(baseD);
                tempD.setDate(baseD.getDate() + i);
                dateMap[tempD.toISOString().split('T')[0]] = i;
            }

            detV.forEach(d => {
                if (d.producto_id === pId) {
                    const v = ventas.find(item => item.id === d.venta_id);
                    if (v && v.estado === 'EMITIDA') {
                        const dateStr = v.fecha.split('T')[0];
                        const idx = dateMap[dateStr];
                        if (idx !== undefined) {
                            dailyOutflows[idx] += d.cantidad;
                        }
                    }
                }
            });

            const stock = invItem.stock_actual;
            const min = invItem.productos?.stock_minimo || 5;
            const pred = Stats.inventoryPrediction(stock, min, dailyOutflows, 5);

            const resBox = document.getElementById('stockout-results-box');
            resBox.style.display = 'block';
            
            const resText = document.getElementById('stockout-results-text');
            let statusText = "";
            let color = "";
            if (pred.status === 'CRÍTICO') { color = "#C62828"; statusText = "🔴 RIESGO CRÍTICO (Agotamiento inminente en menos de 2 días)"; }
            else if (pred.status === 'RIESGO_ALTO') { color = "#EF6C00"; statusText = "🔴 RIESGO ALTO (Se agotará en menos de 5 días)"; }
            else if (pred.status === 'PREVENCIÓN') { color = "#FFB74D"; statusText = "⚠️ PREVENCIÓN (Reponer en los próximos 10 días)"; }
            else { color = "#81C784"; statusText = "🟢 ESTABLE (Stock de seguridad suficiente)"; }

            resText.innerHTML = `
                <li>Stock Físico Actual: <b>${stock} unidades</b> (Stock mínimo de alerta: ${min}).</li>
                <li>Salidas promedio diarias estimadas (últimos 5 días): <b>${pred.predictedOutflow} unidades/día</b>.</li>
                <li>Días estimados para alcanzar el stock mínimo: <b style="color:${pred.daysToStockMin <= 2 ? '#EF6C00' : '#FFFFFF'}">${pred.daysToStockMin === Infinity ? 'N/A' : pred.daysToStockMin} días</b>.</li>
                <li>Días para el agotamiento total (quiebra): <b>${pred.daysToStockout === Infinity ? 'Infinitos (sin demanda)' : pred.daysToStockout + ' días'}</b>.</li>
                <li>Diagnóstico de Seguridad: <b style="color:${color};">${statusText}</b></li>
            `;
        };
        document.getElementById('btn-predecir-stockout').click();

    } else if (subPage === 'narrativo') {
        const narrativeList = document.getElementById('reporte-narrativo-completo');
        narrativeList.innerHTML = '<li>Generando diagnóstico del negocio...</li>';

        setTimeout(async () => {
            const invList = await DB.getInventario();
            const report = Stats.generateNarrativeReport(ventas, [], invList, publicidad);
            narrativeList.innerHTML = '';
            report.forEach(paragraph => {
                const li = document.createElement('li');
                li.innerHTML = paragraph;
                narrativeList.appendChild(li);
            });
        }, 150);
    }
}

function renderDescriptivaCharts(freqTable, dataset) {
    if (StatsCharts.histograma) StatsCharts.histograma.destroy();
    if (StatsCharts.ojiva) StatsCharts.ojiva.destroy();
    if (StatsCharts.boxplot) StatsCharts.boxplot.destroy();

    const labels = freqTable.map(r => `[${r.lower.toFixed(0)}-${r.upper.toFixed(0)})`);
    const faData = freqTable.map(r => r.fa);
    const fiData = freqTable.map(r => r.fi);

    const ctxHist = document.getElementById('chart-stats-histograma').getContext('2d');
    StatsCharts.histograma = new Chart(ctxHist, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Frecuencia Absoluta',
                    data: faData,
                    backgroundColor: 'rgba(21, 101, 192, 0.65)',
                    borderColor: '#1565C0',
                    borderWidth: 1,
                    barPercentage: 1,
                    categoryPercentage: 1
                },
                {
                    label: 'Polígono de Frecuencias',
                    data: faData,
                    type: 'line',
                    borderColor: '#E57373',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } },
                x: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: { legend: { labels: { color: '#FFFFFF' } } }
        }
    });

    const ctxOjiva = document.getElementById('chart-stats-ojiva').getContext('2d');
    StatsCharts.ojiva = new Chart(ctxOjiva, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Frecuencia Acumulada (Ojiva)',
                data: fiData,
                borderColor: '#81C784',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } },
                x: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: { legend: { labels: { color: '#FFFFFF' } } }
        }
    });

    const box = Stats.boxplot(dataset);
    const ctxBox = document.getElementById('chart-stats-boxplot').getContext('2d');
    StatsCharts.boxplot = new Chart(ctxBox, {
        type: 'bar',
        data: {
            labels: ['Variable'],
            datasets: [{
                label: 'Mediana (Q2)',
                data: [box.median],
                backgroundColor: '#1565C0',
                borderColor: '#1976D2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { 
                    min: Math.max(0, box.min - (box.max-box.min)*0.1),
                    max: box.max + (box.max-box.min)*0.1,
                    grid: { color: '#2C2C2C' }, 
                    ticks: { color: '#BDBDBD' } 
                },
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: () => {
                            return `Mín: ${box.min.toFixed(1)}\nQ1: ${box.q1.toFixed(1)}\nMediana: ${box.median.toFixed(1)}\nQ3: ${box.q3.toFixed(1)}\nMáx: ${box.max.toFixed(1)}`;
                        }
                    }
                },
                legend: { display: false }
            }
        }
    });
}

function renderDispersionChart(x, y, regression) {
    if (StatsCharts.dispersion) StatsCharts.dispersion.destroy();

    const scatterData = x.map((val, idx) => ({ x: val, y: y[idx] }));
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const lineData = [
        { x: minX, y: regression.predict(minX) },
        { x: maxX, y: regression.predict(maxX) }
    ];

    const ctx = document.getElementById('chart-stats-dispersion').getContext('2d');
    StatsCharts.dispersion = new Chart(ctx, {
        data: {
            datasets: [
                {
                    type: 'scatter',
                    label: 'Ventas vs Publicidad',
                    data: scatterData,
                    backgroundColor: '#FFB74D',
                    borderColor: '#EF6C00',
                    borderWidth: 1
                },
                {
                    type: 'line',
                    label: 'Recta de Regresión',
                    data: lineData,
                    borderColor: '#1976D2',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    type: 'linear', 
                    position: 'bottom', 
                    title: { display: true, text: 'Publicidad (S/.)', color: '#FFFFFF' },
                    grid: { color: '#2C2C2C' },
                    ticks: { color: '#BDBDBD' }
                },
                y: { 
                    title: { display: true, text: 'Ventas Totales (S/.)', color: '#FFFFFF' },
                    grid: { color: '#2C2C2C' },
                    ticks: { color: '#BDBDBD' }
                }
            },
            plugins: { legend: { labels: { color: '#FFFFFF' } } }
        }
    });
}

async function getLocalDetallesVentas() {
    return await DB.getDetallesVentasTodos();
}
