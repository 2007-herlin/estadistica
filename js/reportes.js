// js/reportes.js - Control de Reportes de SIGEA

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadReportesModule();
        } catch (e) {
            console.error("Error al cargar reportes:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

async function loadReportesModule() {
    const ventas = await DB.getVentas();
    const productos = await DB.getProductos();
    const clientes = await DB.getClientes();
    const detalles = await getLocalOrMockDetallesVentas();

    // 1. Resumen Mensual de Ventas & Utilidades
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
        tbMensual.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay transacciones registradas.</td></tr>';
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
                <td style="color:#81C784;"><b>S/. ${util.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></td>
                <td>S/. ${tProm.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
            `;
            tbMensual.appendChild(tr);
        });
    }

    // 2. Rendimiento por Categoría
    const catSales = {};
    detalles.forEach(dv => {
        // Solo considerar si la venta está emitida
        const v = ventas.find(item => item.id === dv.venta_id);
        if (v && v.estado === 'EMITIDA') {
            const prod = productos.find(p => p.id === dv.producto_id);
            if (prod) {
                const catName = prod.categorias?.nombre || 'General';
                if (!catSales[catName]) {
                    catSales[catName] = { cant: 0, total: 0 };
                }
                catSales[catName].cant += dv.cantidad;
                catSales[catName].total += dv.subtotal;
            }
        }
    });

    const tbCat = document.getElementById('reporte-categoria-ventas-body');
    tbCat.innerHTML = '';
    
    if (Object.keys(catSales).length === 0) {
        tbCat.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sin datos de categorías.</td></tr>';
    } else {
        Object.entries(catSales).forEach(([name, data]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><b>${name}</b></td>
                <td>${data.cant} unids</td>
                <td><b>S/. ${data.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></td>
            `;
            tbCat.appendChild(tr);
        });
    }

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
        tbCli.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sin consumo registrado.</td></tr>';
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

async function getLocalOrMockDetallesVentas() {
    return await DB.getDetallesVentasTodos();
}
