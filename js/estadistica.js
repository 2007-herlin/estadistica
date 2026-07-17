// js/estadistica.js - Control del Panel de Estadísticas de SIGEA

const StatsCharts = {
    histograma: null,
    ojiva: null,
    boxplot: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización del canvas de campana de Gauss
    const canvas = document.getElementById('chart-stats-normal-curva');
    if (canvas) {
        canvas.width = 400;
        canvas.height = 250;
    }
    
    setTimeout(async () => {
        try {
            await initEstadisticaModule();
        } catch (e) {
            console.error("Error al inicializar módulo de estadísticas:", e);
            if (typeof window.mostrarBannerErrorGlobal === 'function') {
                window.mostrarBannerErrorGlobal(e);
            }
        }
    }, 150);
});

async function initEstadisticaModule() {
    // 1. Navegación de Sub-Páginas Estadísticas
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

    // 2. Cargar dropdown de categorías de Binomial
    const cats = await DB.getCategorias();
    const binCatSel = document.getElementById('bin-select-cat');
    if (binCatSel) {
        binCatSel.innerHTML = '';
        cats.forEach(c => {
            binCatSel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    }

    // 3. Forzar carga de descriptiva por defecto
    triggerSubPageCalculations('descriptiva');
}

async function triggerSubPageCalculations(subPage) {
    const ventas = await DB.getVentas();
    const productos = await DB.getProductos();
    const detVentas = await DB.getDetallesVentasTodos();
    const warnings = document.getElementById('stats-no-data-warning');

    // Validar si hay datos en Supabase para operar
    if (ventas.length < 2 || detVentas.length < 2) {
        if (warnings) warnings.style.display = 'block';
    } else {
        if (warnings) warnings.style.display = 'none';
    }

    if (subPage === 'descriptiva') {
        document.getElementById('btn-calcular-descriptiva').onclick = async () => {
            const variable = document.getElementById('stats-select-variable').value;
            let dataset = [];

            if (variable === 'ventas_totales') {
                const daily = {};
                ventas.forEach(v => {
                    if (v.estado === 'EMITIDA') {
                        const d = v.fecha.split('T')[0];
                        daily[d] = (daily[d] || 0) + parseFloat(v.total);
                    }
                });
                dataset = Object.values(daily);
            } else if (variable === 'ventas_cantidades') {
                dataset = detVentas.map(d => d.cantidad);
            }

            if (dataset.length === 0) {
                dataset = [0, 0, 0, 0, 0]; // Dataset ficticio mínimo para evitar caídas si la BD está vacía
            }

            // Realizar cálculos descriptivos primarios
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

            // Variable Aleatoria y Función de Probabilidad de la muestra
            renderVariableAleatoriaTable(detVentas);

            // Dibujar gráficos descriptivos
            renderDescriptivaCharts(freqTable, dataset);
        };

        document.getElementById('btn-calcular-descriptiva').click();

    } else if (subPage === 'binomial') {
        const runBinomial = () => {
            const n = parseInt(document.getElementById('bin-n').value);
            const k = parseInt(document.getElementById('bin-k').value);
            const catId = parseInt(document.getElementById('bin-select-cat').value);
            
            if (isNaN(n) || isNaN(k) || n <= 0 || k < 0 || k > n) {
                showToast("Ingrese valores de muestra N y éxitos K coherentes (K <= N).", "warning");
                return;
            }

            let totalUnidadesVendidas = 0;
            let unidadesCat = 0;
            
            detVentas.forEach(d => {
                totalUnidadesVendidas += d.cantidad;
                const prod = productos.find(p => p.id === d.producto_id);
                if (prod && prod.categoria_id === catId) {
                    unidadesCat += d.cantidad;
                }
            });

            // Probabilidad empírica de éxito
            const pReal = totalUnidadesVendidas > 0 ? parseFloat((unidadesCat / totalUnidadesVendidas).toFixed(4)) : 0.25;
            document.getElementById('bin-p-val').value = pReal.toFixed(4);

            const probExacta = Stats.binomialCumulative(k, n, pReal, 'exact');
            const probAlMenos = Stats.binomialCumulative(k, n, pReal, 'at_least');
            const probAlMaximo = Stats.binomialCumulative(k, n, pReal, 'at_most');

            // Características esperadas
            const esperanza = n * pReal;
            const varianzaBin = n * pReal * (1 - pReal);
            const desvBin = Math.sqrt(varianzaBin);

            const resultsText = document.getElementById('binomial-results-text');
            resultsText.innerHTML = `
                <li><b>Probabilidad Empírica:</b> La tasa histórica de compra para esta categoría es <b>p = ${pReal.toFixed(4)}</b> (${(pReal * 100).toFixed(2)}%).</li>
                <li><b>Éxito del Ensayo (Fórmula General):</b> \(P(X = k) = \\binom{n}{k} p^k q^{n-k}\)</li>
                <li><b>Probabilidad Exacta:</b> P(X = ${k}) = <b>${(probExacta * 100).toFixed(4)}%</b> (Probabilidad: ${probExacta.toFixed(6)})</li>
                <li><b>Probabilidad Acumulada Mínima:</b> P(X >= ${k}) = <b>${(probAlMenos * 100).toFixed(4)}%</b></li>
                <li><b>Probabilidad Acumulada Máxima:</b> P(X <= ${k}) = <b>${(probAlMaximo * 100).toFixed(4)}%</b></li>
                <li><b>Propiedades de la Distribución:</b>
                    <br>- Esperanza matemática (Media Esperada): <b>E(X) = ${esperanza.toFixed(2)} éxitos</b>.
                    <br>- Varianza teórica: <b>V(X) = ${varianzaBin.toFixed(4)}</b>.
                    <br>- Desviación estándar teórica: <b>&sigma; = ${desvBin.toFixed(4)}</b>.
                </li>
            `;
        };

        const runPoisson = () => {
            const lambda = parseFloat(document.getElementById('poisson-lambda').value);
            const k = parseInt(document.getElementById('poisson-k').value);
            const direction = document.getElementById('poisson-direction').value;
            
            if (isNaN(lambda) || isNaN(k) || lambda <= 0 || k < 0) {
                showToast("Parámetros de Poisson incorrectos.", "warning");
                return;
            }

            const pExact = Stats.poissonCumulative(k, lambda, direction);
            
            // Aproximación a la binomial
            const nAprox = 100;
            const pAprox = lambda / nAprox;
            const pBin = Stats.binomialCumulative(k, nAprox, pAprox, 'exact');

            const resultsText = document.getElementById('poisson-results-text');
            resultsText.innerHTML = `
                <li><b>Fórmula General de Poisson:</b> \(P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}\)</li>
                <li><b>Tasa Media de Eventos:</b> &lambda; = <b>${lambda}</b> por unidad de tiempo.</li>
                <li><b>Probabilidad del Contraste:</b> El valor obtenido para el sentido seleccionado es de <b>${(pExact * 100).toFixed(4)}%</b> (Probabilidad: ${pExact.toFixed(6)}).</li>
                <li><b>Aproximación a la Binomial:</b> Utilizando un tamaño de muestra hipotético grande \(n = 100\) con probabilidad baja \(p = ${pAprox.toFixed(4)}\):
                    <br>- Probabilidad por Binomial: <b>${(pBin * 100).toFixed(4)}%</b>.
                    <br>- Margen de error en aproximación: <b>${Math.abs(pBin - pExact).toFixed(6)}</b>.
                </li>
            `;
        };

        document.getElementById('btn-calcular-binomial').onclick = runBinomial;
        document.getElementById('btn-calcular-poisson').onclick = runPoisson;

        // Cargar por primera vez
        runBinomial();
        runPoisson();

    } else if (subPage === 'normal') {
        const runNormal = () => {
            const daily = {};
            ventas.forEach(v => {
                if (v.estado === 'EMITIDA') {
                    const d = v.fecha.split('T')[0];
                    daily[d] = (daily[d] || 0) + parseFloat(v.total);
                }
            });
            const datasetVentas = Object.values(daily);
            const meanVal = datasetVentas.length > 0 ? Stats.mean(datasetVentas) : 1500;
            const sdVal = datasetVentas.length > 1 ? Stats.stdDev(datasetVentas) : 350;

            document.getElementById('normal-mean-val').value = meanVal.toFixed(2);
            document.getElementById('normal-sd-val').value = sdVal.toFixed(2);

            const xTarget = parseFloat(document.getElementById('normal-x-target').value) || 2000;
            
            const zScore = (xTarget - meanVal) / sdVal;
            const pLess = Stats.normalCumulative(xTarget, meanVal, sdVal);
            const pMore = 1 - pLess;

            document.getElementById('normal-z-result').textContent = `Z = ${zScore.toFixed(4)}`;
            
            const resultsText = document.getElementById('normal-probability-results-text');
            resultsText.innerHTML = `
                <li><b>Tipificación Z:</b> El valor transformado a la escala estándar es \(Z = \\frac{X - \\mu}{\\sigma} = \\frac{${xTarget} - ${meanVal.toFixed(2)}}{${sdVal.toFixed(2)}} = ${zScore.toFixed(4)}\).</li>
                <li><b>P(X <= ${xTarget}):</b> Probabilidad de que la facturación diaria sea a lo mucho S/. ${xTarget.toFixed(2)} es del <b>${(pLess * 100).toFixed(4)}%</b>.</li>
                <li><b>P(X > ${xTarget}):</b> Probabilidad de superar S/. ${xTarget.toFixed(2)} de facturación es del <b>${(pMore * 100).toFixed(4)}%</b>.</li>
            `;

            // Dibujar campana de Gauss normalizada con el área coloreada
            drawNormalCurve(zScore);
        };

        document.getElementById('btn-calcular-normal-area').onclick = runNormal;
        runNormal();

    } else if (subPage === 'muestrales') {
        const runMuestrales = () => {
            const daily = {};
            ventas.forEach(v => {
                if (v.estado === 'EMITIDA') {
                    const d = v.fecha.split('T')[0];
                    daily[d] = (daily[d] || 0) + parseFloat(v.total);
                }
            });
            const dataset = Object.values(daily);
            const meanVal = dataset.length > 0 ? Stats.mean(dataset) : 1200;
            const sdVal = dataset.length > 1 ? Stats.stdDev(dataset) : 250;
            const nSize = dataset.length || 30;

            const errEst = sdVal / Math.sqrt(nSize);

            // 1. Distribución muestral de la media
            document.getElementById('muestral-media-text').innerHTML = `
                <li>Media Poblacional estimada (\(\mu\)): <b>S/. ${meanVal.toFixed(2)}</b>.</li>
                <li>Error Estándar de la Media (\(\sigma_{\bar{x}} = s / \sqrt{n}\)): <b>S/. ${errEst.toFixed(4)}</b>.</li>
                <li><b>Interpretación:</b> Según el Teorema del Límite Central (TLC), si tomamos repetidas muestras de tamaño \(n = ${nSize}\), las medias muestrales se distribuirán normalmente alrededor de \(\mu\) con una desviación de \(\sigma_{\bar{x}}\).</li>
            `;

            // 2. Proporciones
            const countFacturas = ventas.filter(v => v.tipo_comprobante === 'FACTURA').length;
            const propFact = ventas.length > 0 ? countFacturas / ventas.length : 0.20;
            const seProp = Math.sqrt((propFact * (1 - propFact)) / (ventas.length || 30));

            document.getElementById('muestral-proporcion-text').innerHTML = `
                <li>Proporción muestral (\(p\) Facturas): <b>${(propFact * 100).toFixed(2)}%</b>.</li>
                <li>Error Estándar de la Proporción (\(\sigma_p = \sqrt{pq/n}\)): <b>${(seProp * 100).toFixed(4)}%</b>.</li>
            `;

            // 3. Diferencia de dos medias (Efectivo vs Tarjeta/Medios Digitales)
            const ventasEfec = ventas.filter(v => v.metodo_pago_id === 1 && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            const ventasTarj = ventas.filter(v => v.metodo_pago_id !== 1 && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            
            const meanE = ventasEfec.length > 0 ? Stats.mean(ventasEfec) : 80;
            const meanT = ventasTarj.length > 0 ? Stats.mean(ventasTarj) : 120;
            const varE = ventasEfec.length > 1 ? Stats.variance(ventasEfec) : 900;
            const varT = ventasTarj.length > 1 ? Stats.variance(ventasTarj) : 1600;
            const nE = ventasEfec.length || 15;
            const nT = ventasTarj.length || 15;
            
            const diffMeans = meanE - meanT;
            const seDiff = Math.sqrt((varE / nE) + (varT / nT));

            document.getElementById('muestral-diferencias-text').innerHTML = `
                <li>Diferencia de Medias (\(\bar{X}_1 - \bar{X}_2\)): <b>S/. ${diffMeans.toFixed(2)}</b>.</li>
                <li>Error Estándar de la Diferencia (\(\sigma_{\bar{x}_1-\bar{x}_2}\)): <b>S/. ${seDiff.toFixed(4)}</b>.</li>
            `;

            // 4. Calcular tamaño muestral
            calculateSampleSizes(ventas.length || 100, sdVal);
        };

        const calculateSampleSizes = (N, sdVal) => {
            const zVal = parseFloat(document.getElementById('sample-z-level').value);
            const eVal = parseFloat(document.getElementById('sample-margin-e').value) || 50;

            const nSizes = Stats.calculateSampleSize(N, zVal === 1.96 ? 0.95 : (zVal === 2.576 ? 0.99 : 0.90), eVal, sdVal);
            
            document.getElementById('sample-size-results-text').innerHTML = `
                <li><b>Para Estimar una Proporción (Población Finita N = ${N}):</b> Se requiere una muestra de <b>n = ${nSizes.finiteProportions}</b> transacciones (bajo variabilidad máxima \(p=q=0.5\)).</li>
                <li><b>Para Estimar la Media (Población Finita N = ${N}):</b> Se requiere una muestra de <b>n = ${nSizes.finiteMeans}</b> días de ventas analizados.</li>
                <li><b>Para Estimar la Media (Población Infinita):</b> Se requiere una muestra de <b>n = ${nSizes.infiniteMeans}</b> observaciones (Desviación histórica \(\sigma = S/. ${sdVal.toFixed(2)}\)).</li>
            `;
        };

        document.getElementById('btn-calcular-sample-size').onclick = () => {
            const daily = {};
            ventas.forEach(v => {
                if (v.estado === 'EMITIDA') {
                    const d = v.fecha.split('T')[0];
                    daily[d] = (daily[d] || 0) + parseFloat(v.total);
                }
            });
            const dataset = Object.values(daily);
            const sdVal = dataset.length > 1 ? Stats.stdDev(dataset) : 250;
            calculateSampleSizes(ventas.length || 100, sdVal);
        };

        runMuestrales();

    } else if (subPage === 'inferencia') {
        const runIntervals = () => {
            const daily = {};
            ventas.forEach(v => {
                if (v.estado === 'EMITIDA') {
                    const d = v.fecha.split('T')[0];
                    daily[d] = (daily[d] || 0) + parseFloat(v.total);
                }
            });
            const dataset = Object.values(daily);
            const meanVal = dataset.length > 0 ? Stats.mean(dataset) : 1300;
            const nSize = dataset.length || 30;

            // 1. IC para la media
            const icM = Stats.confidenceIntervalMean(dataset, 0.95);
            const icMUni = Stats.confidenceIntervalMeanUnilateral(dataset, 0.95);
            document.getElementById('ic-media-results-text').innerHTML = `
                <li><b>Intervalo Bilateral del 95%:</b> S/. ${icM.lower.toFixed(2)} &le; &mu; &le; S/. ${icM.upper.toFixed(2)} (Margen de error: &plusmn; S/. ${icM.margin.toFixed(2)}).</li>
                <li><b>Intervalo Unilateral Superior del 95%:</b> Con un 95% de confianza, la media diaria histórica de facturación es mayor o igual a <b>S/. ${icMUni.lowerBound.toFixed(2)}</b> (\(\mu \ge S/. ${icMUni.lowerBound.toFixed(2)}\)).</li>
            `;

            // 2. IC para la proporción de facturas
            const countFact = ventas.filter(v => v.tipo_comprobante === 'FACTURA').length;
            const icP = Stats.confidenceIntervalProportion(countFact, ventas.length || 30, 0.95);
            document.getElementById('ic-proporcion-results-text').innerHTML = `
                <li>Proporción observada de facturas: <b>${(icP.proportion * 100).toFixed(2)}%</b>.</li>
                <li><b>Intervalo Bilateral del 95%:</b> ${(icP.lower * 100).toFixed(2)}% &le; \(p\) &le; ${(icP.upper * 100).toFixed(2)}% (Margen de error: &plusmn; ${(icP.margin * 100).toFixed(2)}%).</li>
            `;

            // 3. IC para la diferencia de medias (Boletas vs Facturas)
            const ventBoleta = ventas.filter(v => v.tipo_comprobante === 'BOLETA' && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            const ventFactura = ventas.filter(v => v.tipo_comprobante === 'FACTURA' && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            
            const meanB = ventBoleta.length > 0 ? Stats.mean(ventBoleta) : 90;
            const meanF = ventFactura.length > 0 ? Stats.mean(ventFactura) : 320;
            const varB = ventBoleta.length > 1 ? Stats.variance(ventBoleta) : 1000;
            const varF = ventFactura.length > 1 ? Stats.variance(ventFactura) : 15000;
            const nB = ventBoleta.length || 20;
            const nF = ventFactura.length || 10;
            
            const diff = meanF - meanB;
            const seDiff = Math.sqrt((varB / nB) + (varF / nF));
            const dfWelch = Math.pow((varB/nB) + (varF/nF), 2) / ((Math.pow(varB/nB, 2)/(nB-1)) + (Math.pow(varF/nF, 2)/(nF-1)));
            const tCritical = 1.96; // Valor Z aproximado para df grandes
            
            const marginDiff = tCritical * seDiff;

            document.getElementById('ic-diff-medias-results-text').innerHTML = `
                <li>Diferencia puntual (\(\bar{X}_{Factura} - \bar{X}_{Boleta}\)): <b>S/. ${diff.toFixed(2)}</b>.</li>
                <li><b>Intervalo del 95%:</b> S/. ${(diff - marginDiff).toFixed(2)} &le; \(\mu_1 - \mu_2\) &le; S/. ${(diff + marginDiff).toFixed(2)}.</li>
            `;
        };

        // Pruebas de Hipótesis Eventos
        document.getElementById('btn-test-hip-media').onclick = () => {
            const test = Stats.hypothesisTestingPromotions(ventas);
            const resultsBox = document.getElementById('test-hip-results-box');
            const title = document.getElementById('test-hip-results-title');
            const text = document.getElementById('test-hip-results-text');

            resultsBox.style.display = 'block';
            title.textContent = "Contraste de Medias (Prueba t de Welch):";
            
            if (!test.available) {
                text.innerHTML = `<li>${test.message}</li>`;
                return;
            }

            text.innerHTML = `
                <li><b>Hipótesis Nula (H0):</b> El ticket promedio con descuento es menor o igual al ticket promedio regular (\(\mu_{Descuento} \le \mu_{Regular}\)).</li>
                <li><b>Hipótesis Alterna (H1):</b> El ticket con descuento es significativamente mayor (\(\mu_{Descuento} > \mu_{Regular}\)).</li>
                <li>Promedio con Descuento: <b>S/. ${test.mean_promo}</b> (N = ${test.n_promo})</li>
                <li>Promedio Regular: <b>S/. ${test.mean_control}</b> (N = ${test.n_control})</li>
                <li>Estadístico t obtenido: <b>t = ${test.t_statistic}</b> (Grados de libertad: df = ${test.df})</li>
                <li>P-Valor obtenido: <b>p = ${test.p_value}</b> (alpha = 0.05)</li>
                <li><b>Decisión:</b> <span style="font-weight:600; color:${test.rejectH0 ? 'var(--primary-hover)' : 'var(--danger)'};">${test.rejectH0 ? 'Rechazar H0' : 'No se rechaza H0'}</span>.</li>
                <li><b>Explicación de Error Tipo I:</b> Consiste en concluir falsamente que el descuento eleva las ventas cuando en realidad la variación fue solo azarosa. La probabilidad de cometer este error está fijada en \(\alpha = 5\%\).</li>
            `;
        };

        document.getElementById('btn-test-hip-varianza').onclick = () => {
            const ventBoleta = ventas.filter(v => v.tipo_comprobante === 'BOLETA' && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            const ventFactura = ventas.filter(v => v.tipo_comprobante === 'FACTURA' && v.estado === 'EMITIDA').map(v => parseFloat(v.total));
            
            const resultsBox = document.getElementById('test-hip-results-box');
            const title = document.getElementById('test-hip-results-title');
            const text = document.getElementById('test-hip-results-text');

            resultsBox.style.display = 'block';
            title.textContent = "Contraste de Varianzas (F-Test):";

            const testF = Stats.fTestVariances(ventFactura, ventBoleta);
            if (!testF.available) {
                text.innerHTML = `<li>No hay datos suficientes en ambos grupos (Factura vs Boleta) para ejecutar F-Test.</li>`;
                return;
            }

            const reject = testF.f_statistic > 2.0; // Región crítica aproximada para nivel 0.05
            text.innerHTML = `
                <li><b>H0:</b> La variabilidad de montos facturados es igual a la variabilidad de boletas (\(\sigma^2_{Factura} = \sigma^2_{Boleta}\)).</li>
                <li><b>H1:</b> Las variabilidades son significativamente distintas (\(\sigma^2_{Factura} \ne \sigma^2_{Boleta}\)).</li>
                <li>Varianza Facturas: <b>${testF.var1}</b> (df1 = ${testF.df1})</li>
                <li>Varianza Boletas: <b>${testF.var2}</b> (df2 = ${testF.df2})</li>
                <li>Estadístico F de Contraste: <b>F = ${testF.f_statistic}</b></li>
                <li><b>Decisión:</b> <span style="font-weight:600; color:${reject ? 'var(--primary-hover)' : 'var(--danger)'};">${reject ? 'Rechazar H0 (Varianzas heterogéneas)' : 'No se rechaza H0 (Varianzas homogéneas)'}</span>.</li>
            `;
        };

        document.getElementById('btn-test-hip-proporcion').onclick = () => {
            const resultsBox = document.getElementById('test-hip-results-box');
            const title = document.getElementById('test-hip-results-title');
            const text = document.getElementById('test-hip-results-text');
            resultsBox.style.display = 'block';
            title.textContent = "Contraste de Proporciones (Z-Test de dos proporciones):";

            // Comparar proporción de boletas entre turnos o clientes (ejemplo: clientes con RUC que compran en efectivo vs tarjeta)
            const rucEfec = ventas.filter(v => v.metodo_pago_id === 1).length;
            const rucTarj = ventas.filter(v => v.metodo_pago_id !== 1).length;
            const nTotal = ventas.length || 30;

            const testZ = Stats.zTestProportions(rucEfec, Math.ceil(nTotal * 0.4), rucTarj, Math.ceil(nTotal * 0.6));
            if (!testZ.available) {
                text.innerHTML = `<li>Datos de proporciones no disponibles.</li>`;
                return;
            }

            const reject = testZ.pValue < 0.05;
            text.innerHTML = `
                <li><b>H0:</b> Las proporciones de compra entre grupos son iguales (\(p_1 = p_2\)).</li>
                <li><b>H1:</b> Las proporciones son diferentes (\(p_1 \ne p_2\)).</li>
                <li>Proporción 1: <b>${(testZ.p1 * 100).toFixed(2)}%</b> | Proporción 2: <b>${(testZ.p2 * 100).toFixed(2)}%</b></li>
                <li>Estadístico Z obtenido: <b>Z = ${testZ.z_statistic}</b></li>
                <li>P-Valor obtenido: <b>p = ${testZ.pValue}</b></li>
                <li><b>Decisión:</b> <span style="font-weight:600; color:${reject ? 'var(--primary-hover)' : 'var(--danger)'};">${reject ? 'Rechazar H0' : 'No se rechaza H0'}</span>.</li>
            `;
        };

        runIntervals();
        document.getElementById('btn-test-hip-media').click();

    } else if (subPage === 'chicuadrado') {
        // Chi-Cuadrado de Independencia
        document.getElementById('btn-calcular-chicuadrado').onclick = async () => {
            const payMethods = await DB.getMetodosPago();
            const categories = await DB.getCategorias();
            
            // Estructurar matriz observada
            const observed = Array(categories.length).fill(0).map(() => Array(payMethods.length).fill(0));
            
            // Map de productos a categorías
            const prodMap = {};
            productos.forEach(p => {
                prodMap[p.id] = p.categoria_id;
            });
            
            // Map de ventas a método de pago
            const salePayMap = {};
            ventas.forEach(v => {
                salePayMap[v.id] = v.metodo_pago_id;
            });

            detVentas.forEach(d => {
                const catId = prodMap[d.producto_id];
                const pMethodId = salePayMap[d.venta_id];
                
                if (catId !== undefined && pMethodId !== undefined) {
                    const rowIdx = categories.findIndex(c => c.id === catId);
                    const colIdx = payMethods.findIndex(m => m.id === pMethodId);
                    if (rowIdx !== -1 && colIdx !== -1) {
                        observed[rowIdx][colIdx] += d.cantidad;
                    }
                }
            });

            const result = Stats.chiSquareIndependence(observed);

            // Render headers
            const headerRow = document.getElementById('chi-table-header');
            headerRow.innerHTML = '<th>Categoría \\ Método</th>';
            payMethods.forEach(m => {
                headerRow.innerHTML += `<th>${m.nombre}</th>`;
            });
            headerRow.innerHTML += '<th>Total Cat.</th>';

            // Render rows
            const tbody = document.getElementById('chi-table-body');
            tbody.innerHTML = '';
            
            let rowTotals = Array(categories.length).fill(0);
            let colTotals = Array(payMethods.length).fill(0);
            let totalGeneral = 0;

            categories.forEach((cat, rIdx) => {
                const tr = document.createElement('tr');
                let rowHtml = `<td><b>${cat.nombre}</b></td>`;
                
                payMethods.forEach((m, cIdx) => {
                    const val = observed[rIdx][cIdx];
                    rowHtml += `<td>${val} <span style="font-size:8px; color:var(--text-secondary);">(${result.expected[rIdx][cIdx].toFixed(1)})</span></td>`;
                    rowTotals[rIdx] += val;
                    colTotals[cIdx] += val;
                    totalGeneral += val;
                });
                
                rowHtml += `<td><b>${rowTotals[rIdx]}</b></td>`;
                tr.innerHTML = rowHtml;
                tbody.appendChild(tr);
            });

            // Fila de totales
            const trTotal = document.createElement('tr');
            let totalHtml = '<td><b>TOTAL PAGO</b></td>';
            colTotals.forEach(val => {
                totalHtml += `<td><b>${val}</b></td>`;
            });
            totalHtml += `<td><b>${totalGeneral}</b></td>`;
            trTotal.innerHTML = totalHtml;
            tbody.appendChild(trTotal);

            // Render resultados descriptivos
            const resultBox = document.getElementById('chicuadrado-results-box');
            resultBox.style.display = 'block';

            const reject = result.pValue < 0.05;

            document.getElementById('chicuadrado-results-text').innerHTML = `
                <li><b>H0 (Hipótesis Nula):</b> La Categoría del Producto y el Método de Pago utilizado son **variables independientes** (no hay correlación).</li>
                <li><b>H1 (Hipótesis Alterna):</b> Las variables **son dependientes** (el método de pago varía según la categoría).</li>
                <li>Estadístico Chi-Cuadrado de contraste: \(\chi^2 = <b>${result.chiSquare}</b>\)</li>
                <li>Grados de Libertad del modelo: df = (r-1)*(c-1) = <b>${result.df}</b></li>
                <li>Significancia empírica obtenida: <b>p-valor = ${result.pValue}</b> (nivel crítico \(\alpha = 0.05\))</li>
                <li><b>Decisión de Contraste:</b> <span style="font-weight:600; color:${reject ? 'var(--primary-hover)' : 'var(--danger)'};">${reject ? 'Rechazar H0 (Existe Dependencia Significativa)' : 'No se rechaza H0 (Independencia de variables)'}</span></li>
            `;
        };

        // T-Student properties
        document.getElementById('btn-calcular-tstudent').onclick = () => {
            const n = parseInt(document.getElementById('tstudent-n-samples').value) || 10;
            const df = n - 1;
            
            // Tabla simplificada T-Student crítica al 95% (Bilateral)
            const tTable95 = [
                12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228,
                2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086,
                2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042
            ];
            
            const tCrit = tTable95[df - 1] || 2.042;
            const text = document.getElementById('tstudent-results-text');
            text.innerHTML = `
                <li>Tamaño muestral fijado: <b>n = ${n} observaciones</b>.</li>
                <li>Grados de Libertad del modelo: df = n - 1 = <b>${df}</b>.</li>
                <li>Valor crítico de contraste en tablas (\(t_{\alpha/2, df}\)): <b>t = \pm ${tCrit.toFixed(3)}</b> (para 95% de confianza bilateral).</li>
                <li><b>Propiedades T-Student:</b>
                    <br>- Es simétrica respecto a su media (cero).
                    <br>- Posee colas más anchas y pesadas que la campana normal estándar Z.
                    <br>- A medida que los grados de libertad aumentan (\(n \to \infty\)), la distribución T-Student converge exactamente a la Normal Estándar.
                </li>
            `;
        };

        document.getElementById('btn-calcular-chicuadrado').click();
        document.getElementById('btn-calcular-tstudent').click();

    } else if (subPage === 'reportepdf') {
        // Enlazar botón de exportación PDF
        document.getElementById('btn-exportar-pdf-documento').onclick = () => {
            const container = document.getElementById('pdf-export-container');
            container.style.display = 'block';

            // Cargar contenido actualizado
            document.getElementById('pdf-descriptiva-content').innerHTML = `
                <p><b>Resumen de Variables Operativas del Negocio:</b></p>
                <p>- Media de ventas diarias: S/. ${document.getElementById('stats-res-media').textContent}</p>
                <p>- Mediana de ventas diarias: S/. ${document.getElementById('stats-res-mediana').textContent}</p>
                <p>- Coeficiente de Variación (CV): ${document.getElementById('stats-res-cv').textContent}</p>
                <p>- Frecuencias de Sturges aplicadas correctamente sobre las observaciones del sistema ERP.</p>
            `;

            document.getElementById('pdf-inferencial-content').innerHTML = `
                <p><b>Cálculos de Límites Intervalares (95% de Confianza):</b></p>
                <p>${document.getElementById('ic-media-results-text').innerHTML}</p>
                <p>${document.getElementById('ic-proporcion-results-text').innerHTML}</p>
            `;

            document.getElementById('pdf-hypothesis-content').innerHTML = `
                <p><b>Pruebas de Hipótesis Ejecutadas:</b></p>
                <p>${document.getElementById('test-hip-results-text').innerHTML}</p>
            `;

            document.getElementById('pdf-muestreo-content').innerHTML = `
                <p><b>Diseño Muestral de Poblaciones Finitas:</b></p>
                <p>${document.getElementById('sample-size-results-text').innerHTML}</p>
            `;

            // Configurar PDF y compilar
            const opt = {
                margin:       15,
                filename:     'SIGEA_Reporte_Estadistico_Completo.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(container).save().then(() => {
                container.style.display = 'none';
                showToast("Reporte PDF descargado con éxito.", "success");
            }).catch(e => {
                console.error("Error al compilar PDF:", e);
                showToast("Error al exportar reporte PDF.", "danger");
                container.style.display = 'none';
            });
        };
    }
}

// Dibujar Histograma, Ojiva y BoxPlot en canvas
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
                    label: 'Frecuencia Absoluta (Histograma)',
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
            labels: ['Muestra Analizada'],
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
                    min: Math.max(0, box.min - (box.max - box.min) * 0.1),
                    max: box.max + (box.max - box.min) * 0.1,
                    grid: { color: '#2C2C2C' }, 
                    ticks: { color: '#BDBDBD' } 
                },
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: () => {
                            return `L. Inferior: ${box.min.toFixed(1)}\nQ1 (25%): ${box.q1.toFixed(1)}\nMediana (50%): ${box.median.toFixed(1)}\nQ3 (75%): ${box.q3.toFixed(1)}\nL. Superior: ${box.max.toFixed(1)}`;
                        }
                    }
                },
                legend: { display: false }
            }
        }
    });
}

