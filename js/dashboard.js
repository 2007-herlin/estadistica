// js/dashboard.js - Lógica de Control del Dashboard de SIGEA

// Instancias de Gráficos en esta página
const DashboardCharts = {
    ventasDiarias: null,
    ventasCategoria: null,
    topProductos: null,
    clientesFrecuentes: null
};

document.addEventListener('DOMContentLoaded', async () => {
    // Esperar un instante para que layout.js inyecte el header e inicialice DB
    setTimeout(async () => {
        try {
            await loadDashboardData();
        } catch (e) {
            console.error("Error al cargar dashboard:", e);
            showToast("Error al cargar datos del dashboard: " + e.message, "danger");
        }
    }, 150);
});

async function loadDashboardData() {
    const ventas = await DB.getVentas();
    const productos = await DB.getProductos();
    const clientes = await DB.getClientes();
    const alertas = await DB.getAlertasStock();
    const inventario = await DB.getInventario();

    // 1. Calcular KPIs
    // Ventas del día (fecha de hoy)
    const hoyStr = new Date().toISOString().split('T')[0];
    const ventasHoy = ventas.filter(v => v.fecha.split('T')[0] === hoyStr && v.estado === 'EMITIDA');
    const totalVentasDia = ventasHoy.reduce((acc, v) => acc + v.total, 0);
    document.getElementById('kpi-ventas-dia').textContent = `S/. ${totalVentasDia.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // Ventas del mes (mes actual)
    const mesActualStr = new Date().toISOString().substring(0, 7);
    const ventasMes = ventas.filter(v => v.fecha.substring(0, 7) === mesActualStr && v.estado === 'EMITIDA');
    const totalVentasMes = ventasMes.reduce((acc, v) => acc + v.total, 0);
    document.getElementById('kpi-ventas-mes').textContent = `S/. ${totalVentasMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // Ingresos Totales (todas las ventas emitidas)
    const totalIngresos = ventas.filter(v => v.estado === 'EMITIDA').reduce((acc, v) => acc + v.total, 0);
    document.getElementById('kpi-ingresos').textContent = `S/. ${totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // Detalles de Ventas locales para utilidades y volumen
    let totalUnidadesVendidas = 0;
    let totalCostoVentas = 0;
    
    const todosDetallesVentas = await getLocalOrMockDetallesVentas();
    todosDetallesVentas.forEach(dv => {
        // Solo contar si pertenece a una venta activa emitida
        const vAsoc = ventas.find(item => item.id === dv.venta_id);
        if (vAsoc && vAsoc.estado === 'EMITIDA') {
            totalUnidadesVendidas += dv.cantidad;
            const prod = productos.find(p => p.id === dv.producto_id);
            if (prod) {
                totalCostoVentas += dv.cantidad * prod.precio_compra;
            }
        }
    });

    const totalUtilidad = totalIngresos - totalCostoVentas;
    document.getElementById('kpi-utilidad').textContent = `S/. ${totalUtilidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-unidades-vendidas').textContent = `${totalUnidadesVendidas} unids`;

    // Clientes y Productos
    document.getElementById('kpi-clientes').textContent = clientes.length;
    document.getElementById('kpi-productos').textContent = productos.length;

    // Stock Crítico
    const stockCriticoCount = inventario.filter(inv => inv.stock_actual <= (inv.productos?.stock_minimo || 5)).length;
    document.getElementById('kpi-stock-critico').textContent = stockCriticoCount;

    // Ticket promedio
    const numVentasEmitidas = ventas.filter(v => v.estado === 'EMITIDA').length;
    const ticketPromedio = numVentasEmitidas > 0 ? totalIngresos / numVentasEmitidas : 0;
    document.getElementById('kpi-ticket-promedio').textContent = `S/. ${ticketPromedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // 2. Renderizar Alertas e Inteligencia
    await renderDashboardAlerts(alertas, inventario, productos, ventas, todosDetallesVentas);

    // 3. Renderizar Gráficos
    renderDashboardCharts(ventas, productos, todosDetallesVentas);

    // 4. Renderizar Smart Analytics
    renderSmartAnalytics(ventas, todosDetallesVentas, productos);
}

async function getLocalOrMockDetallesVentas() {
    return await DB.getDetallesVentasTodos();
}

async function renderDashboardAlerts(alertas, inventario, productos, ventas, detalles) {
    const listEl = document.getElementById('dashboard-alerts-list');
    listEl.innerHTML = '';
    
    const alertsToRender = [];

    // Alertas de Stock físico (agotados o bajos)
    alertas.forEach(a => {
        alertsToRender.push({
            type: a.tipo_alerta === 'STOCK_AGOTADO' ? 'danger' : 'warning',
            message: a.mensaje,
            fecha: a.fecha,
            id: a.id,
            actionable: true
        });
    });

    // Inteligencia de Ventas Inestables (Alta desviación estándar en ventas de productos)
    // Agrupar ventas diarias de los productos principales
    const ventasPorProd = {};
    detalles.forEach(dv => {
        const v = ventas.find(item => item.id === dv.venta_id);
        if (v && v.estado === 'EMITIDA') {
            const pId = dv.producto_id;
            const dateStr = v.fecha.split('T')[0];
            if (!ventasPorProd[pId]) ventasPorProd[pId] = {};
            ventasPorProd[pId][dateStr] = (ventasPorProd[pId][dateStr] || 0) + dv.cantidad;
        }
    });

    Object.entries(ventasPorProd).forEach(([pId, datesObj]) => {
        const prod = productos.find(p => p.id === parseInt(pId));
        if (prod) {
            const values = Object.values(datesObj);
            if (values.length >= 5) { // Suficientes días para variabilidad
                const cv = Stats.coeffVariation(values);
                if (cv > 60) { // Mayor al 60% de dispersión es muy inestable
                    alertsToRender.push({
                        type: 'warning',
                        message: `⚠️ <b>Ventas Inestables:</b> El producto <b>${prod.nombre}</b> muestra alta variabilidad en su demanda diaria (Coef. Variación: ${cv.toFixed(1)}%).`,
                        fecha: new Date().toISOString(),
                        actionable: false
                    });
                }
            }
        }
    });

    // Diagnósticos de Baja Rotación (Categorías o productos sin ventas en los últimos 30 días)
    const ventasRecientesProdIds = new Set();
    const limite30Dias = new Date();
    limite30Dias.setDate(limite30Dias.getDate() - 25);
    
    ventas.forEach(v => {
        if (v.estado === 'EMITIDA' && new Date(v.fecha) >= limite30Dias) {
            detalles.forEach(d => {
                if (d.venta_id === v.id) {
                    ventasRecientesProdIds.add(d.producto_id);
                }
            });
        }
    });

    productos.forEach(p => {
        if (!ventasRecientesProdIds.has(p.id)) {
            alertsToRender.push({
                type: 'info',
                message: `🔍 <b>Baja rotación detectada:</b> El producto <b>${p.nombre}</b> (${p.codigo}) no registra ventas en los últimos 25 días. Evalúe una promoción.`,
                fecha: new Date().toISOString(),
                actionable: false
            });
        }
    });

    if (alertsToRender.length === 0) {
        listEl.innerHTML = `
            <div class="alert-item info" style="border-left-color: var(--success); background-color: rgba(46, 125, 50, 0.08);">
                <div class="alert-message">
                    <i class="fa-solid fa-circle-check" style="color: #81C784;"></i>
                    <span>¡Operación estable! No se detectan anomalías ni alertas pendientes en el inventario.</span>
                </div>
            </div>
        `;
        return;
    }

    // Renderizar alertas ordenadas por gravedad
    alertsToRender.sort((a, b) => {
        const order = { danger: 1, warning: 2, info: 3 };
        return order[a.type] - order[b.type];
    });

    alertsToRender.forEach(a => {
        const item = document.createElement('div');
        item.className = `alert-item ${a.type}`;
        
        let icon = 'fa-circle-info';
        if (a.type === 'danger') icon = 'fa-circle-xmark';
        if (a.type === 'warning') icon = 'fa-triangle-exclamation';

        item.innerHTML = `
            <div class="alert-message">
                <i class="fa-solid ${icon}"></i>
                <span>${a.message}</span>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span class="alert-time">${new Date(a.fecha).toLocaleDateString('es-PE')}</span>
                ${a.actionable ? `<button class="alert-resolve-btn" onclick="resolverAlertaDashboard(${a.id})">Descartar</button>` : ''}
            </div>
        `;
        listEl.appendChild(item);
    });
}

async function resolverAlertaDashboard(alertaId) {
    await DB.resolverAlertaStock(alertaId);
    showToast("Alerta descartada.", "warning");
    loadDashboardData();
}
window.resolverAlertaDashboard = resolverAlertaDashboard;

function renderDashboardCharts(ventas, productos, detalles) {
    // 1. Gráfico de Ventas Diarias (Últimos 30 días)
    const ventasPorDia = {};
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30);
    
    for (let i = 0; i <= 30; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        ventasPorDia[d.toISOString().split('T')[0]] = 0;
    }
    
    ventas.forEach(v => {
        const dateStr = v.fecha.split('T')[0];
        if (ventasPorDia[dateStr] !== undefined && v.estado === 'EMITIDA') {
            ventasPorDia[dateStr] += v.total;
        }
    });

    const labelsVentas = Object.keys(ventasPorDia);
    const dataVentas = Object.values(ventasPorDia);

    const ctxVentas = document.getElementById('chart-ventas-diarias').getContext('2d');
    if (DashboardCharts.ventasDiarias) DashboardCharts.ventasDiarias.destroy();
    DashboardCharts.ventasDiarias = new Chart(ctxVentas, {
        type: 'line',
        data: {
            labels: labelsVentas.map(l => l.substring(8, 10) + '/' + l.substring(5, 7)),
            datasets: [{
                label: 'Ventas Diarias (S/.)',
                data: dataVentas,
                borderColor: '#1565C0',
                backgroundColor: 'rgba(21, 101, 192, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
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

    // 2. Gráfico por Categoría
    const categorias = {};
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            const catName = prod.categorias?.nombre || 'General';
            categorias[catName] = (categorias[catName] || 0) + dv.subtotal;
        }
    });

    const catLabels = Object.keys(categorias);
    const catData = Object.values(categorias);

    const ctxCat = document.getElementById('chart-ventas-categoria').getContext('2d');
    if (DashboardCharts.ventasCategoria) DashboardCharts.ventasCategoria.destroy();
    DashboardCharts.ventasCategoria = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: catLabels,
            datasets: [{
                data: catData,
                backgroundColor: ['#1565C0', '#2E7D32', '#EF6C00', '#C62828', '#8E24AA'],
                borderWidth: 1,
                borderColor: '#1E1E1E'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#FFFFFF' } } }
        }
    });

    // 3. Top 5 Productos
    const prodCounts = {};
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            prodCounts[prod.nombre] = (prodCounts[prod.nombre] || 0) + dv.cantidad;
        }
    });

    const sortedProds = Object.entries(prodCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const labelsTopProd = sortedProds.map(e => e[0]);
    const dataTopProd = sortedProds.map(e => e[1]);

    const ctxProd = document.getElementById('chart-top-productos').getContext('2d');
    if (DashboardCharts.topProductos) DashboardCharts.topProductos.destroy();
    DashboardCharts.topProductos = new Chart(ctxProd, {
        type: 'bar',
        data: {
            labels: labelsTopProd.map(l => l.length > 18 ? l.substring(0, 15) + '...' : l),
            datasets: [{
                label: 'Unidades Vendidas',
                data: dataTopProd,
                backgroundColor: 'rgba(46, 125, 50, 0.75)',
                borderColor: '#2E7D32',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } },
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // 4. Clientes Frecuentes
    const clientCounts = {};
    ventas.forEach(v => {
        if (v.estado === 'EMITIDA') {
            const cName = v.clientes?.nombres_razon || 'Anónimo';
            clientCounts[cName] = (clientCounts[cName] || 0) + v.total;
        }
    });

    const sortedClients = Object.entries(clientCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const labelsTopClient = sortedClients.map(e => e[0]);
    const dataTopClient = sortedClients.map(e => e[1]);

    const ctxClient = document.getElementById('chart-clientes-frecuentes').getContext('2d');
    if (DashboardCharts.clientesFrecuentes) DashboardCharts.clientesFrecuentes.destroy();
    DashboardCharts.clientesFrecuentes = new Chart(ctxClient, {
        type: 'bar',
        data: {
            labels: labelsTopClient.map(l => l.length > 15 ? l.substring(0, 12) + '...' : l),
            datasets: [{
                label: 'Monto Comprado (S/.)',
                data: dataTopClient,
                backgroundColor: 'rgba(239, 108, 0, 0.75)',
                borderColor: '#EF6C00',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } },
                x: { grid: { color: '#2C2C2C' }, ticks: { color: '#BDBDBD' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderSmartAnalytics(ventas, detalles, productos) {
    // 1. Producto más rentable
    const rentabilidad = {};
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            const margen = prod.precio_venta - prod.precio_compra;
            rentabilidad[prod.nombre] = (rentabilidad[prod.nombre] || 0) + (dv.cantidad * margen);
        }
    });
    
    let topRentable = '-';
    let maxRent = 0;
    Object.entries(rentabilidad).forEach(([name, val]) => {
        if (val > maxRent) {
            maxRent = val;
            topRentable = name;
        }
    });
    document.getElementById('smart-prod-rentable').textContent = topRentable;
    document.getElementById('smart-prod-rentable-val').textContent = `Utilidad generada: S/. ${maxRent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // 2. Producto menos vendido
    const ventasCant = {};
    productos.forEach(p => {
        ventasCant[p.nombre] = 0;
    });
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            ventasCant[prod.nombre] += dv.cantidad;
        }
    });
    let menosVendido = '-';
    let minCant = Infinity;
    Object.entries(ventasCant).forEach(([name, val]) => {
        if (val < minCant) {
            minCant = val;
            menosVendido = name;
        }
    });
    document.getElementById('smart-prod-menos-vendido').textContent = menosVendido;
    document.getElementById('smart-prod-menos-vendido-val').textContent = `${minCant} unidades vendidas`;

    // 3. Cliente VIP
    const clientSpent = {};
    ventas.forEach(v => {
        if (v.estado === 'EMITIDA') {
            const cName = v.clientes?.nombres_razon || 'Anónimo';
            clientSpent[cName] = (clientSpent[cName] || 0) + v.total;
        }
    });
    let vip = '-';
    let maxSpent = 0;
    Object.entries(clientSpent).forEach(([name, val]) => {
        if (val > maxSpent) {
            maxSpent = val;
            vip = name;
        }
    });
    document.getElementById('smart-cliente-vip').textContent = vip;
    document.getElementById('smart-cliente-vip-val').textContent = `Total invertido: S/. ${maxSpent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // 4. Categoría líder
    const catSales = {};
    let totalSales = 0;
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            const catName = prod.categorias?.nombre || 'General';
            catSales[catName] = (catSales[catName] || 0) + dv.subtotal;
            totalSales += dv.subtotal;
        }
    });
    let topCat = '-';
    let maxCatSales = 0;
    Object.entries(catSales).forEach(([name, val]) => {
        if (val > maxCatSales) {
            maxCatSales = val;
            topCat = name;
        }
    });
    const pct = totalSales > 0 ? (maxCatSales / totalSales * 100).toFixed(1) : 0;
    document.getElementById('smart-categoria-lider').textContent = topCat;
    document.getElementById('smart-categoria-lider-val').textContent = `Participación del ${pct}% de ingresos`;
}
