// js/login.js - Control de autenticación de SIGEA

document.addEventListener('DOMContentLoaded', () => {
    const accordion = document.getElementById('login-db-accordion');
    const btnToggle = document.getElementById('btn-toggle-login-config');
    const chkUseSupabase = document.getElementById('login-use-supabase');
    const txtUrl = document.getElementById('login-supabase-url');
    const txtKey = document.getElementById('login-supabase-key');
    const btnGuardar = document.getElementById('btn-login-guardar-db');
    const btnRestaurar = document.getElementById('btn-login-restaurar-db');

    // Cargar config actual de DB al iniciar
    if (window.DB) {
        const config = DB.getConfig();
        chkUseSupabase.checked = config.useSupabase;
        txtUrl.value = config.url || '';
        txtKey.value = config.key || '';
    }

    // Toggle accordion
    btnToggle.addEventListener('click', () => {
        if (accordion.style.display === 'none') {
            accordion.style.display = 'block';
        } else {
            accordion.style.display = 'none';
        }
    });

    // Guardar Configuración
    btnGuardar.addEventListener('click', () => {
        if (!window.DB) return;
        
        DB.updateConfig({
            useSupabase: chkUseSupabase.checked,
            url: txtUrl.value.trim(),
            key: txtKey.value.trim()
        });

        showToast("Configuración de base de datos actualizada.", "success");
        accordion.style.display = 'none';
    });

    // Restaurar por Defecto
    btnRestaurar.addEventListener('click', () => {
        if (confirm("¿Restaurar los parámetros predeterminados de Supabase?")) {
            localStorage.removeItem('sigea_db_config');
            location.reload();
        }
    });
});

// Evento Submit de Login Form
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error-msg');
    
    errorMsg.style.display = 'none';

    try {
        const loginRes = await DB.login(user, pass);
        if (loginRes.success) {
            // Guardar usuario en localStorage
            localStorage.setItem('sigea_current_user', JSON.stringify(loginRes.user));
            
            showToast(`¡Sesión iniciada como ${loginRes.user.nombres}!`, 'success');
            
            // Redireccionar al dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            errorMsg.textContent = loginRes.message;
            errorMsg.style.display = 'block';
            showToast("Acceso denegado.", "danger");
        }
    } catch (error) {
        errorMsg.textContent = "Error de comunicación con el servidor.";
        errorMsg.style.display = 'block';
        showToast("Error de conexión.", "danger");
        if (typeof window.mostrarBannerErrorGlobal === 'function') {
            window.mostrarBannerErrorGlobal(error);
        }
    }
});
