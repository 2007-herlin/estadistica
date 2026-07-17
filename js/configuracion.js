// js/configuracion.js - Control de Configuración de SIGEA

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        try {
            await loadConfiguracionModule();
        } catch (e) {
            console.error("Error al cargar configurador:", e);
            showToast("Error al inicializar: " + e.message, "danger");
        }
    }, 150);
});

async function loadConfiguracionModule() {
    const config = DB.getConfig();
    
    // Cargar config actual de base de datos
    document.getElementById('config-use-supabase').checked = config.useSupabase;
    document.getElementById('config-supabase-url').value = config.url || '';
    document.getElementById('config-supabase-key').value = config.key || '';

    // Cargar parámetros de negocio de LocalStorage
    const igvTasa = parseFloat(localStorage.getItem('sigea_cfg_igv') || '0.18');
    const nameBusiness = localStorage.getItem('sigea_cfg_nombre_empresa') || 'Texteliria ACAREIA ATELIER';
    const currency = localStorage.getItem('sigea_cfg_moneda') || 'PEN';

    document.getElementById('config-empresa').value = nameBusiness;
    document.getElementById('config-igv').value = igvTasa;
    document.getElementById('config-moneda').value = currency;

    // Config de Base de Datos
    document.getElementById('config-form-database').onsubmit = async (e) => {
        e.preventDefault();
        const useSub = document.getElementById('config-use-supabase').checked;
        const subUrl = document.getElementById('config-supabase-url').value;
        const subKey = document.getElementById('config-supabase-key').value;

        // Intentar actualizar e inicializar
        DB.updateConfig({
            useSupabase: useSub,
            url: subUrl,
            key: subKey
        });

        // Actualizar indicador visual
        if (typeof window.updateCommonIndicator === 'function') {
            window.updateCommonIndicator();
        }

        if (useSub) {
            showToast("Estableciendo conexión a Supabase...", "warning");
            try {
                // Probar conexion consultando categorias
                await DB.getCategorias();
                showToast("Conexión remota con Supabase exitosa.", "success");
            } catch (err) {
                showToast("Fallo de conexión: " + err.message, "danger");
                // Forzar apagado de flag y reiniciar local
                DB.updateConfig({ useSupabase: false });
                document.getElementById('config-use-supabase').checked = false;
                if (typeof window.updateCommonIndicator === 'function') {
                    window.updateCommonIndicator();
                }
            }
        } else {
            showToast("Se cambió a Modo Demo (LocalStorage).", "info");
        }
    };

    // Parámetros de negocio
    document.getElementById('config-form-negocio').onsubmit = (e) => {
        e.preventDefault();
        const emp = document.getElementById('config-empresa').value;
        const igv = document.getElementById('config-igv').value;
        const mon = document.getElementById('config-moneda').value;

        localStorage.setItem('sigea_cfg_nombre_empresa', emp);
        localStorage.setItem('sigea_cfg_igv', igv);
        localStorage.setItem('sigea_cfg_moneda', mon);

        showToast("Parámetros actualizados correctamente.", "success");
        setTimeout(() => location.reload(), 800);
    };

    // Reiniciar LocalStorage
    document.getElementById('btn-config-reset-local').onclick = () => {
        if (confirm("¿Está seguro de limpiar la base de datos local? Perderá todos los registros semilla.")) {
            // Eliminar todas las claves del prefijo sigea_
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sigea_')) {
                    localStorage.removeItem(key);
                }
            });
            showToast("Base de datos local formateada. Recargando...", "danger");
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    };
}
