// layout.js - Componente de Layout Compartido (Sidebar, Header y Validación de Auth)

// Capturador Global de Errores para mostrar en pantalla inmediatamente
window.addEventListener('error', (event) => {
    console.error("🚨 Error Global Capturado:", event.error || event.message);
    mostrarBannerErrorGlobal(event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error("🚨 Promesa no manejada rechazada:", event.reason);
    mostrarBannerErrorGlobal(event.reason);
});

function mostrarBannerErrorGlobal(error) {
    let errorBox = document.getElementById('global-error-banner');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'global-error-banner';
        errorBox.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #C62828;
            color: #FFFFFF;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            z-index: 999999;
            max-width: 450px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            border-left: 5px solid #EF6C00;
        `;
        document.body.appendChild(errorBox);
    }
    const stack = error && error.stack ? `<pre style="margin-top:8px; padding:6px; background:#1E1E1E; border-radius:4px; overflow:auto; max-height:150px; font-size:10px; color:#FFB74D; text-align:left;">${error.stack}</pre>` : '';
    const message = error && error.message ? error.message : String(error);
    errorBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:8px; font-size:12px;">
            <span>🚨 ERROR DETECTADO (CONSOLA)</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background:transparent; border:none; color:white; cursor:pointer; font-size:16px; font-weight:bold;">&times;</button>
        </div>
        <div style="font-weight:600; word-break:break-all;">${message}</div>
        ${stack}
    `;
}

// Exponer la función globalmente para usar en catch blocks
window.mostrarBannerErrorGlobal = mostrarBannerErrorGlobal;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Validar autenticación
    const currentUserRaw = localStorage.getItem('sigea_current_user');
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
    
    if (!currentUserRaw) {
        if (!isLoginPage) {
            window.location.href = 'index.html';
            return;
        }
    } else {
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
            return;
        }
    }

    // Si es la página de login, no inyectamos el layout
    if (isLoginPage) return;

    const currentUser = JSON.parse(currentUserRaw);

    // 2. Inyectar Sidebar y Header
    injectSidebar();
    injectHeader(currentUser);
    
    // 3. Registrar eventos comunes (Logout, Config de Indicadores)
    setupCommonEvents();
});

function injectSidebar() {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;

    // Crear elemento sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    
    // Determinar la página activa para marcarla
    const path = window.location.pathname;
    const getActive = (file) => path.includes(file) ? 'active' : '';

    sidebar.innerHTML = `
        <div class="sidebar-logo">
            <i class="fa-solid fa-calculator"></i>
            <span>SIGEA</span>
        </div>
        
        <ul class="sidebar-menu">
            <li class="sidebar-item ${getActive('dashboard.html')}" data-page="dashboard">
                <a href="dashboard.html"><i class="fa-solid fa-chart-line"></i> Dashboard</a>
            </li>
            <li class="sidebar-item ${getActive('ventas.html')}" data-page="ventas">
                <a href="ventas.html"><i class="fa-solid fa-cart-shopping"></i> Ventas</a>
            </li>
            <li class="sidebar-item ${getActive('compras.html')}" data-page="compras">
                <a href="compras.html"><i class="fa-solid fa-bag-shopping"></i> Compras</a>
            </li>
            <li class="sidebar-item ${getActive('productos.html')}" data-page="productos">
                <a href="productos.html"><i class="fa-solid fa-box-open"></i> Productos</a>
            </li>
            <li class="sidebar-item ${getActive('inventario.html')}" data-page="inventario">
                <a href="inventario.html"><i class="fa-solid fa-warehouse"></i> Inventario</a>
            </li>
            <li class="sidebar-item ${getActive('clientes.html')}" data-page="clientes">
                <a href="clientes.html"><i class="fa-solid fa-users"></i> Clientes</a>
            </li>
            <li class="sidebar-item ${getActive('proveedores.html')}" data-page="proveedores">
                <a href="proveedores.html"><i class="fa-solid fa-truck-field"></i> Proveedores</a>
            </li>
            <li class="sidebar-item ${getActive('reportes.html')}" data-page="reportes">
                <a href="reportes.html"><i class="fa-solid fa-file-invoice-dollar"></i> Reportes</a>
            </li>
            <li class="sidebar-item ${getActive('estadistica.html')}" data-page="estadistica">
                <a href="estadistica.html"><i class="fa-solid fa-square-poll-vertical"></i> Estadística</a>
            </li>
            <li class="sidebar-item ${getActive('configuracion.html')}" data-page="configuracion">
                <a href="configuracion.html"><i class="fa-solid fa-sliders"></i> Configuración</a>
            </li>
        </ul>
        
        <div class="sidebar-footer">
            <button class="logout-btn" id="btn-logout">
                <i class="fa-solid fa-power-off"></i> Cerrar sesión
            </button>
        </div>
    `;

    // Insertar como primer hijo de .app-container
    appContainer.insertBefore(sidebar, appContainer.firstChild);
}

