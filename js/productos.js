// js/productos.js - Control de Productos de SIGEA

let productosGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadProductosTable();
            setupProductosEvents();
        } catch (e) {
            console.error("Error al cargar productos:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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
    document.getElementById('productos-search').oninput = (e) => {
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
    };
}

function setupProductosEvents() {
    const modal = document.getElementById('modal-producto');
    document.getElementById('btn-modal-producto-close').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-modal-producto-cancelar').onclick = () => modal.classList.remove('active');

    document.getElementById('btn-producto-nuevo').onclick = async () => {
        document.getElementById('modal-producto-title').textContent = 'Registrar Producto';
        document.getElementById('producto-id').value = '';
        document.getElementById('form-producto').reset();
        
        await popDropdownsProductos();
        modal.classList.add('active');
    };

    document.getElementById('form-producto').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('producto-id').value;
        const pVenta = parseFloat(document.getElementById('producto-precio-venta').value);
        const pCompra = parseFloat(document.getElementById('producto-precio-compra').value);
        
        if (pVenta < pCompra) {
            showToast("El precio de venta no puede ser menor al costo de compra.", "danger");
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
            modal.classList.remove('active');
            showToast("Producto guardado correctamente.", "success");
            await loadProductosTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    };
}

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
    
    document.getElementById('modal-producto').classList.add('active');
}
window.editarProducto = editarProducto;

async function eliminarProducto(id) {
    if (confirm("¿Está seguro de eliminar este producto del catálogo?")) {
        try {
            await DB.deleteProducto(id);
            showToast("Producto eliminado.", "warning");
            await loadProductosTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarProducto = eliminarProducto;
