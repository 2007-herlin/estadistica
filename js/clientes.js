// js/clientes.js - Control de Clientes de SIGEA

let clientesGlobal = [];

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadClientesTable();
            setupClientesEvents();
        } catch (e) {
            console.error("Error al cargar clientes:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

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
        tbody.appendChild(tr);
    });

    // Búsqueda
    document.getElementById('clientes-search').oninput = (e) => {
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
    };
}

function setupClientesEvents() {
    const modal = document.getElementById('modal-cliente');
    document.getElementById('btn-modal-cliente-close').onclick = () => modal.classList.remove('active');
    document.getElementById('btn-modal-cliente-cancelar').onclick = () => modal.classList.remove('active');

    document.getElementById('btn-cliente-nuevo').onclick = () => {
        document.getElementById('modal-cliente-title').textContent = 'Registrar Cliente';
        document.getElementById('cliente-id').value = '';
        document.getElementById('form-cliente').reset();
        modal.classList.add('active');
    };

    document.getElementById('form-cliente').onsubmit = async (e) => {
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
            modal.classList.remove('active');
            showToast("Cliente guardado correctamente.", "success");
            await loadClientesTable();
        } catch (err) {
            showToast("Error: " + err.message, "danger");
        }
    };

    // Modal Historial close events
    const modalHist = document.getElementById('modal-historial-cliente');
    document.getElementById('btn-modal-historial-cliente-close').onclick = () => modalHist.classList.remove('active');
    document.getElementById('btn-modal-historial-cliente-cerrar').onclick = () => modalHist.classList.remove('active');
}

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
    
    document.getElementById('modal-cliente').classList.add('active');
}
window.editarCliente = editarCliente;

async function eliminarCliente(id) {
    if (confirm("¿Está seguro de desactivar este cliente?")) {
        try {
            await DB.deleteCliente(id);
            showToast("Cliente desactivado.", "warning");
            await loadClientesTable();
        } catch (err) {
            showToast(err.message, "danger");
        }
    }
}
window.eliminarCliente = eliminarCliente;

async function verHistorialCliente(id) {
    const cli = clientesGlobal.find(c => c.id === id);
    if (!cli) return;

    document.getElementById('modal-historial-cliente-title').textContent = `Compras de ${cli.nombres_razon}`;
    
    const ventas = await DB.getVentas();
    const comprasCliente = ventas.filter(v => v.cliente_id === id && v.estado === 'EMITIDA');
    
    const tableBody = document.getElementById('modal-historial-cliente-table-body');
    tableBody.innerHTML = '';
    
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
            <li>Inversión acumulada: <b>S/. ${totalSpent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></li>
            <li>Ticket promedio de compra: <b>S/. ${meanSpent.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></li>
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

    document.getElementById('modal-historial-cliente').classList.add('active');
}
window.verHistorialCliente = verHistorialCliente;