function renderVariableAleatoriaTable(detVentas) {
    const countMap = {};
    let totalTrans = 0;
    
    // Agrupar productos comprados por venta para definir X
    const saleItemCounts = {};
    detVentas.forEach(d => {
        saleItemCounts[d.venta_id] = (saleItemCounts[d.venta_id] || 0) + d.cantidad;
    });
    
    Object.values(saleItemCounts).forEach(cnt => {
        countMap[cnt] = (countMap[cnt] || 0) + 1;
        totalTrans++;
    });
    
    const sortedX = Object.keys(countMap).map(Number).sort((a, b) => a - b);
    const vaTBody = document.getElementById('stats-table-va-body');
    vaTBody.innerHTML = '';
    
    if (sortedX.length === 0) {
        vaTBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Cargando transacciones reales...</td></tr>';
        return;
    }

    let cumProb = 0;
    sortedX.forEach(x => {
        const freq = countMap[x];
        const prob = freq / totalTrans;
        cumProb += prob;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>x = ${x} productos</b></td>
            <td>${freq} transacciones</td>
            <td><b>${(prob * 100).toFixed(2)} %</b> (p = ${prob.toFixed(4)})</td>
            <td><b>${(cumProb * 100).toFixed(2)} %</b> (F(x) = ${cumProb.toFixed(4)})</td>
        `;
        vaTBody.appendChild(tr);
    });
}

function drawNormalCurve(zScore) {
    const canvas = document.getElementById('chart-stats-normal-curva');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 30;
    
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Dibujar línea base del eje X
    ctx.beginPath();
    ctx.strokeStyle = '#424242';
    ctx.lineWidth = 2;
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    const xMin = -3.5;
    const xMax = 3.5;
    
    function toScreenX(xVal) {
        return padding + ((xVal - xMin) / (xMax - xMin)) * graphWidth;
    }
    
    function toScreenY(yVal) {
        const yMax = 0.45; // Densidad máxima para escalar
        return height - padding - (yVal / yMax) * graphHeight;
    }
    
    function normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }
    
    // 1. Sombrear área de probabilidad acumulada (Z-Score)
    ctx.beginPath();
    ctx.fillStyle = 'rgba(21, 101, 192, 0.4)';
    ctx.moveTo(toScreenX(xMin), toScreenY(0));
    
    const zLimit = Math.min(xMax, Math.max(xMin, zScore));
    const step = 0.05;
    for (let x = xMin; x <= zLimit; x += step) {
        ctx.lineTo(toScreenX(x), toScreenY(normalPDF(x)));
    }
    ctx.lineTo(toScreenX(zLimit), toScreenY(0));
    ctx.closePath();
    ctx.fill();
    
    // 2. Dibujar curva campana de Gauss
    ctx.beginPath();
    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 3;
    for (let x = xMin; x <= xMax; x += step) {
        const sx = toScreenX(x);
        const sy = toScreenY(normalPDF(x));
        if (x === xMin) {
            ctx.moveTo(sx, sy);
        } else {
            ctx.lineTo(sx, sy);
        }
    }
    ctx.stroke();
    
    // 3. Dibujar línea vertical de la posición Z-score actual
    const zScreenX = toScreenX(zLimit);
    ctx.beginPath();
    ctx.strokeStyle = '#EF6C00';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(zScreenX, toScreenY(0));
    ctx.lineTo(zScreenX, toScreenY(normalPDF(zLimit)));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Texto Z superior
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Z = ' + zScore.toFixed(2), zScreenX, toScreenY(normalPDF(zLimit)) - 10);
    
    // Dibujar marcadores en el eje X (-3, -2, -1, 0, 1, 2, 3)
    ctx.fillStyle = '#BDBDBD';
    for (let tick = -3; tick <= 3; tick++) {
        const tx = toScreenX(tick);
        ctx.beginPath();
        ctx.moveTo(tx, height - padding);
        ctx.lineTo(tx, height - padding + 5);
        ctx.stroke();
        ctx.fillText(tick, tx, height - padding + 18);
    }
}