function injectHeader(user) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // Obtener título de la página actual en base al archivo
    const path = window.location.pathname;
    let pageTitle = "Dashboard";
    if (path.includes('ventas.html')) pageTitle = "Módulo de Ventas";
    else if (path.includes('compras.html')) pageTitle = "Módulo de Compras (Abastecimiento)";
    else if (path.includes('productos.html')) pageTitle = "Gestión de Productos";
    else if (path.includes('inventario.html')) pageTitle = "Inventario & Kardex";
    else if (path.includes('clientes.html')) pageTitle = "Gestión de Clientes";
    else if (path.includes('proveedores.html')) pageTitle = "Gestión de Proveedores";
    else if (path.includes('reportes.html')) pageTitle = "Reportes y Utilidades";
    else if (path.includes('estadistica.html')) pageTitle = "Motor Estadístico Avanzado";
    else if (path.includes('configuracion.html')) pageTitle = "Configuración del Sistema";

    const header = document.createElement('header');
    header.className = 'main-header';

    const initials = user.nombres.substring(0, 2).toUpperCase();
    const fullName = `${user.nombres} ${user.apellidos}`;

    header.innerHTML = `
        <div class="header-title">
            <h1>${pageTitle}</h1>
        </div>
        <div class="header-meta">
            <div class="db-mode-indicator demo-mode" id="db-indicator">
                <i class="fa-solid fa-circle"></i> <span id="db-indicator-text">Modo Demo (Local)</span>
            </div>
            <div class="user-profile">
                <div class="user-avatar">${initials}</div>
                <div class="user-info">
                    <span class="user-name">${fullName}</span>
                    <span class="user-role">${user.rol}</span>
                </div>
            </div>
        </div>
    `;

    // Insertar al inicio de .main-content
    mainContent.insertBefore(header, mainContent.firstChild);
    
    // Actualizar indicador de Supabase si está activo
    setTimeout(updateCommonIndicator, 100);
}

function updateCommonIndicator() {
    const indicator = document.getElementById('db-indicator');
    const text = document.getElementById('db-indicator-text');
    if (!indicator || !text) return;

    if (window.DB && typeof window.DB.isSupabaseActive === 'function' && window.DB.isSupabaseActive()) {
        indicator.className = 'db-mode-indicator supabase-mode';
        text.textContent = 'Supabase Conectado';
    } else {
        indicator.className = 'db-mode-indicator demo-mode';
        text.textContent = 'Modo Demo (Local)';
    }
}

function setupCommonEvents() {
    // Evento Logout
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('sigea_current_user');
            window.location.href = 'index.html';
        });
    }

    // Agregar contenedor de Notificaciones Toast si no existe
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

// Función global para lanzar Toasts desde cualquier página
function showToast(message, type = 'primary') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
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

window.showToast = showToast;
