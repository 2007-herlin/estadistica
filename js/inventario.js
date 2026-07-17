// js/inventario.js - Control de Inventario de SIGEA

let inventarioGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadInventarioTable();
            setupInventarioEvents();
        } catch (e) {
            console.error("Error al cargar inventario:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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
}

function setupInventarioEvents() {
    const btnActual = document.getElementById('btn-tab-inventario-actual');
    const btnKardex = document.getElementById('btn-tab-inventario-kardex');
    const panelActual = document.getElementById('panel-inventario-actual');
    const panelKardex = document.getElementById('panel-inventario-kardex');

    btnActual.onclick = async () => {
        btnActual.className = 'btn btn-primary';
        btnKardex.className = 'btn btn-secondary';
        panelActual.style.display = 'block';
        panelKardex.style.display = 'none';
        await loadInventarioTable();
    };

    btnKardex.onclick = async () => {
        btnActual.className = 'btn btn-secondary';
        btnKardex.className = 'btn btn-primary';
        panelActual.style.display = 'none';
        panelKardex.style.display = 'block';
        await loadKardexTable();
    };

    // Modal Ajuste Stock events
    const modal = document.getElementById('modal-inventario-ajuste');
    document.getElementById('btn-modal-ajuste-close').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-modal-ajuste-cancelar').onclick = () => modal.classList.remove('active');

    document.getElementById('form-inventario-ajuste').onsubmit = async (e) => {
        e.preventDefault();
        const pId = parseInt(document.getElementById('ajuste-producto-id').value);
        const stockNuevo = parseInt(document.getElementById('ajuste-stock-nuevo').value);
        const motivo = document.getElementById('ajuste-motivo').value;

        const cachedUser = JSON.parse(localStorage.getItem('sigea_current_user') || '{}');
        const userId = cachedUser.id || 1;

        try {
            await DB.registrarAjusteInventario(pId, stockNuevo, motivo, userId);
            modal.classList.remove('active');
            showToast("Inventario ajustado correctamente.", "success");
            await loadInventarioTable();
        } catch (err) {
            showToast("Error al ajustar: " + err.message, "danger");
        }
    };
}

async function loadKardexTable() {
    const movs = await DB.getMovimientosInventario();
    const tbody = document.getElementById('inventario-kardex-table-body');
    tbody.innerHTML = '';

    if (movs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay movimientos registrados.</td></tr>';
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

async function ajustarInventario(productoId) {
    const item = inventarioGlobal.find(i => i.producto_id === productoId);
    if (!item) return;

    document.getElementById('ajuste-producto-id').value = productoId;
    document.getElementById('ajuste-producto-nombre').value = item.productos?.nombre || 'Desconocido';
    document.getElementById('ajuste-stock-actual').value = item.stock_actual;
    document.getElementById('ajuste-stock-nuevo').value = item.stock_actual;
    document.getElementById('ajuste-motivo').value = 'Conteo Físico / Inventario Anual';
    
    document.getElementById('modal-inventario-ajuste').classList.add('active');
}
window.ajustarInventario = ajustarInventario;
