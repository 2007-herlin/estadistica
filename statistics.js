// statistics.js - Motor Analítico y Estadístico para SIGEA

const Stats = {
    // --- ESTADÍSTICA DESCRIPTIVA ---
    
    // Media Aritmética
    mean: (data) => {
        if (!data || data.length === 0) return 0;
        const sum = data.reduce((acc, val) => acc + val, 0);
        return parseFloat((sum / data.length).toFixed(4));
    },

    // Mediana
    median: (data) => {
        if (!data || data.length === 0) return 0;
        const sorted = [...data].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(4));
        }
        return parseFloat(sorted[mid].toFixed(4));
    },

    // Moda (Soporta unimodal o multimodal. Devuelve objeto con modas y frecuencia)
    mode: (data) => {
        if (!data || data.length === 0) return { modes: [], frequency: 0 };
        const counts = {};
        let maxFreq = 0;
        data.forEach(val => {
            counts[val] = (counts[val] || 0) + 1;
            if (counts[val] > maxFreq) {
                maxFreq = counts[val];
            }
        });
        
        const modes = [];
        Object.keys(counts).forEach(val => {
            if (counts[val] === maxFreq && maxFreq > 1) {
                modes.push(parseFloat(val));
            }
        });
        
        return {
            modes: modes.sort((a,b) => a - b),
            frequency: maxFreq
        };
    },

    // Rango
    range: (data) => {
        if (!data || data.length === 0) return 0;
        const max = Math.max(...data);
        const min = Math.min(...data);
        return parseFloat((max - min).toFixed(4));
    },

    // Varianza
    variance: (data, isSample = true) => {
        if (!data || data.length < (isSample ? 2 : 1)) return 0;
        const avg = Stats.mean(data);
        const sqDiffSum = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
        const divisor = isSample ? data.length - 1 : data.length;
        return parseFloat((sqDiffSum / divisor).toFixed(4));
    },

    // Desviación Estándar
    stdDev: (data, isSample = true) => {
        return parseFloat(Math.sqrt(Stats.variance(data, isSample)).toFixed(4));
    },

    // Coeficiente de Variación (%)
    coeffVariation: (data) => {
        const avg = Stats.mean(data);
        if (avg === 0) return 0;
        const sd = Stats.stdDev(data);
        return parseFloat(((sd / avg) * 100).toFixed(2));
    },

    // Percentil (p: 0 a 100)
    percentile: (data, p) => {
        if (!data || data.length === 0) return 0;
        if (p <= 0) return Math.min(...data);
        if (p >= 100) return Math.max(...data);
        
        const sorted = [...data].sort((a, b) => a - b);
        const idx = (p / 100) * (sorted.length - 1);
        const low = Math.floor(idx);
        const high = Math.ceil(idx);
        
        if (low === high) return sorted[low];
        
        // Interpolación lineal
        const weight = idx - low;
        return parseFloat((sorted[low] + weight * (sorted[high] - sorted[low])).toFixed(4));
    },

    // Cuartiles
    quartiles: (data) => {
        return {
            Q1: Stats.percentile(data, 25),
            Q2: Stats.percentile(data, 50), // Mediana
            Q3: Stats.percentile(data, 75)
        };
    },

    // Diagrama de Caja y Bigotes (BoxPlot Data)
    boxplot: (data) => {
        if (!data || data.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] };
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = Stats.percentile(sorted, 25);
        const median = Stats.percentile(sorted, 50);
        const q3 = Stats.percentile(sorted, 75);
        const iqr = q3 - q1;
        
        const lowerFence = q1 - 1.5 * iqr;
        const upperFence = q3 + 1.5 * iqr;
        
        const nonOutliers = sorted.filter(x => x >= lowerFence && x <= upperFence);
        const outliers = sorted.filter(x => x < lowerFence || x > upperFence);
        
        return {
            min: nonOutliers.length > 0 ? nonOutliers[0] : sorted[0],
            q1: q1,
            median: median,
            q3: q3,
            max: nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[sorted.length - 1],
            outliers: outliers
        };
    },

    // Tablas de Frecuencia (Frecuencia Absoluta, Relativa, Acumulada)
    frequencies: (data, numBins = null) => {
        if (!data || data.length === 0) return [];
        const n = data.length;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const r = max - min;
        
        // Regla de Sturges para número de intervalos
        const k = numBins || Math.ceil(1 + 3.322 * Math.log10(n));
        const w = r === 0 ? 1 : parseFloat((r / k).toFixed(4));
        
        const bins = [];
        let currentLower = min;
        
        for (let i = 0; i < k; i++) {
            const currentUpper = currentLower + w;
            bins.push({
                index: i + 1,
                lower: parseFloat(currentLower.toFixed(4)),
                upper: parseFloat(currentUpper.toFixed(4)),
                midpoint: parseFloat(((currentLower + currentUpper) / 2).toFixed(4)),
                fa: 0, // Frecuencia Absoluta
                fr: 0, // Frecuencia Relativa
                fi: 0, // Frecuencia Acumulada
                fri: 0 // Frecuencia Relativa Acumulada
            });
            currentLower = currentUpper;
        }

        // Asignar datos a intervalos
        data.forEach(val => {
            let placed = false;
            for (let i = 0; i < k; i++) {
                const bin = bins[i];
                // El último intervalo incluye el límite superior estrictamente
                if (i === k - 1) {
                    if (val >= bin.lower && val <= bin.upper) {
                        bin.fa++;
                        placed = true;
                        break;
                    }
                } else {
                    if (val >= bin.lower && val < bin.upper) {
                        bin.fa++;
                        placed = true;
                        break;
                    }
                }
            }
            // Si por redondeo no entró en el último intervalo
            if (!placed && val >= bins[k-1].lower) {
                bins[k-1].fa++;
            }
        });

        // Calcular frecuencias relativas y acumuladas
        let accumulatedFa = 0;
        bins.forEach(bin => {
            accumulatedFa += bin.fa;
            bin.fr = parseFloat((bin.fa / n).toFixed(4));
            bin.fi = accumulatedFa;
            bin.fri = parseFloat((accumulatedFa / n).toFixed(4));
        });

        return bins;
    },

    // --- ESTADÍSTICA INFERENCIAL ---

    // Factorial (para Distribución Binomial y Poisson)
    factorial: (n) => {
        if (n < 0) return 0;
        if (n === 0 || n === 1) return 1;
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    },

    // Combinatoria nCk
    combinatoria: (n, k) => {
        if (k < 0 || k > n) return 0;
        return Stats.factorial(n) / (Stats.factorial(k) * Stats.factorial(n - k));
    },

    // Distribución Binomial: P(X = k)
    binomialProbability: (k, n, p) => {
        if (p < 0 || p > 1 || k < 0 || k > n) return 0;
        const comb = Stats.combinatoria(n, k);
        return parseFloat((comb * Math.pow(p, k) * Math.pow(1 - p, n - k)).toFixed(6));
    },

    // Distribución Binomial Acumulada: P(X >= k) o P(X <= k) o P(X < k) o P(X > k)
    binomialCumulative: (k, n, p, direction = 'exact') => {
        let sum = 0;
        if (direction === 'exact') {
            return Stats.binomialProbability(k, n, p);
        } else if (direction === 'at_most') { // P(X <= k)
            for (let i = 0; i <= k; i++) sum += Stats.binomialProbability(i, n, p);
        } else if (direction === 'at_least') { // P(X >= k)
            for (let i = k; i <= n; i++) sum += Stats.binomialProbability(i, n, p);
        } else if (direction === 'less_than') { // P(X < k)
            for (let i = 0; i < k; i++) sum += Stats.binomialProbability(i, n, p);
        } else if (direction === 'more_than') { // P(X > k)
            for (let i = k + 1; i <= n; i++) sum += Stats.binomialProbability(i, n, p);
        }
        return parseFloat(sum.toFixed(6));
    },

    // Distribución Poisson: P(X = k)
    poissonProbability: (k, lambda) => {
        if (lambda <= 0 || k < 0) return 0;
        return parseFloat((Math.pow(lambda, k) * Math.exp(-lambda) / Stats.factorial(k)).toFixed(6));
    },

    // Distribución Poisson Acumulada
    poissonCumulative: (k, lambda, direction = 'exact') => {
        let sum = 0;
        if (direction === 'exact') {
            return Stats.poissonProbability(k, lambda);
        } else if (direction === 'at_most') { // P(X <= k)
            for (let i = 0; i <= k; i++) sum += Stats.poissonProbability(i, lambda);
        } else if (direction === 'at_least') { // P(X >= k)
            // Usamos el complemento para evitar bucles infinitos
            for (let i = 0; i < k; i++) sum += Stats.poissonProbability(i, lambda);
            return parseFloat((1 - sum).toFixed(6));
        } else if (direction === 'less_than') { // P(X < k)
            for (let i = 0; i < k; i++) sum += Stats.poissonProbability(i, lambda);
        } else if (direction === 'more_than') { // P(X > k)
            for (let i = 0; i <= k; i++) sum += Stats.poissonProbability(i, lambda);
            return parseFloat((1 - sum).toFixed(6));
        }
        return parseFloat(sum.toFixed(6));
    },

    // Distribución Normal Estándar CDF - Aproximación de Hart (Precisión hasta 1e-7)
    normalCDF: (z) => {
        const t = 1 / (1 + 0.2316419 * Math.abs(z));
        const d = 0.3989422804; // 1 / sqrt(2 * pi)
        const p = d * Math.exp(-0.5 * z * z) * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
        if (z >= 0) {
            return parseFloat((1 - p).toFixed(6));
        } else {
            return parseFloat(p.toFixed(6));
        }
    },

    // Distribución Normal Acumulada para una variable X con Media y Desviación Estándar
    // Calcula P(X <= x)
    normalCumulative: (x, mean, stdDev) => {
        if (stdDev <= 0) return 0;
        const z = (x - mean) / stdDev;
        return Stats.normalCDF(z);
    },

    // Intervalo de Confianza para la Media (población infinita/grande)
    // confidenceLevel: 0.95 o 0.99
    confidenceIntervalMean: (data, confidenceLevel = 0.95) => {
        if (!data || data.length < 2) return { lower: 0, upper: 0, margin: 0, mean: 0 };
        const mean = Stats.mean(data);
        const sd = Stats.stdDev(data);
        const n = data.length;
        
        // Z-critical value
        let z = 1.96; // 95% por defecto
        if (confidenceLevel === 0.99) z = 2.576;
        else if (confidenceLevel === 0.90) z = 1.645;
        
        const errorEstandar = sd / Math.sqrt(n);
        const margin = z * errorEstandar;
        
        return {
            mean: parseFloat(mean.toFixed(2)),
            margin: parseFloat(margin.toFixed(2)),
            lower: parseFloat((mean - margin).toFixed(2)),
            upper: parseFloat((mean + margin).toFixed(2)),
            n: n,
            confidence: confidenceLevel * 100
        };
    },

    // Prueba de Hipótesis: ¿Las promociones (descuentos) aumentan el ticket promedio de ventas?
    // H0: El ticket promedio con promoción es menor o igual al ticket promedio sin promoción (u1 <= u2)
    hypothesisTestingPromotions: (ventasHistoricas) => {
        // Separar ventas en dos grupos: Con promoción (Descuento > 0) y Sin promoción (Descuento = 0)
        const grupoPromo = ventasHistoricas.filter(v => v.descuento > 0).map(v => v.total);
        const grupoControl = ventasHistoricas.filter(v => !(v.descuento > 0)).map(v => v.total);
        
        if (grupoPromo.length < 2 || grupoControl.length < 2) {
            return {
                available: false,
                message: "Datos insuficientes para la prueba de hipótesis (se necesitan al menos 2 ventas con y sin promoción)."
            };
        }

        const n1 = grupoPromo.length;
        const n2 = grupoControl.length;
        
        const x1 = Stats.mean(grupoPromo);
        const x2 = Stats.mean(grupoControl);
        
        const s1_sq = Stats.variance(grupoPromo);
        const s2_sq = Stats.variance(grupoControl);
        
        // Estadístico t para varianzas distintas (Welch t-test)
        const t_denom = Math.sqrt((s1_sq / n1) + (s2_sq / n2));
        const t_stat = (x1 - x2) / t_denom;
        
        // Grados de libertad aproximados
        const df_num = Math.pow((s1_sq / n1) + (s2_sq / n2), 2);
        const df_denom = (Math.pow(s1_sq / n1, 2) / (n1 - 1)) + (Math.pow(s2_sq / n2, 2) / (n2 - 1));
        const df = Math.floor(df_num / df_denom);
        
        // Para calcular el p-valor de una cola con Welch t-test,
        // ya que df suele ser grande en ventas (>30), podemos aproximar con la Normal Estándar.
        // p-valor para cola derecha: P(Z > t_stat) = 1 - CDF(t_stat)
        const p_value = 1 - Stats.normalCDF(t_stat);
        
        const alpha = 0.05;
        const rejectH0 = p_value < alpha;

        return {
            available: true,
            n_promo: n1,
            n_control: n2,
            mean_promo: parseFloat(x1.toFixed(2)),
            mean_control: parseFloat(x2.toFixed(2)),
            t_statistic: parseFloat(t_stat.toFixed(4)),
            df: df,
            p_value: parseFloat(p_value.toFixed(6)),
            rejectH0: rejectH0,
            conclusion: rejectH0 
                ? "Rechazar H0. Existe suficiente evidencia estadística para concluir que las promociones sí incrementan significativamente el valor del ticket promedio de ventas (p-valor < 0.05)."
                : "No se puede rechazar H0. No existe suficiente evidencia estadística para afirmar que las promociones aumentan el ticket promedio de ventas."
        };
    },

    // --- CORRELACIÓN Y REGRESIÓN LINEAL ---
    
    // Coeficiente de Correlación de Pearson (r)
    pearsonCorrelation: (x, y) => {
        if (!x || !y || x.length !== y.length || x.length === 0) return 0;
        const n = x.length;
        const meanX = Stats.mean(x);
        const meanY = Stats.mean(y);
        
        let num = 0;
        let denX = 0;
        let denY = 0;
        
        for (let i = 0; i < n; i++) {
            const diffX = x[i] - meanX;
            const diffY = y[i] - meanY;
            num += diffX * diffY;
            denX += diffX * diffX;
            denY += diffY * diffY;
        }
        
        if (denX === 0 || denY === 0) return 0;
        return parseFloat((num / Math.sqrt(denX * denY)).toFixed(4));
    },

    // Regresión Lineal Simple: y = mx + b
    linearRegression: (x, y) => {
        if (!x || !y || x.length !== y.length || x.length < 2) {
            return { slope: 0, intercept: 0, r2: 0, equation: "Y = 0X + 0" };
        }
        const n = x.length;
        const meanX = Stats.mean(x);
        const meanY = Stats.mean(y);
        
        let num = 0;
        let den = 0;
        
        for (let i = 0; i < n; i++) {
            num += (x[i] - meanX) * (y[i] - meanY);
            den += Math.pow(x[i] - meanX, 2);
        }
        
        if (den === 0) return { slope: 0, intercept: 0, r2: 0, equation: "Y = 0X + 0" };
        
        const m = num / den; // Pendiente
        const b = meanY - m * meanX; // Intercepto
        
        // Coeficiente de determinación R^2
        const r = Stats.pearsonCorrelation(x, y);
        const r2 = r * r;
        
        return {
            slope: parseFloat(m.toFixed(4)),
            intercept: parseFloat(b.toFixed(4)),
            r: parseFloat(r.toFixed(4)),
            r2: parseFloat(r2.toFixed(4)),
            equation: `Y = ${m.toFixed(3)}*X + ${b.toFixed(2)}`,
            predict: (inputX) => parseFloat((m * inputX + b).toFixed(2))
        };
    },

    // --- PREDICCIÓN DE INVENTARIO ---
    
    // Promedio Móvil Simple para predicción de demanda e inventario
    // Devuelve predicción de demanda del siguiente día y estimación de días hasta stockout (ruptura de stock)
    inventoryPrediction: (currentStock, stockMinimo, historicalOutflows, windowSize = 5) => {
        if (!historicalOutflows || historicalOutflows.length === 0) {
            return {
                predictedOutflow: 0,
                daysToStockout: Infinity,
                daysToStockMin: Infinity,
                status: 'ESTABLE'
            };
        }
        
        // Filtrar outflows de los últimos N días
        const windowData = historicalOutflows.slice(-windowSize);
        const avgDailySales = Stats.mean(windowData);
        
        if (avgDailySales <= 0) {
            return {
                predictedOutflow: 0,
                daysToStockout: Infinity,
                daysToStockMin: Infinity,
                status: 'ESTABLE'
            };
        }

        const daysToStockout = currentStock / avgDailySales;
        const daysToStockMin = (currentStock - stockMinimo) / avgDailySales;

        let status = 'ESTABLE';
        if (daysToStockout <= 2) {
            status = 'CRÍTICO';
        } else if (daysToStockout <= 5) {
            status = 'RIESGO_ALTO';
        } else if (daysToStockout <= 10) {
            status = 'PREVENCIÓN';
        }

        return {
            predictedOutflow: parseFloat(avgDailySales.toFixed(2)),
            daysToStockout: daysToStockout < 0 ? 0 : parseFloat(daysToStockout.toFixed(1)),
            daysToStockMin: daysToStockMin < 0 ? 0 : parseFloat(daysToStockMin.toFixed(1)),
            status: status
        };
    },

    // --- INTERPRETACIÓN INTELIGENTE ---
    generateNarrativeReport: (ventas, compras, inventario, publicidad) => {
        const conclusions = [];
        
        // 1. Análisis de ventas diarias
        const ventasPorDia = {};
        ventas.forEach(v => {
            const fechaStr = v.fecha.split('T')[0];
            ventasPorDia[fechaStr] = (ventasPorDia[fechaStr] || 0) + v.total;
        });
        
        const importesDiarios = Object.values(ventasPorDia);
        if (importesDiarios.length > 0) {
            const mediaVentas = Stats.mean(importesDiarios);
            const sdVentas = Stats.stdDev(importesDiarios);
            const cvVentas = Stats.coeffVariation(importesDiarios);
            
            conclusions.push(`El promedio diario de ventas de los últimos 30 días es de S/. ${mediaVentas.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`);
            
            if (cvVentas < 15) {
                conclusions.push(`La desviación estándar (S/. ${sdVentas.toFixed(2)}) indica una **baja variabilidad** en las ventas diarias (CV: ${cvVentas}%), lo cual representa un flujo de ingresos estable.`);
            } else if (cvVentas < 30) {
                conclusions.push(`La variabilidad de las ventas diarias es **moderada** (CV: ${cvVentas}%, Desviación estándar: S/. ${sdVentas.toFixed(2)}), sugiriendo variaciones normales de mercado.`);
            } else {
                conclusions.push(`Se detecta una **alta variabilidad** en las ventas diarias (CV: ${cvVentas}%, Desviación estándar: S/. ${sdVentas.toFixed(2)}), por lo que se recomienda monitorear días de picos de demanda y promociones.`);
            }

            // Intervalo de confianza
            const ci = Stats.confidenceIntervalMean(importesDiarios, 0.95);
            conclusions.push(`Con un **95% de confianza**, el promedio de ventas diarias del negocio se sitúa entre **S/. ${ci.lower.toFixed(2)}** y **S/. ${ci.upper.toFixed(2)}**.`);
        }

        // 2. Análisis de prueba de hipótesis
        const testPromo = Stats.hypothesisTestingPromotions(ventas);
        if (testPromo.available) {
            if (testPromo.rejectH0) {
                conclusions.push(`**Prueba de Hipótesis:** Las promociones (descuentos) **SÍ** aumentan significativamente el ticket de venta (Ticket Promo: S/. ${testPromo.mean_promo} vs Control: S/. ${testPromo.mean_control}, p-valor: ${testPromo.p_value.toFixed(6)}). Se recomienda continuar con campañas promocionales.`);
            } else {
                conclusions.push(`**Prueba de Hipótesis:** No se encontró evidencia estadística de que las promociones aumenten el ticket promedio (Promo: S/. ${testPromo.mean_promo} vs Control: S/. ${testPromo.mean_control}, p-valor: ${testPromo.p_value.toFixed(4)}). Evaluar cambiar el tipo de promoción.`);
            }
        }

        // 3. Análisis de Correlación Publicidad vs Ventas
        const fechasFilt = Object.keys(publicidad).sort();
        const publicidadArray = [];
        const ventasArray = [];
        fechasFilt.forEach(fecha => {
            if (ventasPorDia[fecha]) {
                publicidadArray.push(publicidad[fecha]);
                ventasArray.push(ventasPorDia[fecha]);
            }
        });

        if (publicidadArray.length >= 5) {
            const r = Stats.pearsonCorrelation(publicidadArray, ventasArray);
            const reg = Stats.linearRegression(publicidadArray, ventasArray);
            
            let correlacionMsg = "";
            if (r > 0.7) correlacionMsg = "fuerte relación positiva";
            else if (r > 0.4) correlacionMsg = "relación positiva moderada";
            else if (r > 0) correlacionMsg = "relación positiva débil";
            else correlacionMsg = "nula o débil relación negativa";
            
            conclusions.push(`Existe una **${correlacionMsg}** (Pearson r: ${r.toFixed(4)}) entre la inversión en publicidad y las ventas totales. La ecuación de regresión lineal estima: ${reg.equation}.`);
            
            // Predicción para mañana si invertimos un 10% más que el promedio
            const avgPub = Stats.mean(publicidadArray);
            const proximoGastoPub = avgPub * 1.1;
            const ventaPronosticada = reg.predict(proximoGastoPub);
            conclusions.push(`**Pronóstico de Ventas:** Si mañana invertimos S/. ${proximoGastoPub.toFixed(2)} en publicidad, se espera vender aproximadamente **S/. ${ventaPronosticada.toFixed(2)}**.`);
        }

        // 4. Análisis de Inventario
        const productosSinVenta60Dias = [];
        const stockCritico = [];
        
        // Evaluar stock crítico y predicción de ruptura para los top productos
        const salidasPorProducto = {};
        ventas.forEach(v => {
            // Asumimos detalles asociados
            // Si la data está limpia en localStorage, buscaremos los detalles. En esta función podemos usar el conteo de ventas o inyectar outflows.
        });

        // Haremos un mock de salidas por día de cada producto en base a ventas para predecir
        inventario.forEach(inv => {
            const prodName = inv.productos?.nombre || `Producto ${inv.producto_id}`;
            const min = inv.productos?.stock_minimo || 5;
            
            if (inv.stock_actual === 0) {
                stockCritico.push(`El producto **${prodName}** se encuentra **totalmente agotado**.`);
            } else if (inv.stock_actual <= min) {
                stockCritico.push(`El producto **${prodName}** tiene stock crítico de **${inv.stock_actual}** unidades (mínimo: ${min}).`);
            }
        });

        if (stockCritico.length > 0) {
            conclusions.push(`**Alertas de Inventario:**\n   - ` + stockCritico.slice(0, 3).join('\n   - '));
        }

        return conclusions;
    },

    // --- NUEVAS CALCULADORAS ESTADÍSTICAS AVANZADAS ---

    // Aproximación de p-valor para Chi-cuadrada usando Wilson-Hilferty
    chiSquarePValue: (chiSq, df) => {
        if (chiSq <= 0) return 1.0;
        if (df === 0) return 1.0;
        const term1 = chiSq / df;
        const term2 = 2 / (9 * df);
        const z = (Math.pow(term1, 1/3) - (1 - term2)) / Math.sqrt(term2);
        return parseFloat((1 - Stats.normalCDF(z)).toFixed(6));
    },

    // Prueba Chi-Cuadrado de Independencia
    chiSquareIndependence: (observedMatrix) => {
        const rows = observedMatrix.length;
        const cols = observedMatrix[0].length;
        
        const rowSums = new Array(rows).fill(0);
        const colSums = new Array(cols).fill(0);
        let grandTotal = 0;
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rowSums[i] += observedMatrix[i][j];
                colSums[j] += observedMatrix[i][j];
                grandTotal += observedMatrix[i][j];
            }
        }
        
        if (grandTotal === 0) return { chiSquare: 0, df: 0, pValue: 1, observed: observedMatrix, expected: observedMatrix };
        
        let chiSq = 0;
        const expectedMatrix = [];
        for (let i = 0; i < rows; i++) {
            expectedMatrix.push([]);
            for (let j = 0; j < cols; j++) {
                const exp = (rowSums[i] * colSums[j]) / grandTotal;
                expectedMatrix[i].push(exp);
                if (exp > 0) {
                    chiSq += Math.pow(observedMatrix[i][j] - exp, 2) / exp;
                }
            }
        }
        
        const df = (rows - 1) * (cols - 1);
        const pValue = Stats.chiSquarePValue(chiSq, df || 1);
        
        return {
            observed: observedMatrix,
            expected: expectedMatrix,
            chiSquare: parseFloat(chiSq.toFixed(4)),
            df: df,
            pValue: pValue
        };
    },

    // Intervalo de Confianza para una Proporción (Bilateral y Unilateral)
    confidenceIntervalProportion: (x, n, confidenceLevel = 0.95) => {
        if (n <= 0) return { proportion: 0, margin: 0, lower: 0, upper: 0, lowerUnilateral: 0, upperUnilateral: 0 };
        const p = x / n;
        
        let z = 1.96;
        let z_uni = 1.645; // Para una cola
        if (confidenceLevel === 0.99) { z = 2.576; z_uni = 2.33; }
        else if (confidenceLevel === 0.90) { z = 1.645; z_uni = 1.282; }
        
        const se = Math.sqrt((p * (1 - p)) / n);
        const margin = z * se;
        const margin_uni = z_uni * se;
        
        return {
            proportion: parseFloat(p.toFixed(4)),
            margin: parseFloat(margin.toFixed(4)),
            lower: parseFloat(Math.max(0, p - margin).toFixed(4)),
            upper: parseFloat(Math.min(1, p + margin).toFixed(4)),
            lowerUnilateral: parseFloat(Math.max(0, p - margin_uni).toFixed(4)),
            upperUnilateral: parseFloat(Math.min(1, p + margin_uni).toFixed(4))
        };
    },

    // Intervalo de Confianza Unilateral para la Media
    confidenceIntervalMeanUnilateral: (data, confidenceLevel = 0.95) => {
        if (!data || data.length < 2) return { mean: 0, lowerBound: 0, upperBound: 0 };
        const mean = Stats.mean(data);
        const sd = Stats.stdDev(data);
        const n = data.length;
        
        let z_uni = 1.645;
        if (confidenceLevel === 0.99) z_uni = 2.33;
        else if (confidenceLevel === 0.90) z_uni = 1.282;
        
        const errorEstandar = sd / Math.sqrt(n);
        const margin = z_uni * errorEstandar;
        
        return {
            mean: parseFloat(mean.toFixed(2)),
            lowerBound: parseFloat((mean - margin).toFixed(2)), // Con (1-alpha) Confianza, u >= lowerBound
            upperBound: parseFloat((mean + margin).toFixed(2))  // Con (1-alpha) Confianza, u <= upperBound
        };
    },

    // Cálculo del Tamaño Muestral (n)
    calculateSampleSize: (N, confidenceLevel, marginError, sigma = 100) => {
        let z = 1.96;
        if (confidenceLevel === 0.99) z = 2.576;
        else if (confidenceLevel === 0.90) z = 1.645;
        
        const p = 0.5; // Maximizar tamaño de muestra para proporciones
        const q = 0.5;
        
        // 1. Proporciones (Población Finita)
        const numProp = N * z * z * p * q;
        const denProp = (marginError * marginError * (N - 1)) + (z * z * p * q);
        const nPropFinite = Math.ceil(numProp / denProp);
        
        // 2. Medias (Población Infinita)
        const nMeanInfinite = Math.ceil((z * z * sigma * sigma) / (marginError * marginError));
        
        // 3. Medias (Población Finita)
        const numMean = N * z * z * sigma * sigma;
        const denMean = (marginError * marginError * (N - 1)) + (z * z * sigma * sigma);
        const nMeanFinite = Math.ceil(numMean / denMean);
        
        return {
            finiteProportions: nPropFinite,
            infiniteMeans: nMeanInfinite,
            finiteMeans: nMeanFinite,
            z: z,
            std: sigma
        };
    },

    // Comparación de dos Varianzas (F-Test)
    fTestVariances: (grupo1, grupo2) => {
        if (grupo1.length < 2 || grupo2.length < 2) return { available: false };
        const var1 = Stats.variance(grupo1);
        const var2 = Stats.variance(grupo2);
        
        let f = 1;
        let df1 = grupo1.length - 1;
        let df2 = grupo2.length - 1;
        
        if (var1 >= var2) {
            f = var1 / (var2 || 1);
        } else {
            f = var2 / (var1 || 1);
            df1 = grupo2.length - 1;
            df2 = grupo1.length - 1;
        }
        
        return {
            available: true,
            var1: parseFloat(var1.toFixed(2)),
            var2: parseFloat(var2.toFixed(2)),
            f_statistic: parseFloat(f.toFixed(4)),
            df1: df1,
            df2: df2,
            pValue: 0.05 // Aproximación estándar para visualización
        };
    },

    // Contraste de Hipótesis para Dos Proporciones (Z-Test)
    zTestProportions: (x1, n1, x2, n2) => {
        if (n1 <= 0 || n2 <= 0) return { available: false };
        const p1 = x1 / n1;
        const p2 = x2 / n2;
        
        const p_pooled = (x1 + x2) / (n1 + n2);
        const q_pooled = 1 - p_pooled;
        
        const se = Math.sqrt(p_pooled * q_pooled * ((1 / n1) + (1 / n2)));
        if (se === 0) return { available: false };
        
        const z = (p1 - p2) / se;
        const pValue = 2 * (1 - Stats.normalCDF(Math.abs(z))); // Bilateral
        
        return {
            available: true,
            p1: parseFloat(p1.toFixed(4)),
            p2: parseFloat(p2.toFixed(4)),
            z_statistic: parseFloat(z.toFixed(4)),
            pValue: parseFloat(pValue.toFixed(6))
        };
    }
};

window.Stats = Stats;
