// js/proveedores.js - Control de Proveedores de SIGEA

let proveedoresGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadProveedoresTable();
            setupProveedoresEvents();
        } catch (e) {
            console.error("Error al cargar proveedores:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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
    document.getElementById('proveedores-search').oninput = (e) => {
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
    };
}

function setupProveedoresEvents() {
    const modal = document.getElementById('modal-proveedor');
    document.getElementById('btn-modal-proveedor-close').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-modal-proveedor-cancelar').onclick = () => modal.classList.remove('active');

    document.getElementById('btn-proveedor-nuevo').onclick = () => {
        document.getElementById('modal-proveedor-title').textContent = 'Registrar Proveedor';
        document.getElementById('proveedor-id').value = '';
        document.getElementById('form-proveedor').reset();
        modal.classList.add('active');
    };

    document.getElementById('form-proveedor').onsubmit = async (e) => {
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
            modal.classList.remove('active');
            showToast("Proveedor guardado correctamente.", "success");
            await loadProveedoresTable();
        } catch (err) {
            showToast("Error: " + err.message, "danger");
        }
    };
}

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
    
    document.getElementById('modal-proveedor').classList.add('active');
}
window.editarProveedor = editarProveedor;

async function eliminarProveedor(id) {
    if (confirm("¿Está seguro de eliminar este proveedor?")) {
        try {
            await DB.deleteProveedor(id);
            showToast("Proveedor desactivado.", "warning");
            await loadProveedoresTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarProveedor = eliminarProveedor;
