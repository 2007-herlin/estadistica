// js/ventas.js - Control de Ventas de SIGEA

let ventaProductosList = [];
let ventaClientesList = [];
let ventasCart = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await initVentasModule();
        } catch (e) {
            console.error("Error al iniciar módulo de ventas:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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

    ventasCart = [];
    renderVentasCart();
    setupVentasEvents();
}

function setupVentasEvents() {
    // Evento Agregar a carrito
    document.getElementById('btn-venta-agregar-item').onclick = () => {
        const pId = parseInt(document.getElementById('venta-select-producto').value);
        const cant = parseInt(document.getElementById('venta-cantidad').value);

        if (!pId || isNaN(cant) || cant <= 0) {
            showToast("Por favor seleccione un producto y cantidad válida.", "warning");
            return;
        }

        const prod = ventaProductosList.find(p => p.id === pId);
        if (!prod) return;

        // Verificar si ya existe en carrito
        const idx = ventasCart.findIndex(item => item.producto.id === pId);
        if (idx !== -1) {
            ventasCart[idx].cantidad += cant;
            ventasCart[idx].subtotal = ventasCart[idx].cantidad * prod.precio_venta;
        } else {
            ventasCart.push({
                producto: prod,
                cantidad: cant,
                subtotal: cant * prod.precio_venta
            });
        }

        document.getElementById('venta-select-producto').value = '';
        document.getElementById('venta-cantidad').value = '1';

        renderVentasCart();
        showToast(`${prod.nombre} agregado al carrito.`, "success");
    };

    // Escuchar cambios de descuento
    document.getElementById('venta-descuento-pct').oninput = updateVentaCheckoutTotals;

    // Formulario de Cobro
    document.getElementById('venta-form-checkout').onsubmit = async (e) => {
        e.preventDefault();

        if (ventasCart.length === 0) {
            showToast("El carrito está vacío. Agregue productos antes de cobrar.", "warning");
            return;
        }

        const clienteId = parseInt(document.getElementById('venta-select-cliente').value);
        const tipoComp = document.getElementById('venta-tipo-comprobante').value;
        const metodoPagoId = parseInt(document.getElementById('venta-metodo-pago').value);
        const descPct = parseFloat(document.getElementById('venta-descuento-pct').value) || 0;

        let totalBruto = ventasCart.reduce((acc, i) => acc + i.subtotal, 0);
        const descVal = parseFloat(((totalBruto * descPct) / 100).toFixed(2));
        const totalNeto = parseFloat((totalBruto - descVal).toFixed(2));
        const subtotalCalc = parseFloat((totalNeto / 1.18).toFixed(2));
        const igvCalc = parseFloat((totalNeto - subtotalCalc).toFixed(2));

        const totalVentasRegistradas = (await DB.getVentas()).length;

        // Obtener usuario logueado
        const cachedUser = JSON.parse(localStorage.getItem('sigea_current_user') || '{}');

        const venta = {
            cliente_id: clienteId,
            usuario_id: cachedUser.id || 2,
            caja_id: 1,
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

        const detalles = ventasCart.map(item => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            precio_unitario: item.producto.precio_venta,
            descuento: parseFloat(((item.subtotal * descPct) / 100).toFixed(2)),
            subtotal: parseFloat((item.subtotal - ((item.subtotal * descPct) / 100)).toFixed(2))
        }));

        try {
            await DB.saveVenta(venta, detalles);
            
            // Guardar detalles localmente para reportes rápidos
            const localDets = localStorage.getItem('sigea_detalle_ventas');
            const currentDetVentas = localDets ? JSON.parse(localDets) : [];
            detalles.forEach(d => {
                d.id = currentDetVentas.length + 1;
                currentDetVentas.push(d);
            });
            localStorage.setItem('sigea_detalle_ventas', JSON.stringify(currentDetVentas));

            showToast("¡Venta registrada con éxito!", "success");
            ventasCart = [];
            renderVentasCart();
            document.getElementById('venta-form-checkout').reset();
            document.getElementById('venta-descuento-pct').value = '0';
            
            await initVentasModule();
        } catch (err) {
            showToast("Error al procesar la venta: " + err.message, "danger");
        }
    };

    // Toggle Historial
    const btnHistorial = document.getElementById('btn-ventas-historial-toggle');
    const sectionHistorial = document.getElementById('section-historial-ventas');
    document.getElementById('btn-cerrar-historial-ventas').onclick = () => {
        sectionHistorial.style.display = 'none';
    };

    btnHistorial.onclick = async () => {
        if (sectionHistorial.style.display === 'block') {
            sectionHistorial.style.display = 'none';
            return;
        }
        sectionHistorial.style.display = 'block';
        await loadHistorialVentasTable();
    };
}

function renderVentasCart() {
    const container = document.getElementById('venta-cart-items-wrapper');
    container.innerHTML = '';

    if (ventasCart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">El carrito está vacío. Agregue productos.</div>';
        updateVentaCheckoutTotals();
        return;
    }

    ventasCart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <span><b>${item.producto.nombre}</b></span>
            <span>S/. ${item.producto.precio_venta.toFixed(2)}</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidadVentas(${index}, this.value)">
            <span style="font-weight:600; color:var(--primary-hover);">S/. ${item.subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-icon" style="width:26px; height:26px; font-size:10px;" onclick="quitarItemVentas(${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(row);
    });

    updateVentaCheckoutTotals();
}

function cambiarCantidadVentas(index, value) {
    const cant = parseInt(value);
    if (cant <= 0 || isNaN(cant)) return;
    ventasCart[index].cantidad = cant;
    ventasCart[index].subtotal = cant * ventasCart[index].producto.precio_venta;
    renderVentasCart();
}
window.cambiarCantidadVentas = cambiarCantidadVentas;

function quitarItemVentas(index) {
    ventasCart.splice(index, 1);
    renderVentasCart();
}
window.quitarItemVentas = quitarItemVentas;

function updateVentaCheckoutTotals() {
    let totalBruto = ventasCart.reduce((acc, i) => acc + i.subtotal, 0);
    const descPct = parseFloat(document.getElementById('venta-descuento-pct').value) || 0;
    
    const descuentoTotalVal = (totalBruto * descPct) / 100;
    const totalPagar = totalBruto - descuentoTotalVal;
    
    const igvTasa = 0.18;
    const subtotalCalculado = totalPagar / (1 + igvTasa);
    const igvCalculado = totalPagar - subtotalCalculado;

    document.getElementById('venta-sum-subtotal').textContent = `S/. ${subtotalCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-descuento').textContent = `S/. ${descuentoTotalVal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-igv').textContent = `S/. ${igvCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('venta-sum-total').textContent = `S/. ${totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

async function loadHistorialVentasTable() {
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
}

// Detalle Comprobante Modal
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
    }

    modal.classList.add('active');
}
window.verDetalleComprobante = verDetalleComprobante;

document.getElementById('btn-modal-detalle-transaccion-close').onclick = () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
};
document.getElementById('btn-modal-detalle-transaccion-cerrar').onclick = () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
};
