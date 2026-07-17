// js/compras.js - Control de Compras de SIGEA

let compraProductosList = [];
let compraProveedoresList = [];
let comprasCart = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await initComprasModule();
        } catch (e) {
            console.error("Error al iniciar compras:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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

    comprasCart = [];
    renderComprasCart();
    setupComprasEvents();
}

function setupComprasEvents() {
    // Evento Agregar a carrito
    document.getElementById('btn-compra-agregar-item').onclick = () => {
        const pId = parseInt(document.getElementById('compra-select-producto').value);
        const cant = parseInt(document.getElementById('compra-cantidad').value);

        if (!pId || isNaN(cant) || cant <= 0) {
            showToast("Por favor seleccione un producto y cantidad válida.", "warning");
            return;
        }

        const prod = compraProductosList.find(p => p.id === pId);
        if (!prod) return;

        const idx = comprasCart.findIndex(item => item.producto.id === pId);
        if (idx !== -1) {
            comprasCart[idx].cantidad += cant;
            comprasCart[idx].subtotal = comprasCart[idx].cantidad * prod.precio_compra;
        } else {
            comprasCart.push({
                producto: prod,
                cantidad: cant,
                subtotal: cant * prod.precio_compra
            });
        }

        document.getElementById('compra-select-producto').value = '';
        document.getElementById('compra-cantidad').value = '1';

        renderComprasCart();
        showToast(`${prod.nombre} agregado al carrito de compra.`, "success");
    };

    // Registrar Compra
    document.getElementById('compra-form-checkout').onsubmit = async (e) => {
        e.preventDefault();

        if (comprasCart.length === 0) {
            showToast("El carrito está vacío. Agregue productos a comprar.", "warning");
            return;
        }

        const proveedorId = parseInt(document.getElementById('compra-select-proveedor').value);
        const facturaNro = document.getElementById('compra-numero-comprobante').value;

        let subtotalNeto = comprasCart.reduce((acc, i) => acc + i.subtotal, 0);
        const igvCalculado = parseFloat((subtotalNeto * 0.18).toFixed(2));
        const totalPagar = parseFloat((subtotalNeto + igvCalculado).toFixed(2));

        const cachedUser = JSON.parse(localStorage.getItem('sigea_current_user') || '{}');

        const compra = {
            proveedor_id: proveedorId,
            usuario_id: cachedUser.id || 1,
            numero_comprobante: facturaNro,
            subtotal: subtotalNeto,
            igv: igvCalculado,
            total: totalPagar,
            estado: 'REGISTRADA'
        };

        const detalles = comprasCart.map(item => ({
            producto_id: item.producto.id,
            cantidad: item.cantidad,
            precio_unitario: item.producto.precio_compra,
            subtotal: item.subtotal
        }));

        try {
            await DB.saveCompra(compra, detalles);
            showToast("Compra registrada y stock actualizado en el Kardex.", "success");
            comprasCart = [];
            renderComprasCart();
            document.getElementById('compra-form-checkout').reset();
            
            await initComprasModule();
        } catch (err) {
            showToast("Error al registrar: " + err.message, "danger");
        }
    };

    // Toggle Historial
    const btnHistorial = document.getElementById('btn-compras-historial-toggle');
    const sectionHistorial = document.getElementById('section-historial-compras');
    document.getElementById('btn-cerrar-historial-compras').onclick = () => {
        sectionHistorial.style.display = 'none';
    };

    btnHistorial.onclick = async () => {
        if (sectionHistorial.style.display === 'block') {
            sectionHistorial.style.display = 'none';
            return;
        }
        sectionHistorial.style.display = 'block';
        await loadHistorialComprasTable();
    };
}

function renderComprasCart() {
    const container = document.getElementById('compra-cart-items-wrapper');
    container.innerHTML = '';

    if (comprasCart.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">El carrito está vacío. Agregue productos.</div>';
        updateCompraTotals();
        return;
    }

    comprasCart.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <span><b>${item.producto.nombre}</b></span>
            <span>S/. ${item.producto.precio_compra.toFixed(2)}</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidadCompras(${index}, this.value)">
            <span style="font-weight:600; color:var(--primary-hover);">S/. ${item.subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-icon" style="width:26px; height:26px; font-size:10px;" onclick="quitarItemCompras(${index})"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(row);
    });

    updateCompraTotals();
}

function cambiarCantidadCompras(index, value) {
    const cant = parseInt(value);
    if (cant <= 0 || isNaN(cant)) return;
    comprasCart[index].cantidad = cant;
    comprasCart[index].subtotal = cant * comprasCart[index].producto.precio_compra;
    renderComprasCart();
}
window.cambiarCantidadCompras = cambiarCantidadCompras;

function quitarItemCompras(index) {
    comprasCart.splice(index, 1);
    renderComprasCart();
}
window.quitarItemCompras = quitarItemCompras;

function updateCompraTotals() {
    let subtotalNeto = comprasCart.reduce((acc, i) => acc + i.subtotal, 0);
    const igvTasa = 0.18;
    const igvCalculado = subtotalNeto * igvTasa;
    const totalPagar = subtotalNeto + igvCalculado;

    document.getElementById('compra-sum-subtotal').textContent = `S/. ${subtotalNeto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('compra-sum-igv').textContent = `S/. ${igvCalculado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    document.getElementById('compra-sum-total').textContent = `S/. ${totalPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
}

async function loadHistorialComprasTable() {
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
}

// Detalle Comprobante Modal
async function verDetalleComprobante(tipo, id) {
    const modal = document.getElementById('modal-detalle-transaccion');
    const title = document.getElementById('modal-detalle-transaccion-title');
    const tableBody = document.getElementById('det-trans-items-body');
    
    tableBody.innerHTML = '';
    
    if (tipo === 'COMPRA') {
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

document.getElementById('btn-modal-detalle-transaccion-close').onclick = () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
};
document.getElementById('btn-modal-detalle-transaccion-cerrar').onclick = () => {
    document.getElementById('modal-detalle-transaccion').classList.remove('active');
};
