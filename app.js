// app.js - Lógica de Control de UI, SPA Router y Gráficos para SIGEA

// Estado Global de la Aplicación
const App = {
    currentUser: null,
    activePage: 'dashboard',
    ventasCart: [],
    comprasCart: [],
    
    // Instancias de Gráficos (para destruir antes de re-dibujar)
    charts: {
        ventasDiarias: null,
        ventasCategoria: null,
        topProductos: null,
        clientesFrecuentes: null,
        statsHistograma: null,
        statsOjiva: null,
        statsBoxplot: null,
        statsDispersion: null
    }
};

// --- FUNCIÓN DE INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar router y eventos generales
    initRouter();
    initEvents();
    
    // Cargar credenciales guardadas si existen
    const cachedUser = localStorage.getItem('sigea_current_user');
    if (cachedUser) {
        App.currentUser = JSON.parse(cachedUser);
        setupUserInterface();
    } else {
        showLoginOverlay(true);
    }
});

// --- MENSAJES TOAST ---
function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'danger') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- AUTHENTICATION ---
function showLoginOverlay(show) {
    const overlay = document.getElementById('login-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

function setupUserInterface() {
    showLoginOverlay(false);
    
    // Actualizar nombre y rol en header
    const initials = App.currentUser.nombres.substring(0,2).toUpperCase();
    document.getElementById('user-avatar-initials').textContent = initials;
    document.getElementById('user-display-name').textContent = `${App.currentUser.nombres} ${App.currentUser.apellidos}`;
    document.getElementById('user-display-role').textContent = App.currentUser.rol;
    
    // Actualizar indicador de base de datos
    updateDatabaseIndicator();
    
    // Cargar datos del dashboard principal
    loadDashboardData();
}

function updateDatabaseIndicator() {
    const indicator = document.getElementById('db-indicator');
    const text = document.getElementById('db-indicator-text');
    
    if (DB.isSupabaseActive()) {
        indicator.className = 'db-mode-indicator supabase-mode';
        text.textContent = 'Supabase Conectado';
    } else {
        indicator.className = 'db-mode-indicator demo-mode';
        text.textContent = 'Modo Demo (Local)';
    }
}

// --- ROUTER & NAVIGATION ---
function initRouter() {
    const menuItems = document.querySelectorAll('.sidebar-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');
            switchPage(targetPage);
            
            // Marcar activo en sidebar
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchPage(pageId) {
    App.activePage = pageId;
    
    // Ocultar todas las páginas
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Mostrar la seleccionada
    const activePageEl = document.getElementById(`page-${pageId}`);
    if (activePageEl) {
        activePageEl.classList.add('active');
    }
    
    // Cambiar título en header
    const titles = {
        dashboard: 'Dashboard Analítico',
        ventas: 'Módulo de Ventas',
        compras: 'Módulo de Compras (Abastecimiento)',
        productos: 'Gestión de Productos',
        inventario: 'Inventario & Kardex',
        clientes: 'Gestión de Clientes',
        proveedores: 'Gestión de Proveedores',
        reportes: 'Reportes y Utilidades',
        estadistica: 'Motor Estadístico Avanzado',
        configuracion: 'Configuración del Sistema'
    };
    document.getElementById('view-title').textContent = titles[pageId] || 'SIGEA';
    
    // Cargar datos específicos del módulo
    loadPageData(pageId);
}

// --- CARGAR DATOS POR PÁGINA ---
async function loadPageData(pageId) {
    try {
        if (pageId === 'dashboard') {
            await loadDashboardData();
        } else if (pageId === 'clientes') {
            await loadClientesTable();
        } else if (pageId === 'productos') {
            await loadProductosTable();
        } else if (pageId === 'proveedores') {
            await loadProveedoresTable();
        } else if (pageId === 'inventario') {
            await loadInventarioTable();
        } else if (pageId === 'ventas') {
            await initVentasModule();
        } else if (pageId === 'compras') {
            await initComprasModule();
        } else if (pageId === 'reportes') {
            await loadReportesModule();
        } else if (pageId === 'estadistica') {
            await initEstadisticaModule();
        } else if (pageId === 'configuracion') {
            await loadConfiguracionModule();
        }
    } catch (e) {
        console.error(`Error al cargar la página ${pageId}:`, e);
        showToast(`Error al sincronizar datos: ${e.message}`, 'danger');
    }
}

// --- EVENTOS GENERALES ---
function initEvents() {
    // Formulario de Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        
        const loginRes = await DB.login(user, pass);
        if (loginRes.success) {
            App.currentUser = loginRes.user;
            localStorage.setItem('sigea_current_user', JSON.stringify(App.currentUser));
            setupUserInterface();
            showToast(`¡Bienvenido al sistema, ${App.currentUser.nombres}!`, 'success');
        } else {
            const errEl = document.getElementById('login-error-msg');
            errEl.textContent = loginRes.message;
            errEl.style.display = 'block';
        }
    });

    // Cerrar sesión
    document.getElementById('btn-logout').addEventListener('click', () => {
        App.currentUser = null;
        localStorage.removeItem('sigea_current_user');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error-msg').style.display = 'none';
        showLoginOverlay(true);
        showToast("Sesión cerrada correctamente.", "warning");
    });
}

// ==========================================
// 1. MODULO: DASHBOARD
// ==========================================
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

    // Productos vendidos (unidades totales)
    // Para simplificar, acumularemos de todos los detalles de venta registrados
    let totalUnidadesVendidas = 0;
    
    // Utilidades totales calculadas = ventas totales - costo de compra
    let totalCostoVentas = 0;
    
    // Obtendremos los detalles de ventas locales de forma transparente
    const todosDetallesVentas = await getLocalOrMockDetallesVentas();
    todosDetallesVentas.forEach(dv => {
        totalUnidadesVendidas += dv.cantidad;
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            totalCostoVentas += dv.cantidad * prod.precio_compra;
        }
    });

    const totalUtilidad = totalIngresos - totalCostoVentas;
    document.getElementById('kpi-utilidad').textContent = `S/. ${totalUtilidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('kpi-unidades-vendidas').textContent = `${totalUnidadesVendidas} unids`;

    // Clientes y Productos
    document.getElementById('kpi-clientes').textContent = clientes.length;
    document.getElementById('kpi-productos').textContent = productos.length;

    // Stock Crítico y Alertas
    const stockCriticoCount = inventario.filter(inv => inv.stock_actual <= (inv.productos?.stock_minimo || 5)).length;
    document.getElementById('kpi-stock-critico').textContent = stockCriticoCount;

    // Ticket promedio
    const numVentasEmitidas = ventas.filter(v => v.estado === 'EMITIDA').length;
    const ticketPromedio = numVentasEmitidas > 0 ? totalIngresos / numVentasEmitidas : 0;
    document.getElementById('kpi-ticket-promedio').textContent = `S/. ${ticketPromedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    // 2. Renderizar Alertas en Dashboard
    renderDashboardAlerts(alertas, inventario, productos);

    // 3. Renderizar Gráficos del Dashboard
    renderDashboardCharts(ventas, productos, clientes);

    // 4. Renderizar Smart Analytics
    renderSmartAnalytics(ventas, todosDetallesVentas, productos, clientes);
}

async function getLocalOrMockDetallesVentas() {
    // Si estamos en Supabase, tendríamos que consultar la tabla, 
    // pero para compatibilidad veloz cargamos de LocalStorage.
    const localDets = localStorage.getItem('sigea_detalle_ventas');
    return localDets ? JSON.parse(localDets) : [];
}

