-- ============================================================================
-- SIGEA - Desactivar Seguridad de Fila (RLS) para Demostración / Desarrollo
-- Ejecutar en Supabase -> SQL Editor -> New Query -> Run
-- ============================================================================

ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE empleados DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE marcas DISABLE ROW LEVEL SECURITY;
ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE compras DISABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_compras DISABLE ROW LEVEL SECURITY;
ALTER TABLE metodos_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE cajas DISABLE ROW LEVEL SECURITY;
ALTER TABLE ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos_caja DISABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion DISABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_resumen DISABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Re-crear función fn_validar_login con SECURITY DEFINER para que corra
-- con privilegios de administrador y pueda saltar políticas de seguridad.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validar_login(
    p_usuario VARCHAR,
    p_clave_plana VARCHAR
) RETURNS TABLE(valido BOOLEAN, usuario_id INTEGER, rol_nombre VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (u.clave_hash = crypt(p_clave_plana, u.clave_hash)) AS valido,
        u.id,
        r.nombre
    FROM usuarios u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.usuario = p_usuario AND u.estado = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