function renderDashboardAlerts(alertas, inventario, productos) {
    const listEl = document.getElementById('dashboard-alerts-list');
    listEl.innerHTML = '';
    
    if (alertas.length === 0) {
        listEl.innerHTML = `
            <div class="alert-item info" style="border-left-color: var(--success); background-color: rgba(46, 125, 50, 0.08);">
                <div class="alert-message">
                    <i class="fa-solid fa-circle-check" style="color: #81C784;"></i>
                    <span>¡Operación estable! No se detectan quiebras de stock ni alertas pendientes.</span>
                </div>
            </div>
        `;
        return;
    }

    alertas.forEach(a => {
        const item = document.createElement('div');
        const isAgotado = a.tipo_alerta === 'STOCK_AGOTADO';
        item.className = `alert-item ${isAgotado ? 'danger' : 'warning'}`;
        
        item.innerHTML = `
            <div class="alert-message">
                <i class="fa-solid ${isAgotado ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
                <span>${a.mensaje}</span>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span class="alert-time">${new Date(a.fecha).toLocaleDateString('es-PE')}</span>
                <button class="alert-resolve-btn" onclick="resolverAlerta(${a.id})">Descartar</button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

async function resolverAlerta(alertaId) {
    await DB.resolverAlertaStock(alertaId);
    showToast("Alerta descartada.", "warning");
    loadDashboardData();
}
window.resolverAlerta = resolverAlerta;

// --- GRÁFICOS DE DASHBOARD ---
function renderDashboardCharts(ventas, productos, clientes) {
    // Destruir gráficos anteriores si existen
    Object.keys(App.charts).forEach(key => {
        if (App.charts[key] && key !== 'statsHistograma' && key !== 'statsOjiva' && key !== 'statsBoxplot' && key !== 'statsDispersion') {
            App.charts[key].destroy();
        }
    });

    // 1. Gráfico de Ventas Diarias (Últimos 30 días)
    const ventasPorDia = {};
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30);
    
    // Llenar con ceros
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
    App.charts.ventasDiarias = new Chart(ctxVentas, {
        type: 'line',
        data: {
            labels: labelsVentas.map(l => l.substring(8, 10) + '/' + l.substring(5, 7)),
            datasets: [{
                label: 'Ventas Diarias (S/.)',
                data: dataVentas,
                borderColor: '#1976D2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
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
    // Para simplificar, acumularemos ventas según productos
    const categorias = {};
    getLocalOrMockDetallesVentas().then(detalles => {
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
        App.charts.ventasCategoria = new Chart(ctxCat, {
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
    });

    // 3. Top 5 Productos más vendidos
    const prodCounts = {};
    getLocalOrMockDetallesVentas().then(detalles => {
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
        App.charts.topProductos = new Chart(ctxProd, {
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
    App.charts.clientesFrecuentes = new Chart(ctxClient, {
        type: 'bar',
        data: {
            labels: labelsTopClient.map(l => l.length > 15 ? l.substring(0, 12) + '...' : l),
            datasets: [{
                label: 'Monto Total Comprado (S/.)',
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

function renderSmartAnalytics(ventas, detalles, productos, clientes) {
    // 1. Producto más rentable (Ventas totales en S/. * Margen de ganancia de ese producto)
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
    document.getElementById('smart-prod-rentable-val').textContent = `Utilidad generada: S/. ${maxRent.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

    // 3. Cliente VIP (Monto máximo gastado)
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

// ==========================================
// 2. MODULO: CLIENTES (CRUD)
// ==========================================
let clientesGlobal = [];
async function loadClientesTable() {
    clientesGlobal = await DB.getClientes();
    const tbody = document.getElementById('clientes-table-body');
    tbody.innerHTML = '';
    
    clientesGlobal.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.tipo_documento}</td>
            <td>${c.numero_documento}</td>
            <td>${c.nombres_razon}</td>
            <td>${c.telefono || '-'}</td>
            <td>${c.correo || '-'}</td>
            <td>${c.direccion || '-'}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-icon" onclick="editarCliente(${c.id})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-danger btn-icon" onclick="eliminarCliente(${c.id})" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                <button class="btn btn-primary btn-icon" onclick="verHistorialCliente(${c.id})" title="Historial compras"><i class="fa-solid fa-clock-rotate-left"></i></button>
            </td>
        `;
        tbody.innerHTML += tr.outerHTML;
    });

    // Búsqueda
    document.getElementById('clientes-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => {
            const text = clientesGlobal[i].nombres_razon.toLowerCase() + ' ' + clientesGlobal[i].numero_documento;
            if (text.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Modales Clientes
const modalClienteOverlay = document.getElementById('modal-cliente');

document.getElementById('btn-cliente-nuevo').addEventListener('click', () => {
    document.getElementById('modal-cliente-title').textContent = 'Registrar Cliente';
    document.getElementById('cliente-id').value = '';
    document.getElementById('form-cliente').reset();
    modalClienteOverlay.classList.add('active');
});

document.getElementById('btn-modal-cliente-close').addEventListener('click', () => modalClienteOverlay.classList.remove('active'));
document.getElementById('btn-modal-cliente-cancelar').addEventListener('click', () => modalClienteOverlay.classList.remove('active'));

document.getElementById('form-cliente').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cliente-id').value;
    const cliente = {
        tipo_documento: document.getElementById('cliente-tipo-doc').value,
        numero_documento: document.getElementById('cliente-num-doc').value,
        nombres_razon: document.getElementById('cliente-nombre').value,
        telefono: document.getElementById('cliente-telefono').value,
        correo: document.getElementById('cliente-correo').value,
        direccion: document.getElementById('cliente-direccion').value
    };
    if (id) cliente.id = parseInt(id);

    try {
        await DB.saveCliente(cliente);
        modalClienteOverlay.classList.remove('active');
        showToast("Cliente guardado correctamente.", "success");
        loadClientesTable();
    } catch (err) {
        showToast("Error: " + err.message, "danger");
    }
});

async function editarCliente(id) {
    const cli = clientesGlobal.find(c => c.id === id);
    if (!cli) return;

    document.getElementById('modal-cliente-title').textContent = 'Editar Cliente';
    document.getElementById('cliente-id').value = cli.id;
    document.getElementById('cliente-tipo-doc').value = cli.tipo_documento;
    document.getElementById('cliente-num-doc').value = cli.numero_documento;
    document.getElementById('cliente-nombre').value = cli.nombres_razon;
    document.getElementById('cliente-telefono').value = cli.telefono || '';
    document.getElementById('cliente-correo').value = cli.correo || '';
    document.getElementById('cliente-direccion').value = cli.direccion || '';
    
    modalClienteOverlay.classList.add('active');
}
window.editarCliente = editarCliente;

async function eliminarCliente(id) {
    if (confirm("¿Está seguro de eliminar este cliente?")) {
        try {
            await DB.deleteCliente(id);
            showToast("Cliente desactivado.", "warning");
            loadClientesTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarCliente = eliminarCliente;

// Modal Historial de Compras de Cliente
const modalHistorialOverlay = document.getElementById('modal-historial-cliente');
document.getElementById('btn-modal-historial-cliente-close').addEventListener('click', () => modalHistorialOverlay.classList.remove('active'));
document.getElementById('btn-modal-historial-cliente-cerrar').addEventListener('click', () => modalHistorialOverlay.classList.remove('active'));

async function verHistorialCliente(id) {
    const cli = clientesGlobal.find(c => c.id === id);
    if (!cli) return;

    document.getElementById('modal-historial-cliente-title').textContent = `Compras de ${cli.nombres_razon}`;
    
    const ventas = await DB.getVentas();
    const comprasCliente = ventas.filter(v => v.cliente_id === id && v.estado === 'EMITIDA');
    
    const tableBody = document.getElementById('modal-historial-cliente-table-body');
    tableBody.innerHTML = '';
    
    // Estadísticas
    const statsList = document.getElementById('modal-historial-cliente-stats');
    statsList.innerHTML = '';

    if (comprasCliente.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">El cliente no tiene compras registradas.</td></tr>';
        statsList.innerHTML = '<li>El cliente no registra consumo histórico todavía.</li>';
    } else {
        const importes = comprasCliente.map(v => v.total);
        const meanSpent = Stats.mean(importes);
        const totalSpent = importes.reduce((acc, v) => acc + v, 0);

        statsList.innerHTML = `
            <li>Total de compras realizadas: <b>${comprasCliente.length}</b> comprobantes.</li>
            <li>Inversión acumulada: <b>S/. ${totalSpent.toLocaleString('es-PE', { minimumFractionDigits:2 })}</b></li>
            <li>Ticket promedio de compra: <b>S/. ${meanSpent.toLocaleString('es-PE', { minimumFractionDigits:2 })}</b></li>
        `;

        const metodosPago = await DB.getMetodosPago();

        comprasCliente.forEach(v => {
            const mPago = metodosPago.find(m => m.id === v.metodo_pago_id)?.nombre || 'S/N';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(v.fecha).toLocaleDateString('es-PE')}</td>
                <td>${v.tipo_comprobante} ${v.serie}-${v.numero}</td>
                <td>S/. ${v.descuento.toFixed(2)}</td>
                <td><b>S/. ${v.total.toFixed(2)}</b></td>
                <td>${mPago}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    modalHistorialOverlay.classList.add('active');
}
window.verHistorialCliente = verHistorialCliente;


// ==========================================
// 3. MODULO: PRODUCTOS (CRUD)
// ==========================================
let productosGlobal = [];
async function loadProductosTable() {
    productosGlobal = await DB.getProductos();
    const tbody = document.getElementById('productos-table-body');
    tbody.innerHTML = '';
    
    productosGlobal.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.codigo}</td>
            <td><b>${p.nombre}</b></td>
            <td>${p.categorias?.nombre || 'General'}</td>
            <td>${p.marcas?.nombre || 'Genérico'}</td>
            <td>S/. ${p.precio_compra.toFixed(2)}</td>
            <td>S/. ${p.precio_venta.toFixed(2)}</td>
            <td>${p.stock_minimo}</td>
            <td><span class="db-mode-indicator" style="padding:2px 8px; font-size:10px;">${p.unidad_medida}</span></td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-icon" onclick="editarProducto(${p.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-danger btn-icon" onclick="eliminarProducto(${p.id})"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Búsqueda
    document.getElementById('productos-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => {
            const text = productosGlobal[i].nombre.toLowerCase() + ' ' + productosGlobal[i].codigo;
            if (text.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Modal Productos
const modalProductoOverlay = document.getElementById('modal-producto');
document.getElementById('btn-modal-producto-close').addEventListener('click', () => modalProductoOverlay.classList.remove('active'));
document.getElementById('btn-modal-producto-cancelar').addEventListener('click', () => modalProductoOverlay.classList.remove('active'));

document.getElementById('btn-producto-nuevo').addEventListener('click', async () => {
    document.getElementById('modal-producto-title').textContent = 'Registrar Producto';
    document.getElementById('producto-id').value = '';
    document.getElementById('form-producto').reset();
    
    // Poblar dropdowns de categoría y marcas
    await popDropdownsProductos();
    modalProductoOverlay.classList.add('active');
});

async function popDropdownsProductos() {
    const cats = await DB.getCategorias();
    const marcas = await DB.getMarcas();
    
    const catSel = document.getElementById('producto-categoria');
    catSel.innerHTML = '';
    cats.forEach(c => {
        catSel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    const marcSel = document.getElementById('producto-marca');
    marcSel.innerHTML = '';
    marcas.forEach(m => {
        marcSel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
    });
}

document.getElementById('form-producto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('producto-id').value;
    const pVenta = parseFloat(document.getElementById('producto-precio-venta').value);
    const pCompra = parseFloat(document.getElementById('producto-precio-compra').value);
    
    if (pVenta < pCompra) {
        showToast("El precio de venta no puede ser menor al precio de compra.", "danger");
        return;
    }

    const prod = {
        codigo: document.getElementById('producto-codigo').value,
        nombre: document.getElementById('producto-nombre').value,
        categoria_id: parseInt(document.getElementById('producto-categoria').value),
        marca_id: parseInt(document.getElementById('producto-marca').value),
        precio_compra: pCompra,
        precio_venta: pVenta,
        stock_minimo: parseInt(document.getElementById('producto-stock-minimo').value),
        unidad_medida: document.getElementById('producto-unidad').value,
        descripcion: document.getElementById('producto-descripcion').value
    };
    if (id) prod.id = parseInt(id);

    try {
        await DB.saveProducto(prod);
        modalProductoOverlay.classList.remove('active');
        showToast("Producto guardado correctamente.", "success");
        loadProductosTable();
    } catch (err) {
        showToast(err.message, "danger");
    }
});

async function editarProducto(id) {
    const prod = productosGlobal.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('modal-producto-title').textContent = 'Editar Producto';
    document.getElementById('producto-id').value = prod.id;
    
    await popDropdownsProductos();

    document.getElementById('producto-codigo').value = prod.codigo;
    document.getElementById('producto-nombre').value = prod.nombre;
    document.getElementById('producto-categoria').value = prod.categoria_id;
    document.getElementById('producto-marca').value = prod.marca_id || 1;
    document.getElementById('producto-precio-compra').value = prod.precio_compra;
    document.getElementById('producto-precio-venta').value = prod.precio_venta;
    document.getElementById('producto-stock-minimo').value = prod.stock_minimo;
    document.getElementById('producto-unidad').value = prod.unidad_medida;
    document.getElementById('producto-descripcion').value = prod.descripcion || '';
    
    modalProductoOverlay.classList.add('active');
}
window.editarProducto = editarProducto;

async function eliminarProducto(id) {
    if (confirm("¿Está seguro de eliminar este producto del catálogo?")) {
        try {
            await DB.deleteProducto(id);
            showToast("Producto eliminado.", "warning");
            loadProductosTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarProducto = eliminarProducto;


// ==========================================
// 4. MODULO: INVENTARIO
// ==========================================
let inventarioGlobal = [];
async function loadInventarioTable() {
    inventarioGlobal = await DB.getInventario();
    const tbody = document.getElementById('inventario-actual-table-body');
    tbody.innerHTML = '';
    
    let stockTotal = 0;
    let bajoMinimoCount = 0;
    let agotadosCount = 0;

    inventarioGlobal.forEach(i => {
        stockTotal += i.stock_actual;
        const min = i.productos?.stock_minimo || 5;
        
        let alertClass = 'success';
        let alertText = 'Óptimo';
        
        if (i.stock_actual === 0) {
            alertClass = 'danger';
            alertText = 'Agotado';
            agotadosCount++;
        } else if (i.stock_actual <= min) {
            alertClass = 'warning';
            alertText = 'Stock Bajo';
            bajoMinimoCount++;
        }

        const dateStr = i.ultima_actualizacion ? new Date(i.ultima_actualizacion).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.productos?.codigo || '-'}</td>
            <td><b>${i.productos?.nombre || 'Desconocido'}</b></td>
            <td>${i.productos?.categorias?.nombre || 'General'}</td>
            <td><b style="font-size:15px; color:${i.stock_actual === 0 ? '#C62828' : '#FFFFFF'}">${i.stock_actual}</b> ${i.productos?.unidad_medida || 'UND'}</td>
            <td>${min}</td>
            <td><span class="db-mode-indicator ${alertClass}-mode" style="padding:2px 8px; font-size:10px;">${alertText}</span></td>
            <td><span style="font-size:11px; color:var(--text-secondary);">${dateStr}</span></td>
            <td class="actions-cell">
                <button class="btn btn-primary" style="padding:6px 12px; font-size:11px;" onclick="ajustarInventario(${i.producto_id})"><i class="fa-solid fa-sliders"></i> Ajustar Stock</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // KPI Cards
    document.getElementById('inv-kpi-stock-total').textContent = `${stockTotal} unids`;
    document.getElementById('inv-kpi-bajo-minimo').textContent = bajoMinimoCount;
    document.getElementById('inv-kpi-agotados').textContent = agotadosCount;

    // Tabs Eventos
    const btnActual = document.getElementById('btn-tab-inventario-actual');
    const btnKardex = document.getElementById('btn-tab-inventario-kardex');
    const panelActual = document.getElementById('panel-inventario-actual');
    const panelKardex = document.getElementById('panel-inventario-kardex');

    btnActual.addEventListener('click', () => {
        btnActual.className = 'btn btn-primary';
        btnKardex.className = 'btn btn-secondary';
        panelActual.style.display = 'block';
        panelKardex.style.display = 'none';
        loadInventarioTable();
    });

    btnKardex.addEventListener('click', () => {
        btnActual.className = 'btn btn-secondary';
        btnKardex.className = 'btn btn-primary';
        panelActual.style.display = 'none';
        panelKardex.style.display = 'block';
        loadKardexTable();
    });
}

async function loadKardexTable() {
    const movs = await DB.getMovimientosInventario();
    const tbody = document.getElementById('inventario-kardex-table-body');
    tbody.innerHTML = '';

    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay movimientos de inventario registrados.</td></tr>';
        return;
    }

    movs.forEach(m => {
        let typeClass = 'success-mode';
        if (m.tipo_movimiento === 'SALIDA') typeClass = 'danger-mode';
        if (m.tipo_movimiento === 'AJUSTE') typeClass = 'demo-mode';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-size:11px;">${new Date(m.fecha).toLocaleString('es-PE')}</span></td>
            <td>${m.productos?.codigo || '-'}</td>
            <td><b>${m.productos?.nombre || 'Desconocido'}</b></td>
            <td><span class="db-mode-indicator ${typeClass}" style="padding:2px 8px; font-size:10px;">${m.tipo_movimiento}</span></td>
            <td><b>${m.cantidad}</b></td>
            <td>${m.stock_anterior}</td>
            <td><b>${m.stock_nuevo}</b></td>
            <td><span style="font-size:12px; color:var(--text-secondary);">${m.motivo} (${m.referencia_tipo || 'AJUSTE'})</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Ajuste de Stock
const modalAjusteOverlay = document.getElementById('modal-inventario-ajuste');
document.getElementById('btn-modal-ajuste-close').addEventListener('click', () => modalAjusteOverlay.classList.remove('active'));
document.getElementById('btn-modal-ajuste-cancelar').addEventListener('click', () => modalAjusteOverlay.classList.remove('active'));

async function ajustarInventario(productoId) {
    const item = inventarioGlobal.find(i => i.producto_id === productoId);
    if (!item) return;

    document.getElementById('ajuste-producto-id').value = productoId;
    document.getElementById('ajuste-producto-nombre').value = item.productos?.nombre || 'Desconocido';
    document.getElementById('ajuste-stock-actual').value = item.stock_actual;
    document.getElementById('ajuste-stock-nuevo').value = item.stock_actual;
    document.getElementById('ajuste-motivo').value = 'Conteo Físico / Inventario Anual';
    
    modalAjusteOverlay.classList.add('active');
}
window.ajustarInventario = ajustarInventario;

document.getElementById('form-inventario-ajuste').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pId = parseInt(document.getElementById('ajuste-producto-id').value);
    const stockNuevo = parseInt(document.getElementById('ajuste-stock-nuevo').value);
    const motivo = document.getElementById('ajuste-motivo').value;
    const userId = App.currentUser?.id || 1;

    try {
        await DB.registrarAjusteInventario(pId, stockNuevo, motivo, userId);
        modalAjusteOverlay.classList.remove('active');
        showToast("Inventario ajustado y registrado en el Kardex.", "success");
        loadInventarioTable();
    } catch (err) {
        showToast(err.message, "danger");
    }
});


// ==========================================
// 5. MODULO: PROVEEDORES (CRUD)
// ==========================================
let proveedoresGlobal = [];
async function loadProveedoresTable() {
    proveedoresGlobal = await DB.getProveedores();
    const tbody = document.getElementById('proveedores-table-body');
    tbody.innerHTML = '';
    
    proveedoresGlobal.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.ruc}</td>
            <td><b>${p.razon_social}</b></td>
            <td>${p.contacto || '-'}</td>
            <td>${p.telefono || '-'}</td>
            <td>${p.correo || '-'}</td>
            <td>${p.direccion || '-'}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-icon" onclick="editarProveedor(${p.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-danger btn-icon" onclick="eliminarProveedor(${p.id})"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Búsqueda
    document.getElementById('proveedores-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => {
            const text = proveedoresGlobal[i].razon_social.toLowerCase() + ' ' + proveedoresGlobal[i].ruc;
            if (text.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

// Modal Proveedores
const modalProveedorOverlay = document.getElementById('modal-proveedor');
document.getElementById('btn-modal-proveedor-close').addEventListener('click', () => modalProveedorOverlay.classList.remove('active'));
document.getElementById('btn-modal-proveedor-cancelar').addEventListener('click', () => modalProveedorOverlay.classList.remove('active'));

document.getElementById('btn-proveedor-nuevo').addEventListener('click', () => {
    document.getElementById('modal-proveedor-title').textContent = 'Registrar Proveedor';
    document.getElementById('proveedor-id').value = '';
    document.getElementById('form-proveedor').reset();
    modalProveedorOverlay.classList.add('active');
});

document.getElementById('form-proveedor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('proveedor-id').value;
    const prov = {
        ruc: document.getElementById('proveedor-ruc').value,
        razon_social: document.getElementById('proveedor-razon').value,
        contacto: document.getElementById('proveedor-contacto').value,
        telefono: document.getElementById('proveedor-telefono').value,
        correo: document.getElementById('proveedor-correo').value,
        direccion: document.getElementById('proveedor-direccion').value
    };
    if (id) prov.id = parseInt(id);

    try {
        await DB.saveProveedor(prov);
        modalProveedorOverlay.classList.remove('active');
        showToast("Proveedor guardado correctamente.", "success");
        loadProveedoresTable();
    } catch (err) {
        showToast(err.message, "danger");
    }
});

async function editarProveedor(id) {
    const p = proveedoresGlobal.find(prov => prov.id === id);
    if (!p) return;

    document.getElementById('modal-proveedor-title').textContent = 'Editar Proveedor';
    document.getElementById('proveedor-id').value = p.id;
    document.getElementById('proveedor-ruc').value = p.ruc;
    document.getElementById('proveedor-razon').value = p.razon_social;
    document.getElementById('proveedor-contacto').value = p.contacto || '';
    document.getElementById('proveedor-telefono').value = p.telefono || '';
    document.getElementById('proveedor-correo').value = p.correo || '';
    document.getElementById('proveedor-direccion').value = p.direccion || '';
    
    modalProveedorOverlay.classList.add('active');
}
window.editarProveedor = editarProveedor;

async function eliminarProveedor(id) {
    if (confirm("¿Está seguro de eliminar este proveedor?")) {
        try {
            await DB.deleteProveedor(id);
            showToast("Proveedor eliminado.", "warning");
            loadProveedoresTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarProveedor = eliminarProveedor;


// ==========================================
// 6. MODULO: REGISTRAR VENTAS (CHECKOUT & CARRITO)
// ==========================================
let ventaProductosList = [];
let ventaClientesList = [];
async function initVentasModule() {
    ventaProductosList = await DB.getProductos();
    ventaClientesList = await DB.getClientes();
    const metodos = await DB.getMetodosPago();
    
    // Llenar select de producto
    const prodSel = document.getElementById('venta-select-producto');
    prodSel.innerHTML = '<option value="">Seleccione un producto...</option>';
    ventaProductosList.forEach(p => {
        prodSel.innerHTML += `<option value="${p.id}">${p.nombre} (S/. ${p.precio_venta.toFixed(2)})</option>`;
    });

    // Llenar select de clientes
    const cliSel = document.getElementById('venta-select-cliente');
    cliSel.innerHTML = '<option value="">Seleccione un cliente...</option>';
    ventaClientesList.forEach(c => {
        cliSel.innerHTML += `<option value="${c.id}">${c.nombres_razon} (${c.tipo_documento}: ${c.numero_documento})</option>`;
    });

    // Llenar select de método pago
    const pagoSel = document.getElementById('venta-metodo-pago');
    pagoSel.innerHTML = '';
    metodos.forEach(m => {
        pagoSel.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
    });

    // Limpiar carrito de ventas
    App.ventasCart = [];
    renderVentasCart();
}

function renderVentasCart() {
    const container = document.getElementById('venta-cart-items-wrapper');
    container.innerHTML = '';

    if (App.ventasCart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">El carrito está vacío. Agregue productos.</div>';
        updateVentaCheckoutTotals();
        return;
    }

    App.ventasCart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <span><b>${item.producto.nombre}</b></span>
            <span>S/. ${item.producto.precio_venta.toFixed(2)}</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidadCartVentas(${index}, this.value)">
            <span style="font-weight:600; color:var(--primary-hover);">S/. ${item.subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-icon" style="width:26px; height:26px; font-size:10px;" onclick="quitarItemCartVentas(${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(row);
    });

    updateVentaCheckoutTotals();
}

function cambiarCantidadCartVentas(index, value) {
    const cant = parseInt(value);
    if (cant <= 0 || isNaN(cant)) return;
    App.ventasCart[index].cantidad = cant;
    App.ventasCart[index].subtotal = cant * App.ventasCart[index].producto.precio_venta;
    renderVentasCart();
}
window.cambiarCantidadCartVentas = cambiarCantidadCartVentas;

function quitarItemCartVentas(index) {
    App.ventasCart.splice(index, 1);
    renderVentasCart();
}
window.quitarItemCartVentas = quitarItemCartVentas;

// Evento Agregar a carrito
document.getElementById('btn-venta-agregar-item').addEventListener('click', () => {
    const pId = parseInt(document.getElementById('venta-select-producto').value);
    const cant = parseInt(document.getElementById('venta-cantidad').value);

    if (!pId || isNaN(cant) || cant <= 0) {
        showToast("Por favor seleccione un producto y cantidad válida.", "warning");
        return;
    }

    const prod = ventaProductosList.find(p => p.id === pId);
    if (!prod) return;

    // Verificar si ya existe en carrito
    const idx = App.ventasCart.findIndex(item => item.producto.id === pId);
    if (idx !== -1) {
        App.ventasCart[idx].cantidad += cant;
        App.ventasCart[idx].subtotal = App.ventasCart[idx].cantidad * prod.precio_venta;
    } else {
        App.ventasCart.push({
            producto: prod,
            cantidad: cant,
            subtotal: cant * prod.precio_venta
        });
    }

    // Resetear campos
    document.getElementById('venta-select-producto').value = '';
    document.getElementById('venta-cantidad').value = '1';

    renderVentasCart();
    showToast(`${prod.nombre} agregado al carrito.`, "success");
});

function updateVentaCheckoutTotals() {
    let subtotalSinIgv = 0;
    let descuentoTotalVal = 0;
    let totalBruto = 0;

    const descPct = parseFloat(document.getElementById('venta-descuento-pct').value) || 0;
    
    App.ventasCart.forEach(item => {
        totalBruto += item.subtotal;
    });

    descuentoTotalVal = (totalBruto * descPct) / 100;
    const totalPagar = totalBruto - descuentoTotalVal;
    
    const igvTasa = 0.18;
    const subtotalCalculado = totalPagar / (1 + igvTasa);
    const igvCalculado = totalPagar - subtotalCalculado;

    document.getElementById('venta-sum-subtotal').textContent = `S/. ${subtotalCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-descuento').textContent = `S/. ${descuentoTotalVal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-igv').textContent = `S/. ${igvCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-total').textContent = `S/. ${totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

document.getElementById('venta-descuento-pct').addEventListener('input', updateVentaCheckoutTotals);

// Checkout Venta
document.getElementById('venta-form-checkout').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (App.ventasCart.length === 0) {
        showToast("El carrito está vacío. Agregue productos antes de cobrar.", "warning");
        return;
    }

    const clienteId = parseInt(document.getElementById('venta-select-cliente').value);
    const tipoComp = document.getElementById('venta-tipo-comprobante').value;
    const metodoPagoId = parseInt(document.getElementById('venta-metodo-pago').value);
    const descPct = parseFloat(document.getElementById('venta-descuento-pct').value) || 0;

    // Totales finales
    let totalBruto = App.ventasCart.reduce((acc, i) => acc + i.subtotal, 0);
    const descVal = parseFloat(((totalBruto * descPct) / 100).toFixed(2));
    const totalNeto = parseFloat((totalBruto - descVal).toFixed(2));
    const subtotalCalc = parseFloat((totalNeto / 1.18).toFixed(2));
    const igvCalc = parseFloat((totalNeto - subtotalCalc).toFixed(2));

    const totalVentasRegistradas = (await DB.getVentas()).length;

    const venta = {
        cliente_id: clienteId,
        usuario_id: App.currentUser?.id || 2, // Empleado
        caja_id: 1, // Caja principal
        metodo_pago_id: metodoPagoId,
        tipo_comprobante: tipoComp,
        serie: 'B001',
        numero: 2000 + totalVentasRegistradas + 1,
        subtotal: subtotalCalc,
        descuento: descVal,
        igv: igvCalc,
        total: totalNeto,
        estado: 'EMITIDA',
        con_promocion: descPct > 0
    };

    const detalles = App.ventasCart.map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_venta,
        descuento: parseFloat(((item.subtotal * descPct) / 100).toFixed(2)),
        subtotal: parseFloat((item.subtotal - ((item.subtotal * descPct) / 100)).toFixed(2))
    }));

    try {
        await DB.saveVenta(venta, detalles);
        
        // Registrar detalles en LocalStorage para analítica rápida
        const currentDetVentas = await getLocalOrMockDetallesVentas();
        detalles.forEach(d => {
            d.id = currentDetVentas.length + 1;
            currentDetVentas.push(d);
        });
        localStorage.setItem('sigea_detalle_ventas', JSON.stringify(currentDetVentas));

        showToast("¡Venta registrada con éxito y comprobante emitido!", "success");
        App.ventasCart = [];
        renderVentasCart();
        document.getElementById('venta-form-checkout').reset();
        document.getElementById('venta-descuento-pct').value = '0';
        
        // Volver a cargar listados dropdowns por si varió existencias
        await initVentasModule();
    } catch (err) {
        showToast("Error al registrar venta: " + err.message, "danger");
    }
});

// Ver Historial de Ventas
const btnHistorialV = document.getElementById('btn-ventas-historial-toggle');
const sectionHistorialV = document.getElementById('section-historial-ventas');
document.getElementById('btn-cerrar-historial-ventas').addEventListener('click', () => {
    sectionHistorialV.style.display = 'none';
});

btnHistorialV.addEventListener('click', async () => {
    sectionHistorialV.style.display = 'block';
    
    const ventas = await DB.getVentas();
    const metodos = await DB.getMetodosPago();
    const tbody = document.getElementById('ventas-historial-table-body');
    tbody.innerHTML = '';

    if (ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay ventas históricas.</td></tr>';
        return;
    }

    ventas.forEach(v => {
        const mPago = metodos.find(m => m.id === v.metodo_pago_id)?.nombre || 'S/N';
        const dateStr = new Date(v.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-size:11px;">${dateStr}</span></td>
            <td><b>${v.tipo_comprobante} ${v.serie}-${v.numero}</b></td>
            <td>${v.clientes?.nombres_razon || 'Anónimo'}</td>
            <td>${mPago}</td>
            <td>S/. ${v.descuento.toFixed(2)}</td>
            <td><b>S/. ${v.total.toFixed(2)}</b></td>
            <td><span style="font-size:11px;">${v.usuarios?.usuario || 'S/N'}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="verDetalleComprobante('VENTA', ${v.id})"><i class="fa-solid fa-eye"></i> Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

async function verDetalleComprobante(tipo, id) {
    const modal = document.getElementById('modal-detalle-transaccion');
    const title = document.getElementById('modal-detalle-transaccion-title');
    const tableBody = document.getElementById('det-trans-items-body');
    
    tableBody.innerHTML = '';
    
    if (tipo === 'VENTA') {
        title.textContent = "Detalles de la Venta";
        const ventas = await DB.getVentas();
        const v = ventas.find(item => item.id === id);
        if (!v) return;

        document.getElementById('det-trans-nro').textContent = `${v.tipo_comprobante} ${v.serie}-${v.numero}`;
        document.getElementById('det-trans-fecha').textContent = new Date(v.fecha).toLocaleString('es-PE');
        document.getElementById('det-trans-entidad').textContent = v.clientes?.nombres_razon || 'Anónimo';
        document.getElementById('det-trans-usuario').textContent = v.usuarios?.usuario || 'Cajero';

        const detalles = await DB.getDetalleVenta(id);
        detalles.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${d.productos?.nombre || 'Desconocido'}</b></td>
                <td style="text-align:right;">S/. ${d.precio_unitario.toFixed(2)}</td>
                <td style="text-align:center;">${d.cantidad}</td>
                <td style="text-align:right;">S/. ${d.descuento.toFixed(2)}</td>
                <td style="text-align:right;"><b>S/. ${d.subtotal.toFixed(2)}</b></td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('det-trans-subtotal').textContent = `S/. ${v.subtotal.toFixed(2)}`;
        document.getElementById('det-trans-descuento').textContent = `S/. ${v.descuento.toFixed(2)}`;
        document.getElementById('det-trans-igv').textContent = `S/. ${v.igv.toFixed(2)}`;
        document.getElementById('det-trans-total').textContent = `S/. ${v.total.toFixed(2)}`;
    } else {
        // COMPRA
        title.textContent = "Detalles del Abastecimiento";
        const compras = await DB.getCompras();
        const c = compras.find(item => item.id === id);
        if (!c) return;

        document.getElementById('det-trans-nro').textContent = c.numero_comprobante;
        document.getElementById('det-trans-fecha').textContent = new Date(c.fecha).toLocaleString('es-PE');
        document.getElementById('det-trans-entidad').textContent = c.proveedores?.razon_social || 'S/N';
        document.getElementById('det-trans-usuario').textContent = c.usuarios?.usuario || 'S/N';

        const detalles = await DB.getDetalleCompra(id);
        detalles.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${d.productos?.nombre || 'Desconocido'}</b></td>
                <td style="text-align:right;">S/. ${d.precio_unitario.toFixed(2)}</td>
                <td style="text-align:center;">${d.cantidad}</td>
                <td style="text-align:right;">S/. 0.00</td>
                <td style="text-align:right;"><b>S/. ${d.subtotal.toFixed(2)}</b></td>
            `;
            tableBody.appendChild(tr);
        });

        document.getElementById('det-trans-subtotal').textContent = `S/. ${c.subtotal.toFixed(2)}`;
        document.getElementById('det-trans-descuento').textContent = `S/. 0.00`;
        document.getElementById('det-trans-igv').textContent = `S/. ${c.igv.toFixed(2)}`;
        document.getElementById('det-trans-total').textContent = `S/. ${c.total.toFixed(2)}`;
    }

    modal.classList.add('active');
}
window.verDetalleComprobante = verDetalleComprobante;
document.getElementById('btn-modal-detalle-transaccion-close').addEventListener('click', () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
});
document.getElementById('btn-modal-detalle-transaccion-cerrar').addEventListener('click', () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
});


// ==========================================
// 7. MODULO: REGISTRAR COMPRAS
// ==========================================
let compraProductosList = [];
let compraProveedoresList = [];
async function initComprasModule() {
    compraProductosList = await DB.getProductos();
    compraProveedoresList = await DB.getProveedores();
    
    // Llenar select de producto
    const prodSel = document.getElementById('compra-select-producto');
    prodSel.innerHTML = '<option value="">Seleccione un producto...</option>';
    compraProductosList.forEach(p => {
        prodSel.innerHTML += `<option value="${p.id}">${p.nombre} (Costo: S/. ${p.precio_compra.toFixed(2)})</option>`;
    });

    // Llenar select de proveedores
    const provSel = document.getElementById('compra-select-proveedor');
    provSel.innerHTML = '<option value="">Seleccione un proveedor...</option>';
    compraProveedoresList.forEach(p => {
        provSel.innerHTML += `<option value="${p.id}">${p.razon_social} (RUC: ${p.ruc})</option>`;
    });

    App.comprasCart = [];
    renderComprasCart();
}

function renderComprasCart() {
    const container = document.getElementById('compra-cart-items-wrapper');
    container.innerHTML = '';

    if (App.comprasCart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">El carrito está vacío. Agregue productos a comprar.</div>';
        updateCompraTotals();
        return;
    }

    App.comprasCart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <span><b>${item.producto.nombre}</b></span>
            <span>S/. ${item.producto.precio_compra.toFixed(2)}</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidadCartCompras(${index}, this.value)">
            <span style="font-weight:600; color:var(--primary-hover);">S/. ${item.subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-icon" style="width:26px; height:26px; font-size:10px;" onclick="quitarItemCartCompras(${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(row);
    });

    updateCompraTotals();
}

function cambiarCantidadCartCompras(index, value) {
    const cant = parseInt(value);
    if (cant <= 0 || isNaN(cant)) return;
    App.comprasCart[index].cantidad = cant;
    App.comprasCart[index].subtotal = cant * App.comprasCart[index].producto.precio_compra;
    renderComprasCart();
}
window.cambiarCantidadCartCompras = cambiarCantidadCartCompras;

function quitarItemCartCompras(index) {
    App.comprasCart.splice(index, 1);
    renderComprasCart();
}
window.quitarItemCartCompras = quitarItemCartCompras;

document.getElementById('btn-compra-agregar-item').addEventListener('click', () => {
    const pId = parseInt(document.getElementById('compra-select-producto').value);
    const cant = parseInt(document.getElementById('compra-cantidad').value);

    if (!pId || isNaN(cant) || cant <= 0) {
        showToast("Por favor seleccione un producto y cantidad válida.", "warning");
        return;
    }

    const prod = compraProductosList.find(p => p.id === pId);
    if (!prod) return;

    const idx = App.comprasCart.findIndex(item => item.producto.id === pId);
    if (idx !== -1) {
        App.comprasCart[idx].cantidad += cant;
        App.comprasCart[idx].subtotal = App.comprasCart[idx].cantidad * prod.precio_compra;
    } else {
        App.comprasCart.push({
            producto: prod,
            cantidad: cant,
            subtotal: cant * prod.precio_compra
        });
    }

    document.getElementById('compra-select-producto').value = '';
    document.getElementById('compra-cantidad').value = '1';

    renderComprasCart();
    showToast(`${prod.nombre} agregado al carrito de abastecimiento.`, "success");
});

function updateCompraTotals() {
    let subtotalNeto = App.comprasCart.reduce((acc, i) => acc + i.subtotal, 0);
    const igvTasa = 0.18;
    const igvCalculado = subtotalNeto * igvTasa;
    const totalPagar = subtotalNeto + igvCalculado;

    document.getElementById('compra-sum-subtotal').textContent = `S/. ${subtotalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('compra-sum-igv').textContent = `S/. ${igvCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('compra-sum-total').textContent = `S/. ${totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

document.getElementById('compra-form-checkout').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (App.comprasCart.length === 0) {
        showToast("El carrito está vacío. Agregue productos antes de registrar.", "warning");
        return;
    }

    const proveedorId = parseInt(document.getElementById('compra-select-proveedor').value);
    const facturaNro = document.getElementById('compra-numero-comprobante').value;

    let subtotalNeto = App.comprasCart.reduce((acc, i) => acc + i.subtotal, 0);
    const igvCalculado = parseFloat((subtotalNeto * 0.18).toFixed(2));
    const totalPagar = parseFloat((subtotalNeto + igvCalculado).toFixed(2));

    const compra = {
        proveedor_id: proveedorId,
        usuario_id: App.currentUser?.id || 1, // Admin
        numero_comprobante: facturaNro,
        subtotal: subtotalNeto,
        igv: igvCalculado,
        total: totalPagar,
        estado: 'REGISTRADA'
    };

    const detalles = App.comprasCart.map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
        precio_unitario: item.producto.precio_compra,
        subtotal: item.subtotal
    }));

    try {
        await DB.saveCompra(compra, detalles);
        showToast("¡Compra registrada! El stock de inventario se ha actualizado.", "success");
        App.comprasCart = [];
        renderComprasCart();
        document.getElementById('compra-form-checkout').reset();
        await initComprasModule();
    } catch (err) {
        showToast("Error al registrar abastecimiento: " + err.message, "danger");
    }
});

// Ver Historial de Compras
const btnHistorialC = document.getElementById('btn-compras-historial-toggle');
const sectionHistorialC = document.getElementById('section-historial-compras');
document.getElementById('btn-cerrar-historial-compras').addEventListener('click', () => {
    sectionHistorialC.style.display = 'none';
});

btnHistorialC.addEventListener('click', async () => {
    sectionHistorialC.style.display = 'block';
    
    const compras = await DB.getCompras();
    const tbody = document.getElementById('compras-historial-table-body');
    tbody.innerHTML = '';

    if (compras.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay compras históricas.</td></tr>';
        return;
    }

    compras.forEach(c => {
        const dateStr = new Date(c.fecha).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="font-size:11px;">${dateStr}</span></td>
            <td><b>${c.numero_comprobante}</b></td>
            <td>${c.proveedores?.razon_social || 'S/N'}</td>
            <td>S/. ${c.subtotal.toFixed(2)}</td>
            <td>S/. ${c.igv.toFixed(2)}</td>
            <td><b>S/. ${c.total.toFixed(2)}</b></td>
            <td><span style="font-size:11px;">${c.usuarios?.usuario || 'S/N'}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="verDetalleComprobante('COMPRA', ${c.id})"><i class="fa-solid fa-eye"></i> Ver</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});


// ==========================================
// 8. MODULO: REPORTES (ESTADÍSTICOS)
// ==========================================
async function loadReportesModule() {
    const ventas = await DB.getVentas();
    const productos = await DB.getProductos();
    const clientes = await DB.getClientes();
    const detalles = await getLocalOrMockDetallesVentas();

    // 1. Resumen Mensual de Ventas
    // Agrupar por mes
    const mesVentas = {};
    ventas.forEach(v => {
        if (v.estado === 'EMITIDA') {
            const mesStr = v.fecha.substring(0, 7); // YYYY-MM
            if (!mesVentas[mesStr]) {
                mesVentas[mesStr] = {
                    total: 0,
                    count: 0,
                    costo: 0
                };
            }
            mesVentas[mesStr].total += v.total;
            mesVentas[mesStr].count++;
        }
    });

    detalles.forEach(d => {
        // Encontrar la fecha de la venta
        const v = ventas.find(item => item.id === d.venta_id);
        if (v && v.estado === 'EMITIDA') {
            const mesStr = v.fecha.substring(0, 7);
            const prod = productos.find(p => p.id === d.producto_id);
            if (prod && mesVentas[mesStr]) {
                mesVentas[mesStr].costo += d.cantidad * prod.precio_compra;
            }
        }
    });

    const tbMensual = document.getElementById('reporte-ventas-mensuales-body');
    tbMensual.innerHTML = '';
    
    const mesesSorted = Object.keys(mesVentas).sort().reverse();
    if (mesesSorted.length === 0) {
        tbMensual.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay historial de ventas.</td></tr>';
    } else {
        mesesSorted.forEach(mes => {
            const row = mesVentas[mes];
            const tProm = row.total / row.count;
            const util = row.total - row.costo;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${mes}</b></td>
                <td>${row.count}</td>
                <td><b>S/. ${row.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></td>
                <td style="color:#81C784;">S/. ${util.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                <td>S/. ${tProm.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            `;
            tbMensual.appendChild(tr);
        });
    }

    // 2. Rendimiento por Categoría
    const catSales = {};
    detalles.forEach(dv => {
        const prod = productos.find(p => p.id === dv.producto_id);
        if (prod) {
            const catName = prod.categorias?.nombre || 'General';
            if (!catSales[catName]) {
                catSales[catName] = { cant: 0, total: 0 };
            }
            catSales[catName].cant += dv.cantidad;
            catSales[catName].total += dv.subtotal;
        }
    });

    const tbCat = document.getElementById('reporte-categoria-ventas-body');
    tbCat.innerHTML = '';
    Object.entries(catSales).forEach(([name, data]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${name}</b></td>
            <td>${data.cant} unids</td>
            <td><b>S/. ${data.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></td>
        `;
        tbCat.appendChild(tr);
    });

    // 3. Clientes VIP
    const clSpent = {};
    ventas.forEach(v => {
        if (v.estado === 'EMITIDA') {
            const cId = v.cliente_id;
            if (!clSpent[cId]) {
                clSpent[cId] = { name: v.clientes?.nombres_razon || 'Anónimo', count: 0, total: 0 };
            }
            clSpent[cId].count++;
            clSpent[cId].total += v.total;
        }
    });

    const tbCli = document.getElementById('reporte-clientes-vip-body');
    tbCli.innerHTML = '';
    const sortedCl = Object.values(clSpent).sort((a,b) => b.total - a.total).slice(0, 5);
    
    if (sortedCl.length === 0) {
        tbCli.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay clientes VIP todavía.</td></tr>';
    } else {
        sortedCl.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${c.name}</b></td>
                <td>${c.count}</td>
                <td><b>S/. ${c.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></td>
            `;
            tbCli.appendChild(tr);
        });
    }
}


// ==========================================
// 9. MOTOR ESTADÍSTICO (EL CORAZÓN)
// ==========================================
async function initEstadisticaModule() {
    // Manejar navegación interna del motor
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

    // Ejecutar cálculos descriptivos por defecto al iniciar
    triggerSubPageCalculations('descriptiva');
}

async function triggerSubPageCalculations(subPage) {
    const ventas = await DB.getVentas();
    const compras = await DB.getCompras();
    const productos = await DB.getProductos();
    const publicidad = await DB.getPublicidadDiaria();

    if (subPage === 'descriptiva') {
        document.getElementById('btn-calcular-descriptiva').onclick = async () => {
            const variable = document.getElementById('stats-select-variable').value;
            let dataset = [];

            if (variable === 'ventas_totales') {
                // Agrupar ventas diarias de últimos 30 días
                const daily = {};
                ventas.forEach(v => {
                    if (v.estado === 'EMITIDA') {
                        const d = v.fecha.split('T')[0];
                        daily[d] = (daily[d] || 0) + v.total;
                    }
                });
                dataset = Object.values(daily);
            } else if (variable === 'ventas_cantidades') {
                // Cantidad de productos comprados por transacción
                const details = await getLocalOrMockDetallesVentas();
                dataset = details.map(d => d.cantidad);
            } else if (variable === 'publicidad') {
                dataset = Object.values(publicidad);
            }

            if (dataset.length === 0) {
                showToast("No hay datos cargados para esta variable.", "warning");
                return;
            }

            // Calcular Estadísticos
            const media = Stats.mean(dataset);
            const mediana = Stats.median(dataset);
            const modaObj = Stats.mode(dataset);
            const sd = Stats.stdDev(dataset);
            const variance = Stats.variance(dataset);
            const cv = Stats.coeffVariation(dataset);
            const range = Stats.range(dataset);
            const quarts = Stats.quartiles(dataset);

            document.getElementById('stats-res-media').textContent = media.toLocaleString('es-PE', { maximumFractionDigits:2 });
            document.getElementById('stats-res-mediana').textContent = mediana.toLocaleString('es-PE', { maximumFractionDigits:2 });
            document.getElementById('stats-res-moda').textContent = modaObj.modes.length > 0 
                ? `${modaObj.modes.join(', ')} (freq: ${modaObj.frequency})` 
                : 'Sin moda repetida';
            document.getElementById('stats-res-desviacion').textContent = sd.toLocaleString('es-PE', { maximumFractionDigits:2 });
            document.getElementById('stats-res-varianza').textContent = variance.toLocaleString('es-PE', { maximumFractionDigits:2 });
            document.getElementById('stats-res-cv').textContent = `${cv.toFixed(2)} %`;
            document.getElementById('stats-res-rango').textContent = range.toLocaleString('es-PE', { maximumFractionDigits:2 });
            document.getElementById('stats-res-cuartiles').textContent = `Q1: ${quarts.Q1.toFixed(1)} | Q2: ${quarts.Q2.toFixed(1)} | Q3: ${quarts.Q3.toFixed(1)}`;

            // Renderizar frecuencias tabuladas
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

            // Dibujar Histogramas, Ojiva y BoxPlot
            renderDescriptivaCharts(freqTable, dataset);
        };

        // Forzar click inicial para cargar
        document.getElementById('btn-calcular-descriptiva').click();

    } else if (subPage === 'probabilidad') {
        // --- Distribución Binomial ---
        const runBinomial = async () => {
            const n = parseInt(document.getElementById('bin-n').value);
            const k = parseInt(document.getElementById('bin-k').value);
            const catId = parseInt(document.getElementById('bin-select-cat').value);
            
            if (isNaN(n) || isNaN(k) || n <= 0 || k < 0 || k > n) {
                showToast("Ingrese valores N y K correctos (K debe ser menor o igual a N).", "warning");
                return;
            }

            const detalles = await getLocalOrMockDetallesVentas();
            // Calcular p real: Ventas de la categoría seleccionada sobre ventas totales
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
                <li>La probabilidad de éxito unitaria hallada históricamente es de <b>p = ${pReal.toFixed(4)}</b> (${(pReal*100).toFixed(2)}%).</li>
                <li>Probabilidad exacta de vender exactamente <b>${k}</b> productos: <b>${(probExacta * 100).toFixed(4)}%</b> (P(X = ${k}) = ${probExacta.toFixed(6)})</li>
                <li>Probabilidad acumulada de vender al menos (como mínimo) <b>${k}</b> productos: <b>${(probAlMenos * 100).toFixed(4)}%</b> (P(X >= ${k}) = ${probAlMenos.toFixed(6)})</li>
                <li>Probabilidad acumulada de vender a lo mucho (como máximo) <b>${k}</b> productos: <b>${(probAlMaximo * 100).toFixed(4)}%</b> (P(X <= ${k}) = ${probAlMaximo.toFixed(6)})</li>
            `;
        };
        
        document.getElementById('btn-calcular-binomial').onclick = runBinomial;
        // Carga binomial al cambiar categoría
        document.getElementById('bin-select-cat').onchange = runBinomial;

        // --- Distribución Poisson ---
        document.getElementById('btn-calcular-poisson').onclick = () => {
            const lambda = parseFloat(document.getElementById('poisson-lambda').value);
            const k = parseInt(document.getElementById('poisson-k').value);
            const dir = document.getElementById('poisson-direction').value;

            if (isNaN(lambda) || isNaN(k) || lambda <= 0 || k < 0) {
                showToast("Ingrese un Lambda > 0 y un éxito K >= 0.", "warning");
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

        // --- Distribución Normal & Intervalos ---
        // Cargar parámetros de negocio de los últimos 30 días
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
                showToast("La desviación estándar debe ser mayor que cero.", "danger");
                return;
            }

            const zScore = (xVal - u) / sd;
            let prob = Stats.normalCumulative(xVal, u, sd);
            if (dir === 'more_than') {
                prob = 1 - prob;
            }

            // Calcular Intervalos de Confianza
            const ci95 = Stats.confidenceIntervalMean(datasetVentas, 0.95);
            const ci99 = Stats.confidenceIntervalMean(datasetVentas, 0.99);

            const resultsText = document.getElementById('normal-results-text');
            resultsText.innerHTML = `
                <li><b>Análisis Z-Score:</b> Para X = S/. ${xVal.toFixed(2)}, el valor estándar de normalización es <b>Z = ${zScore.toFixed(4)}</b>.</li>
                <li>La probabilidad de que las ventas diarias sean ${dir === 'less_than' ? 'menores o iguales a' : 'mayores o iguales a'} S/. ${xVal.toFixed(2)} es de <b>${(prob * 100).toFixed(4)}%</b> (P = ${prob.toFixed(6)}).</li>
                <li><b>Intervalo de Confianza del 95%:</b> Con un nivel de confianza del 95% (Z = 1.96), el promedio de ventas diarias del negocio se encuentra entre <b>S/. ${ci95.lower.toLocaleString('es-PE')}</b> y <b>S/. ${ci95.upper.toLocaleString('es-PE')}</b>.</li>
                <li><b>Intervalo de Confianza del 99%:</b> Con un nivel de confianza del 99% (Z = 2.576), el promedio de ventas diarias se encuentra entre <b>S/. ${ci99.lower.toLocaleString('es-PE')}</b> y <b>S/. ${ci99.upper.toLocaleString('es-PE')}</b>.</li>
            `;
        };

        // --- Contraste de Hipótesis ---
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
        // --- Regresión e Inversión en Publicidad ---
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

        // Renderizar gráfico de dispersión
        renderDispersionChart(pubArray, ventArray, reg);

        // Pronóstico interactivo
        document.getElementById('btn-pronosticar-ventas').onclick = () => {
            const inputPub = parseFloat(document.getElementById('predict-adv-cost').value);
            if (isNaN(inputPub) || inputPub < 0) {
                showToast("Ingrese un monto de publicidad correcto.", "warning");
                return;
            }
            const predicted = reg.predict(inputPub);
            document.getElementById('stats-predicted-sales-val').textContent = `S/. ${predicted.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
        };
        // Ejecutar pronóstico inicial
        document.getElementById('btn-pronosticar-ventas').click();

        // --- Predicción de Stockout (Inventario) ---
        document.getElementById('btn-predecir-stockout').onclick = async () => {
            const pId = parseInt(document.getElementById('predict-select-prod').value);
            const invList = await DB.getInventario();
            const invItem = invList.find(i => i.producto_id === pId);
            if (!invItem) {
                showToast("Producto no encontrado en inventario.", "danger");
                return;
            }

            const detV = await getLocalOrMockDetallesVentas();
            // Agrupar salidas diarias del producto en los últimos 30 días
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
                    // Buscar la fecha de la venta asociada
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
        // Carga predicción inicial
        document.getElementById('btn-predecir-stockout').click();

    } else if (subPage === 'narrativo') {
        const narrativeList = document.getElementById('reporte-narrativo-completo');
        narrativeList.innerHTML = '<li>Generando reporte inteligente...</li>';

        setTimeout(() => {
            const report = Stats.generateNarrativeReport(ventas, compras, inventarioGlobal, publicidad);
            narrativeList.innerHTML = '';
            report.forEach(paragraph => {
                const li = document.createElement('li');
                li.innerHTML = paragraph;
                narrativeList.appendChild(li);
            });
        }, 300);
    }
}

// --- GRÁFICOS DE ESTADÍSTICA DESCRIPTIVA ---
function renderDescriptivaCharts(freqTable, dataset) {
    if (App.charts.statsHistograma) App.charts.statsHistograma.destroy();
    if (App.charts.statsOjiva) App.charts.statsOjiva.destroy();
    if (App.charts.statsBoxplot) App.charts.statsBoxplot.destroy();

    const labels = freqTable.map(r => `[${r.lower.toFixed(0)}-${r.upper.toFixed(0)})`);
    const faData = freqTable.map(r => r.fa);
    const fiData = freqTable.map(r => r.fi);

    // 1. Histograma + Polígono
    const ctxHist = document.getElementById('chart-stats-histograma').getContext('2d');
    App.charts.statsHistograma = new Chart(ctxHist, {
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

    // 2. Ojiva
    const ctxOjiva = document.getElementById('chart-stats-ojiva').getContext('2d');
    App.charts.statsOjiva = new Chart(ctxOjiva, {
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

    // 3. Boxplot (Simulado con barras de error en horizontal)
    const box = Stats.boxplot(dataset);
    const ctxBox = document.getElementById('chart-stats-boxplot').getContext('2d');
    App.charts.statsBoxplot = new Chart(ctxBox, {
        type: 'bar',
        data: {
            labels: ['Variable analizada'],
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

// --- GRÁFICO DE REGRESIÓN (DISPERSIÓN) ---
function renderDispersionChart(x, y, regression) {
    if (App.charts.statsDispersion) App.charts.statsDispersion.destroy();

    const scatterData = x.map((val, idx) => ({ x: val, y: y[idx] }));
    
    // Generar línea de regresión (desde min X hasta max X)
    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const lineData = [
        { x: minX, y: regression.predict(minX) },
        { x: maxX, y: regression.predict(maxX) }
    ];

    const ctx = document.getElementById('chart-stats-dispersion').getContext('2d');
    App.charts.statsDispersion = new Chart(ctx, {
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
                    title: { display: true, text: 'Inversión en Publicidad (S/.)', color: '#FFFFFF' },
                    grid: { color: '#2C2C2C' },
                    ticks: { color: '#BDBDBD' }
                },
                y: { 
                    title: { display: true, text: 'Ingreso Diario de Ventas (S/.)', color: '#FFFFFF' },
                    grid: { color: '#2C2C2C' },
                    ticks: { color: '#BDBDBD' }
                }
            },
            plugins: { legend: { labels: { color: '#FFFFFF' } } }
        }
    });
}


// ==========================================
// 10. CONFIGURACIÓN & BACKEND DUAL
// ==========================================
async function loadConfiguracionModule() {
    const config = DB.getConfig();
    
    // Cargar config actual de base de datos
    document.getElementById('config-use-supabase').checked = config.useSupabase;
    document.getElementById('config-supabase-url').value = config.url || '';
    document.getElementById('config-supabase-key').value = config.key || '';

    // Cargar parámetros de negocio
    const listConf = await DB.getClientes(); // Cargar configs locales
    const igvTasa = parseFloat(localStorage.getItem('sigea_cfg_igv') || '0.18');
    const nameBusiness = localStorage.getItem('sigea_cfg_nombre_empresa') || 'Texteliria ACAREIA ATELIER';
    const currency = localStorage.getItem('sigea_cfg_moneda') || 'PEN';

    document.getElementById('config-empresa').value = nameBusiness;
    document.getElementById('config-igv').value = igvTasa;
    document.getElementById('config-moneda').value = currency;

    // Conectar e interactuar con el formulario Supabase
    document.getElementById('config-form-database').onsubmit = async (e) => {
        e.preventDefault();
        const useSub = document.getElementById('config-use-supabase').checked;
        const subUrl = document.getElementById('config-supabase-url').value;
        const subKey = document.getElementById('config-supabase-key').value;

        const updated = DB.updateConfig({
            useSupabase: useSub,
            url: subUrl,
            key: subKey
        });

        updateDatabaseIndicator();
        
        if (useSub) {
            showToast("Intentando conectar con Supabase...", "warning");
            try {
                // Hacemos una prueba rápida consultando roles
                const roles = await DB.getCategorias();
                showToast("Conexión con Supabase establecida exitosamente.", "success");
            } catch (err) {
                showToast("Fallo al conectar con Supabase: " + err.message, "danger");
                // Forzar fallback
                DB.updateConfig({ useSupabase: false });
                document.getElementById('config-use-supabase').checked = false;
                updateDatabaseIndicator();
            }
        } else {
            showToast("Modo base de datos cambiado a Local Storage.", "info");
        }
    };

    // Parámetros del negocio
    document.getElementById('config-form-negocio').onsubmit = (e) => {
        e.preventDefault();
        const emp = document.getElementById('config-empresa').value;
        const igv = document.getElementById('config-igv').value;
        const mon = document.getElementById('config-moneda').value;

        localStorage.setItem('sigea_cfg_nombre_empresa', emp);
        localStorage.setItem('sigea_cfg_igv', igv);
        localStorage.setItem('sigea_cfg_moneda', mon);

        showToast("Parámetros del negocio actualizados.", "success");
    };

    // Reiniciar LocalStorage
    document.getElementById('btn-config-reset-local').onclick = () => {
        if (confirm("¿Está seguro de reiniciar los datos del sistema? Perderá todas las transacciones locales.")) {
            // Limpiar claves
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sigea_')) {
                    localStorage.removeItem(key);
                }
            });
            showToast("LocalStorage borrado. Recargando sistema...", "danger");
            setTimeout(() => location.reload(), 1500);
        }
    };
}
