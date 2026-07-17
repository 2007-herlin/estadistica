// database.js - Capa de Datos Dual (Supabase + LocalStorage Fallback)

const DEFAULT_SUPABASE_URL = 'https://lrmuzrbkonwigkfpmbwg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_4XJ5YoDN7K9wmlALdaz5dA_r9Nwu4J7';

// Configuración de la base de datos (Supabase activo por defecto)
let dbConfig = {
    useSupabase: true,
    url: DEFAULT_SUPABASE_URL,
    key: DEFAULT_SUPABASE_KEY
};

// Cargar configuración guardada si existe
const savedConfig = localStorage.getItem('sigea_db_config');
if (savedConfig) {
    try {
        dbConfig = { ...dbConfig, ...JSON.parse(savedConfig) };
    } catch (e) {
        console.error("Error al cargar la configuración de base de datos", e);
    }
}

// Inicializar cliente de Supabase
let supabaseClient = null;
function initSupabase() {
    if (dbConfig.useSupabase && dbConfig.url && dbConfig.key) {
        try {
            if (window.supabase) {
                supabaseClient = window.supabase.createClient(dbConfig.url, dbConfig.key);
                console.log("Cliente Supabase (supabaseClient) inicializado correctamente.");
                // Seeding desactivado por solicitud del usuario (todo real desde BD)
                // verificarYEjecutarSemillaSupabase();
            } else {
                console.warn("Librería de Supabase no cargada en el navegador.");
                supabaseClient = null;
            }
        } catch (error) {
            console.error("Error al inicializar cliente Supabase:", error);
            supabaseClient = null;
        }
    } else {
        supabaseClient = null;
    }
}

// Generar datos semilla
function getSeedData() {
    const roles = [
        { id: 1, nombre: 'Administrador', descripcion: 'Acceso total al sistema', estado: true },
        { id: 2, nombre: 'Supervisor', descripcion: 'Gestión de reportes y aprobaciones', estado: true },
        { id: 3, nombre: 'Vendedor', descripcion: 'Registro de ventas y clientes', estado: true },
        { id: 4, nombre: 'Almacén', descripcion: 'Gestión de inventario y compras', estado: true }
    ];

    const usuarios = [
        { id: 1, rol_id: 1, usuario: 'admin', clave_hash: 'Admin@123', correo: 'admin@sigea.com', estado: true },
        { id: 2, rol_id: 3, usuario: 'empleado', clave_hash: 'Empleado@123', correo: 'vendedor@sigea.com', estado: true }
    ];

    const empleados = [
        { id: 1, usuario_id: 1, nombres: 'Carlos', apellidos: 'Mendoza', dni: '72345678', telefono: '987654321', direccion: 'Av. Larco 456, Lima', cargo: 'Administrador', fecha_ingreso: '2025-01-10', estado: true },
        { id: 2, usuario_id: 2, nombres: 'Lucía', apellidos: 'Fernández', dni: '75432109', telefono: '912345678', direccion: 'Calle Pardo 123, Miraflores', cargo: 'Vendedor', fecha_ingreso: '2025-02-15', estado: true }
    ];

    const clientes = [
        { id: 1, tipo_documento: 'DNI', numero_documento: '45678912', nombres_razon: 'Juan Pérez Guerrero', telefono: '999888777', correo: 'juan.perez@gmail.com', direccion: 'Av. Arequipa 1230, Lince', estado: true },
        { id: 2, tipo_documento: 'RUC', numero_documento: '20123456789', nombres_razon: 'Textiles del Sur S.A.C.', telefono: '01-445566', correo: 'contacto@textilessur.com', direccion: 'Av. Industrial 450, Ate', estado: true },
        { id: 3, tipo_documento: 'DNI', numero_documento: '09876543', nombres_razon: 'María López Prado', telefono: '944332211', correo: 'maria.lopez@yahoo.com', direccion: 'Jr. Carabaya 789, Lima', estado: true },
        { id: 4, tipo_documento: 'DNI', numero_documento: '12345678', nombres_razon: 'Pedro Ramírez Soto', telefono: '911223344', correo: 'pramirez@outlook.com', direccion: 'Calle Las Flores 456, San Isidro', estado: true },
        { id: 5, tipo_documento: 'RUC', numero_documento: '20601234567', nombres_razon: 'Atelier de Alta Costura E.I.R.L.', telefono: '988556644', correo: 'atelier@acareia.com', direccion: 'Calle Cantuarias 320, Miraflores', estado: true }
    ];

    const proveedores = [
        { id: 1, ruc: '20556677881', razon_social: 'Distribuidora Hilados del Norte S.A.', contacto: 'Roberto Gómez', telefono: '955112233', correo: 'ventas@hiladosnorte.com', direccion: 'Av. Los Próceres 780, S.M.P.', estado: true },
        { id: 2, ruc: '20443322115', razon_social: 'Maquinarias y Herramientas Texteliria', contacto: 'Ana María Romero', telefono: '944887766', correo: 'contacto@texteliria.com', direccion: 'Calle Las Maquinarias 140, Callao', estado: true },
        { id: 3, ruc: '20998877663', razon_social: 'Avíos y Botones del Perú S.R.L.', contacto: 'Jorge Castro', telefono: '933554422', correo: 'jcastro@aviosperu.com', direccion: 'Jr. Gamarra 850, La Victoria', estado: true }
    ];

    const categorias = [
        { id: 1, nombre: 'Telas y Hilados', descripcion: 'Diferentes tipos de telas de algodón, lino y lanas', estado: true },
        { id: 2, nombre: 'Herramientas y Accesorios', descripcion: 'Tijeras, agujas, cintas métricas y herramientas taller', estado: true },
        { id: 3, nombre: 'Avíos y Botones', descripcion: 'Cierres, botones, elásticos e insumos decorativos', estado: true },
        { id: 4, nombre: 'Tintes y Pinturas', descripcion: 'Tintes textiles y pinturas para acabados manuales', estado: true }
    ];

    const marcas = [
        { id: 1, nombre: 'Genérico', estado: true },
        { id: 2, nombre: 'Singer', estado: true },
        { id: 3, nombre: 'Gütermann', estado: true },
        { id: 4, nombre: 'Stanley', estado: true }
    ];

    const productos = [
        { id: 1, codigo: 'TEL-001', nombre: 'Algodón Pima Premium 1mt', descripcion: 'Tela de algodón pima blanco de alta calidad', categoria_id: 1, marca_id: 1, precio_compra: 15.00, precio_venta: 28.00, stock_minimo: 10, unidad_medida: 'METRO', estado: true },
        { id: 2, codigo: 'HER-001', nombre: 'Tijera Sastre Profesional Singer', descripcion: 'Tijera de acero inoxidable de 10 pulgadas', categoria_id: 2, marca_id: 2, precio_compra: 45.00, precio_venta: 75.00, stock_minimo: 3, unidad_medida: 'UNIDAD', estado: true },
        { id: 3, codigo: 'AVI-001', nombre: 'Botón de Nácar 15mm (x100)', descripcion: 'Paquete de 100 botones de nácar natural', categoria_id: 3, marca_id: 3, precio_compra: 12.00, precio_venta: 25.00, stock_minimo: 5, unidad_medida: 'PAQUETE', estado: true },
        { id: 4, codigo: 'HER-002', nombre: 'Martillo Stanley Carpintero', descripcion: 'Martillo de uña de 16 oz con mango de fibra', categoria_id: 2, marca_id: 4, precio_compra: 22.00, precio_venta: 39.90, stock_minimo: 5, unidad_medida: 'UNIDAD', estado: true },
        { id: 5, codigo: 'TIN-001', nombre: 'Tinte Textil Anilina Azul 100g', descripcion: 'Tinte reactivo de fijación en frío', categoria_id: 4, marca_id: 1, precio_compra: 6.50, precio_venta: 12.00, stock_minimo: 8, unidad_medida: 'FRASCO', estado: true },
        { id: 6, codigo: 'TEL-002', nombre: 'Lino Irlandés Importado 1mt', descripcion: 'Lino puro de alta gama tono natural', categoria_id: 1, marca_id: 1, precio_compra: 35.00, precio_venta: 65.00, stock_minimo: 5, unidad_medida: 'METRO', estado: true },
        { id: 7, codigo: 'AVI-002', nombre: 'Cierre Cremallera Invisible 20cm', descripcion: 'Cierre invisible varios colores pack de 10', categoria_id: 3, marca_id: 1, precio_compra: 5.00, precio_venta: 10.00, stock_minimo: 10, unidad_medida: 'PAQUETE', estado: true }
    ];

    const inventario = [
        { id: 1, producto_id: 1, stock_actual: 45, ultima_actualizacion: new Date().toISOString() },
        { id: 2, producto_id: 2, stock_actual: 12, ultima_actualizacion: new Date().toISOString() },
        { id: 3, producto_id: 3, stock_actual: 2, ultima_actualizacion: new Date().toISOString() },
        { id: 4, producto_id: 4, stock_actual: 0, ultima_actualizacion: new Date().toISOString() },
        { id: 5, producto_id: 5, stock_actual: 30, ultima_actualizacion: new Date().toISOString() },
        { id: 6, producto_id: 6, stock_actual: 8, ultima_actualizacion: new Date().toISOString() },
        { id: 7, producto_id: 7, stock_actual: 50, ultima_actualizacion: new Date().toISOString() }
    ];

    const metodosPago = [
        { id: 1, nombre: 'Efectivo', estado: true },
        { id: 2, nombre: 'Tarjeta', estado: true },
        { id: 3, nombre: 'Yape/Plin', estado: true },
        { id: 4, nombre: 'Transferencia', estado: true }
    ];

    const cajas = [
        { id: 1, nombre: 'Caja Principal', ubicacion: 'Local Central', estado: true }
    ];

    const configuracion = [
        { id: 1, clave: 'IGV', valor: '0.18', descripcion: 'Porcentaje de IGV' },
        { id: 2, clave: 'NOMBRE_EMPRESA', valor: 'Texteliria ACAREIA ATELIER', descripcion: 'Nombre comercial' },
        { id: 3, clave: 'MONEDA', valor: 'PEN', descripcion: 'Moneda del sistema' }
    ];

    const ventas = [];
    const detalleVentas = [];
    const compras = [];
    const detalleCompras = [];
    const movimientos_inventario = []; // <-- FIJADO: Declarada para evitar ReferenceError
    const publicidadDiaria = {};

    let ventaIdCounter = 1;
    let detalleVentaIdCounter = 1;
    let compraIdCounter = 1;
    let detalleCompraIdCounter = 1;

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30);

    for (let d = 0; d < 30; d++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + d);
        const dateStr = currentDate.toISOString().split('T')[0];

        const publicadGasto = 50 + d * 5 + Math.floor(Math.random() * 40);
        publicidadDiaria[dateStr] = publicadGasto;

        const numVentasHoy = Math.max(3, Math.floor(8 + (Math.random() * 6 - 3)));

        for (let v = 0; v < numVentasHoy; v++) {
            const cliente = clientes[Math.floor(Math.random() * clientes.length)];
            const metodo = metodosPago[Math.floor(Math.random() * metodosPago.length)];
            const conPromocion = Math.random() < 0.35;
            const descuentoPorcentaje = conPromocion ? 0.10 : 0.00;

            const cantProductos = Math.floor(1 + Math.random() * 4);
            let subtotalVenta = 0;
            const detallesVentaHoy = [];

            for (let p = 0; p < cantProductos; p++) {
                const prod = productos[Math.floor(Math.random() * productos.length)];
                if (prod.id === 4 && d > 20) continue;

                const cant = Math.floor(1 + Math.random() * 3) * (conPromocion ? 2 : 1);
                const precio = prod.precio_venta;
                const descVal = parseFloat((precio * cant * descuentoPorcentaje).toFixed(2));
                const subt = parseFloat((precio * cant - descVal).toFixed(2));

                detallesVentaHoy.push({
                    id: detalleVentaIdCounter++,
                    venta_id: ventaIdCounter,
                    producto_id: prod.id,
                    cantidad: cant,
                    precio_unitario: precio,
                    descuento: descVal,
                    subtotal: subt
                });

                subtotalVenta += subt;
            }

            if (detallesVentaHoy.length === 0) continue;

            const igvTasa = 0.18;
            const descuentoTotal = parseFloat(detallesVentaHoy.reduce((acc, dt) => acc + dt.descuento, 0).toFixed(2));
            const subtotalCalculado = parseFloat((subtotalVenta / (1 + igvTasa)).toFixed(2));
            const igvCalculado = parseFloat((subtotalVenta - subtotalCalculado).toFixed(2));
            const totalVenta = parseFloat(subtotalVenta.toFixed(2));

            ventas.push({
                id: ventaIdCounter,
                cliente_id: cliente.id,
                usuario_id: 2,
                caja_id: 1,
                metodo_pago_id: metodo.id,
                tipo_comprobante: Math.random() < 0.7 ? 'BOLETA' : 'FACTURA',
                serie: 'B001',
                numero: 1000 + ventaIdCounter,
                fecha: currentDate.toISOString(),
                subtotal: subtotalCalculado,
                descuento: descuentoTotal,
                igv: igvCalculado,
                total: totalVenta,
                estado: 'EMITIDA',
                created_at: currentDate.toISOString()
            });

            detallesVentaHoy.forEach(dt => detalleVentas.push(dt));
            ventaIdCounter++;
        }

        if (d % 5 === 0) {
            const proveedor = proveedores[Math.floor(Math.random() * proveedores.length)];
            const numProductosCompra = Math.floor(1 + Math.random() * 3);
            let subtotalCompra = 0;
            const detallesCompraHoy = [];

            for (let cProd = 0; cProd < numProductosCompra; cProd++) {
                const prod = productos[Math.floor(Math.random() * productos.length)];
                const cant = Math.floor(10 + Math.random() * 20);
                const precioC = prod.precio_compra;
                const subtC = cant * precioC;

                detallesCompraHoy.push({
                    id: detalleCompraIdCounter++,
                    compra_id: compraIdCounter,
                    producto_id: prod.id,
                    cantidad: cant,
                    precio_unitario: precioC,
                    subtotal: subtC
                });

                subtotalCompra += subtC;
            }

            const igvC = parseFloat((subtotalCompra * 0.18).toFixed(2));
            const totalC = parseFloat((subtotalCompra + igvC).toFixed(2));

            compras.push({
                id: compraIdCounter,
                proveedor_id: proveedor.id,
                usuario_id: 1,
                numero_comprobante: `F001-000${compraIdCounter}`,
                fecha: currentDate.toISOString(),
                subtotal: subtotalCompra,
                igv: igvC,
                total: totalC,
                estado: 'REGISTRADA',
                created_at: currentDate.toISOString()
            });

            detallesCompraHoy.forEach(dc => detalleCompras.push(dc));
            compraIdCounter++;
        }
    }

    const alertas_stock = [];
    let alertaIdCounter = 1;
    inventario.forEach(inv => {
        const prod = productos.find(p => p.id === inv.producto_id);
        if (prod) {
            if (inv.stock_actual === 0) {
                alertas_stock.push({
                    id: alertaIdCounter++,
                    producto_id: prod.id,
                    tipo_alerta: 'STOCK_AGOTADO',
                    mensaje: `El producto ${prod.nombre} se ha agotado.`,
                    estado: 'PENDIENTE',
                    fecha: new Date().toISOString()
                });
            } else if (inv.stock_actual <= prod.stock_minimo) {
                alertas_stock.push({
                    id: alertaIdCounter++,
                    producto_id: prod.id,
                    tipo_alerta: 'STOCK_BAJO',
                    mensaje: `El producto ${prod.nombre} está por debajo del stock mínimo (${prod.stock_minimo}).`,
                    estado: 'PENDIENTE',
                    fecha: new Date().toISOString()
                });
            }
        }
    });

    const arqueos_caja = [
        { id: 1, caja_id: 1, usuario_id: 1, fecha_apertura: new Date().toISOString(), monto_apertura: 300.00, fecha_cierre: null, monto_cierre: null, monto_sistema: null, diferencia: null, estado: 'ABIERTO' }
    ];

    return {
        roles,
        usuarios,
        empleados,
        clientes,
        proveedores,
        categorias,
        marcas,
        productos,
        inventario,
        movimientos_inventario,
        compras,
        detalle_compras: detalleCompras,
        metodos_pago: metodosPago,
        cajas,
        ventas,
        detalle_ventas: detalleVentas,
        arqueos_caja,
        configuracion,
        alertas_stock,
        publicidadDiaria
    };
}

function initLocalStorageDB() {
    if (!localStorage.getItem('sigea_roles')) {
        const seed = getSeedData();
        Object.keys(seed).forEach(key => {
            localStorage.setItem(`sigea_${key}`, JSON.stringify(seed[key]));
        });
        console.log("LocalStorage DB inicializada con datos semilla.");
    }
}

// Poblar Supabase de forma automatizada si las tablas maestras están vacías
async function verificarYEjecutarSemillaSupabase() {
    if (!supabaseClient) return;
    try {
        // Verificar si la tabla de productos está vacía
        const { count, error } = await supabaseClient
            .from('productos')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error("Error al consultar productos en Supabase (puede deberse a RLS):", error.message);
            return;
        }

        if (count === 0) {
            console.log("Detectadas tablas de Supabase vacías. Ejecutando seeding automático remoto...");
            const seed = getSeedData();

            // Insertar Maestros en orden de clave foránea
            
            // 1. Clientes
            const clisClean = seed.clientes.map(({ id, ...c }) => c);
            await supabaseClient.from('clientes').insert(clisClean);

            // 2. Proveedores
            const provsClean = seed.proveedores.map(({ id, ...p }) => p);
            await supabaseClient.from('proveedores').insert(provsClean);

            // 3. Categorías
            const catsClean = seed.categorias.map(({ id, ...c }) => c);
            const { data: insertedCats } = await supabaseClient.from('categorias').insert(catsClean).select();

            // 4. Marcas
            const marcasClean = seed.marcas.map(({ id, ...m }) => m);
            const { data: insertedMarcas } = await supabaseClient.from('marcas').insert(marcasClean).select();

            // 5. Productos
            // Mapear ids de categorías y marcas correspondientes en la inserción
            const catMap = insertedCats ? insertedCats.reduce((acc, c, i) => ({ ...acc, [seed.categorias[i].id]: c.id }), {}) : {};
            const marcaMap = insertedMarcas ? insertedMarcas.reduce((acc, m, i) => ({ ...acc, [seed.marcas[i].id]: m.id }), {}) : {};

            const prodsInsert = seed.productos.map(({ id, categoria_id, marca_id, ...p }) => ({
                ...p,
                categoria_id: catMap[categoria_id] || 1,
                marca_id: marcaMap[marca_id] || 1
            }));
            const { data: insertedProds } = await supabaseClient.from('productos').insert(prodsInsert).select();
            const prodMap = insertedProds ? insertedProds.reduce((acc, p, i) => ({ ...acc, [seed.productos[i].id]: p.id }), {}) : {};

            // 6. Inventario (Insertar stock inicial)
            const invsInsert = seed.inventario.map(({ id, producto_id, ...i }) => ({
                ...i,
                producto_id: prodMap[producto_id]
            }));
            await supabaseClient.from('inventario').insert(invsInsert);

            // 7. Ventas e Histórico de 30 días
            // Consultar id de metodos_pago
            const { data: dbMetodos } = await supabaseClient.from('metodos_pago').select('*');
            const { data: dbCajas } = await supabaseClient.from('cajas').select('*');
            const { data: dbClientes } = await supabaseClient.from('clientes').select('*');
            const { data: dbUsuarios } = await supabaseClient.from('usuarios').select('*');

            const mPagoId = dbMetodos && dbMetodos.length > 0 ? dbMetodos[0].id : 1;
            const cajaId = dbCajas && dbCajas.length > 0 ? dbCajas[0].id : 1;
            const userId = dbUsuarios && dbUsuarios.length > 0 ? dbUsuarios[0].id : 1;

            for (let vIdx = 0; vIdx < seed.ventas.length; vIdx++) {
                const oldV = seed.ventas[vIdx];
                const cleanV = {
                    cliente_id: dbClientes && dbClientes[vIdx % dbClientes.length] ? dbClientes[vIdx % dbClientes.length].id : 1,
                    usuario_id: userId,
                    caja_id: cajaId,
                    metodo_pago_id: mPagoId,
                    tipo_comprobante: oldV.tipo_comprobante,
                    serie: oldV.serie,
                    numero: oldV.numero,
                    fecha: oldV.fecha,
                    subtotal: oldV.subtotal,
                    descuento: oldV.descuento,
                    igv: oldV.igv,
                    total: oldV.total,
                    estado: 'EMITIDA'
                };
                
                const { data: savedV } = await supabaseClient.from('ventas').insert(cleanV).select().single();
                if (savedV) {
                    const oldDets = seed.detalle_ventas.filter(dv => dv.venta_id === oldV.id);
                    const cleanDets = oldDets.map(({ id, venta_id, producto_id, ...d }) => ({
                        ...d,
                        venta_id: savedV.id,
                        producto_id: prodMap[producto_id]
                    }));
                    await supabaseClient.from('detalle_ventas').insert(cleanDets);
                }
            }

            // 8. Compras históricas
            const { data: dbProvs } = await supabaseClient.from('proveedores').select('*');
            for (let cIdx = 0; cIdx < seed.compras.length; cIdx++) {
                const oldC = seed.compras[cIdx];
                const cleanC = {
                    proveedor_id: dbProvs && dbProvs[cIdx % dbProvs.length] ? dbProvs[cIdx % dbProvs.length].id : 1,
                    usuario_id: userId,
                    numero_comprobante: oldC.numero_comprobante,
                    fecha: oldC.fecha,
                    subtotal: oldC.subtotal,
                    igv: oldC.igv,
                    total: oldC.total,
                    estado: 'REGISTRADA'
                };
                
                const { data: savedC } = await supabaseClient.from('compras').insert(cleanC).select().single();
                if (savedC) {
                    const oldDets = seed.detalle_compras.filter(dc => dc.compra_id === oldC.id);
                    const cleanDets = oldDets.map(({ id, compra_id, producto_id, ...d }) => ({
                        ...d,
                        compra_id: savedC.id,
                        producto_id: prodMap[producto_id]
                    }));
                    await supabaseClient.from('detalle_compras').insert(cleanDets);
                }
            }

            console.log("¡Seeding automático de base de datos remota Supabase completado con éxito!");
            // Guardar publicidad diaria localmente
            localStorage.setItem('sigea_publicidadDiaria', JSON.stringify(seed.publicidadDiaria));
        }
    } catch (e) {
        console.error("Fallo al ejecutar semilla automatizada en Supabase:", e.message);
    }
}

// Ejecutar inicializadores
initLocalStorageDB();
initSupabase();

function getLocalTable(table) {
    const data = localStorage.getItem(`sigea_${table}`);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error parsing local table sigea_${table}:`, e);
        return [];
    }
}

function saveLocalTable(table, data) {
    localStorage.setItem(`sigea_${table}`, JSON.stringify(data));
}

function getNextId(table) {
    const list = getLocalTable(table);
    if (list.length === 0) return 1;
    return Math.max(...list.map(item => item.id)) + 1;
}

const DB = {
    getConfig: () => dbConfig,
    
    updateConfig: (newConfig) => {
        dbConfig = { ...dbConfig, ...newConfig };
        localStorage.setItem('sigea_db_config', JSON.stringify(dbConfig));
        initSupabase();
        return dbConfig;
    },

    isSupabaseActive: () => {
        return dbConfig.useSupabase && supabaseClient !== null;
    },

    // Autenticación / Login
    login: async (usuario, clave) => {
        if (DB.isSupabaseActive()) {
            try {
                // Ejecutar RPC de validación en Supabase
                const { data, error } = await supabaseClient.rpc('fn_validar_login', {
                    p_usuario: usuario,
                    p_clave_plana: clave
                });
                
                if (error) throw error;
                
                if (data && data.length > 0 && data[0].valido) {
                    const userId = data[0].usuario_id;
                    const rolNombre = data[0].rol_nombre;
                    
                    // Buscar detalles del usuario
                    const { data: userData, error: uError } = await supabaseClient
                        .from('usuarios')
                        .select('*, empleados(*)')
                        .eq('id', userId)
                        .single();

                    if (uError) throw uError;

                    return {
                        success: true,
                        user: {
                            id: userData.id,
                            username: userData.usuario,
                            correo: userData.correo,
                            rol: rolNombre,
                            nombres: userData.empleados ? userData.empleados.nombres : 'Administrador',
                            apellidos: userData.empleados ? userData.empleados.apellidos : ''
                        }
                    };
                }
                return { success: false, message: 'Usuario o contraseña incorrectos en Supabase' };
            } catch (err) {
                console.error("Error al loguearse en Supabase:", err);
                let customMsg = 'Error de conexión con la base de datos remota.';
                if (err.code === 'PGRST116') {
                    customMsg = 'Usuario autenticado pero sin registro RLS permitido o faltan credenciales en tablas. Ejecute script de desactivar RLS.';
                }
                return { success: false, message: customMsg };
            }
        } else {
            // LocalStorage Auth
            const usuarios = getLocalTable('usuarios');
            const empleados = getLocalTable('empleados');
            const roles = getLocalTable('roles');
            
            const user = usuarios.find(u => u.usuario.toLowerCase() === usuario.toLowerCase() && u.clave_hash === clave && u.estado);
            if (user) {
                const rol = roles.find(r => r.id === user.rol_id);
                const emp = empleados.find(e => e.usuario_id === user.id);
                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.usuario,
                        correo: user.correo,
                        rol: rol ? rol.nombre : 'Vendedor',
                        nombres: emp ? emp.nombres : 'Usuario',
                        apellidos: emp ? emp.apellidos : 'Demo'
                    }
                };
            }
            return { success: false, message: 'Usuario o contraseña incorrectos (admin / Admin@123)' };
        }
    },

    // CLIENTES
    getClientes: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('clientes').select('*').eq('estado', true).order('nombres_razon', { ascending: true });
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('clientes').filter(c => c.estado);
        }
    },

    saveCliente: async (cliente) => {
        if (DB.isSupabaseActive()) {
            if (cliente.id) {
                const { data, error } = await supabaseClient.from('clientes').update(cliente).eq('id', cliente.id).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabaseClient.from('clientes').insert(cliente).select().single();
                if (error) throw error;
                return data;
            }
        } else {
            const clientes = getLocalTable('clientes');
            if (cliente.id) {
                const index = clientes.findIndex(c => c.id === cliente.id);
                if (index !== -1) {
                    clientes[index] = { ...clientes[index], ...cliente };
                    saveLocalTable('clientes', clientes);
                    return clientes[index];
                }
            } else {
                const newCliente = { ...cliente, id: getNextId('clientes'), estado: true, created_at: new Date().toISOString() };
                clientes.push(newCliente);
                saveLocalTable('clientes', clientes);
                return newCliente;
            }
        }
    },

    deleteCliente: async (id) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('clientes').update({ estado: false }).eq('id', id).select().single();
            if (error) throw error;
            return data;
        } else {
            const clientes = getLocalTable('clientes');
            const index = clientes.findIndex(c => c.id === id);
            if (index !== -1) {
                clientes[index].estado = false;
                saveLocalTable('clientes', clientes);
                return clientes[index];
            }
            throw new Error("Cliente no encontrado");
        }
    },

    // PROVEEDORES
    getProveedores: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('proveedores').select('*').eq('estado', true).order('razon_social', { ascending: true });
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('proveedores').filter(p => p.estado);
        }
    },

    saveProveedor: async (proveedor) => {
        if (DB.isSupabaseActive()) {
            if (proveedor.id) {
                const { data, error } = await supabaseClient.from('proveedores').update(proveedor).eq('id', proveedor.id).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabaseClient.from('proveedores').insert(proveedor).select().single();
                if (error) throw error;
                return data;
            }
        } else {
            const proveedores = getLocalTable('proveedores');
            if (proveedor.id) {
                const index = proveedores.findIndex(p => p.id === proveedor.id);
                if (index !== -1) {
                    proveedores[index] = { ...proveedores[index], ...proveedor };
                    saveLocalTable('proveedores', proveedores);
                    return proveedores[index];
                }
            } else {
                const newProv = { ...proveedor, id: getNextId('proveedores'), estado: true, created_at: new Date().toISOString() };
                proveedores.push(newProv);
                saveLocalTable('proveedores', proveedores);
                return newProv;
            }
        }
    },

    deleteProveedor: async (id) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('proveedores').update({ estado: false }).eq('id', id).select().single();
            if (error) throw error;
            return data;
        } else {
            const proveedores = getLocalTable('proveedores');
            const index = proveedores.findIndex(p => p.id === id);
            if (index !== -1) {
                proveedores[index].estado = false;
                saveLocalTable('proveedores', proveedores);
                return proveedores[index];
            }
            throw new Error("Proveedor no encontrado");
        }
    },

    // CATEGORIAS Y MARCAS
    getCategorias: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('categorias').select('*').eq('estado', true);
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('categorias');
        }
    },

    getMarcas: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('marcas').select('*').eq('estado', true);
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('marcas');
        }
    },

    // PRODUCTOS
    getProductos: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('productos').select('*, categorias(nombre), marcas(nombre)').eq('estado', true);
            if (error) throw error;
            return data;
        } else {
            const productos = getLocalTable('productos').filter(p => p.estado);
            const categorias = getLocalTable('categorias');
            const marcas = getLocalTable('marcas');
            return productos.map(p => ({
                ...p,
                categorias: categorias.find(c => c.id === p.categoria_id) || { nombre: 'General' },
                marcas: marcas.find(m => m.id === p.marca_id) || { nombre: 'Genérico' }
            }));
        }
    },

    saveProducto: async (producto) => {
        if (DB.isSupabaseActive()) {
            const cleanProd = { ...producto };
            delete cleanProd.categorias;
            delete cleanProd.marcas;
            if (producto.id) {
                const { data, error } = await supabaseClient.from('productos').update(cleanProd).eq('id', producto.id).select().single();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await supabaseClient.from('productos').insert(cleanProd).select().single();
                if (error) throw error;
                await supabaseClient.from('inventario').insert({ producto_id: data.id, stock_actual: 0 });
                return data;
            }
        } else {
            const productos = getLocalTable('productos');
            const inventario = getLocalTable('inventario');
            if (producto.id) {
                const index = productos.findIndex(p => p.id === producto.id);
                if (index !== -1) {
                    productos[index] = { ...productos[index], ...producto };
                    saveLocalTable('productos', productos);
                    return productos[index];
                }
            } else {
                const nextId = getNextId('productos');
                const newProd = { ...producto, id: nextId, estado: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                productos.push(newProd);
                saveLocalTable('productos', productos);

                inventario.push({ id: getNextId('inventario'), producto_id: nextId, stock_actual: 0, ultima_actualizacion: new Date().toISOString() });
                saveLocalTable('inventario', inventario);
                return newProd;
            }
        }
    },

    deleteProducto: async (id) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('productos').update({ estado: false }).eq('id', id).select().single();
            if (error) throw error;
            return data;
        } else {
            const productos = getLocalTable('productos');
            const index = productos.findIndex(p => p.id === id);
            if (index !== -1) {
                productos[index].estado = false;
                saveLocalTable('productos', productos);
                return productos[index];
            }
            throw new Error("Producto no encontrado");
        }
    },

    // INVENTARIO
    getInventario: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('inventario').select('*, productos(id, codigo, nombre, stock_minimo, unidad_medida, categoria_id, categorias(nombre))');
            if (error) throw error;
            return data;
        } else {
            const inventario = getLocalTable('inventario');
            const productos = getLocalTable('productos');
            const categorias = getLocalTable('categorias');
            return inventario.map(i => {
                const prod = productos.find(p => p.id === i.producto_id) || {};
                const cat = categorias.find(c => c.id === prod.categoria_id) || {};
                return {
                    ...i,
                    productos: {
                        ...prod,
                        categorias: cat
                    }
                };
            });
        }
    },

    getMovimientosInventario: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('movimientos_inventario').select('*, productos(nombre, codigo)').order('fecha', { ascending: false });
            if (error) throw error;
            return data;
        } else {
            const movs = getLocalTable('movimientos_inventario');
            const prods = getLocalTable('productos');
            return movs.map(m => ({
                ...m,
                productos: prods.find(p => p.id === m.producto_id) || { nombre: 'Desconocido', codigo: 'S/N' }
            })).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        }
    },

    registrarAjusteInventario: async (productoId, cantidadNueva, motivo, usuarioId) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.rpc('fn_ajuste_inventario', {
                p_producto_id: productoId,
                p_cantidad_nueva: cantidadNueva,
                p_motivo: motivo,
                p_usuario_id: usuarioId
            });
            if (error) throw error;
            return data;
        } else {
            const inventario = getLocalTable('inventario');
            const movs = getLocalTable('movimientos_inventario');
            const iIndex = inventario.findIndex(inv => inv.producto_id === productoId);
            if (iIndex !== -1) {
                const stockAnterior = inventario[iIndex].stock_actual;
                const diferencia = Math.abs(cantidadNueva - stockAnterior);
                if (diferencia === 0) return;

                inventario[iIndex].stock_actual = cantidadNueva;
                inventario[iIndex].ultima_actualizacion = new Date().toISOString();
                saveLocalTable('inventario', inventario);

                const newMov = {
                    id: getNextId('movimientos_inventario'),
                    producto_id: productoId,
                    tipo_movimiento: 'AJUSTE',
                    cantidad: diferencia,
                    stock_anterior: stockAnterior,
                    stock_nuevo: cantidadNueva,
                    motivo: motivo,
                    referencia_tipo: 'AJUSTE_MANUAL',
                    usuario_id: usuarioId,
                    fecha: new Date().toISOString()
                };
                movs.push(newMov);
                saveLocalTable('movimientos_inventario', movs);
                
                DB.evaluarAlertasStockLocal(productoId, cantidadNueva);
            }
        }
    },

    // COMPRAS
    getCompras: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('compras').select('*, proveedores(razon_social), usuarios(usuario)').order('fecha', { ascending: false });
            if (error) throw error;
            return data;
        } else {
            const compras = getLocalTable('compras');
            const provs = getLocalTable('proveedores');
            const users = getLocalTable('usuarios');
            return compras.map(c => ({
                ...c,
                proveedores: provs.find(p => p.id === c.proveedor_id) || { razon_social: 'S/N' },
                usuarios: users.find(u => u.id === c.usuario_id) || { usuario: 'S/N' }
            })).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        }
    },

    getDetalleCompra: async (compraId) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('detalle_compras').select('*, productos(nombre, codigo)').eq('compra_id', compraId);
            if (error) throw error;
            return data;
        } else {
            const det = getLocalTable('detalle_compras').filter(d => d.compra_id === compraId);
            const prods = getLocalTable('productos');
            return det.map(d => ({
                ...d,
                productos: prods.find(p => p.id === d.producto_id) || { nombre: 'Desconocido' }
            }));
        }
    },

    saveCompra: async (compra, detalles) => {
        if (DB.isSupabaseActive()) {
            const { data: compraGuardada, error: cError } = await supabaseClient.from('compras').insert(compra).select().single();
            if (cError) throw cError;

            const detallesInsert = detalles.map(d => ({ ...d, compra_id: compraGuardada.id }));
            const { error: dError } = await supabaseClient.from('detalle_compras').insert(detallesInsert);
            if (dError) throw dError;

            return compraGuardada;
        } else {
            const compras = getLocalTable('compras');
            const detalle_compras = getLocalTable('detalle_compras');
            const inventario = getLocalTable('inventario');
            const movs = getLocalTable('movimientos_inventario');

            const nextCompId = getNextId('compras');
            const nuevaCompra = {
                ...compra,
                id: nextCompId,
                fecha: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            compras.push(nuevaCompra);
            saveLocalTable('compras', compras);

            detalles.forEach(d => {
                const detId = getNextId('detalle_compras');
                const nuevoDet = {
                    ...d,
                    id: detId,
                    compra_id: nextCompId
                };
                detalle_compras.push(nuevoDet);
                saveLocalTable('detalle_compras', detalle_compras);

                const invIdx = inventario.findIndex(i => i.producto_id === d.producto_id);
                let stockAnt = 0;
                if (invIdx !== -1) {
                    stockAnt = inventario[invIdx].stock_actual;
                    inventario[invIdx].stock_actual += d.cantidad;
                    inventario[invIdx].ultima_actualizacion = new Date().toISOString();
                } else {
                    inventario.push({
                        id: getNextId('inventario'),
                        producto_id: d.producto_id,
                        stock_actual: d.cantidad,
                        ultima_actualizacion: new Date().toISOString()
                    });
                }
                saveLocalTable('inventario', inventario);

                movs.push({
                    id: getNextId('movimientos_inventario'),
                    producto_id: d.producto_id,
                    tipo_movimiento: 'ENTRADA',
                    cantidad: d.cantidad,
                    stock_anterior: stockAnt,
                    stock_nuevo: stockAnt + d.cantidad,
                    motivo: 'Ingreso por compra',
                    referencia_tipo: 'COMPRA',
                    referencia_id: nextCompId,
                    fecha: new Date().toISOString()
                });
                saveLocalTable('movimientos_inventario', movs);

                DB.evaluarAlertasStockLocal(d.producto_id, stockAnt + d.cantidad);
            });

            return nuevaCompra;
        }
    },

    // VENTAS
    getVentas: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('ventas').select('*, clientes(nombres_razon), usuarios(usuario)').order('fecha', { ascending: false });
            if (error) throw error;
            return data;
        } else {
            const ventas = getLocalTable('ventas');
            const clis = getLocalTable('clientes');
            const users = getLocalTable('usuarios');
            return ventas.map(v => ({
                ...v,
                clientes: clis.find(c => c.id === v.cliente_id) || { nombres_razon: 'S/N' },
                usuarios: users.find(u => u.id === v.usuario_id) || { usuario: 'S/N' }
            })).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        }
    },

    getDetalleVenta: async (ventaId) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('detalle_ventas').select('*, productos(nombre, codigo)').eq('venta_id', ventaId);
            if (error) throw error;
            return data;
        } else {
            const det = getLocalTable('detalle_ventas').filter(d => d.venta_id === ventaId);
            const prods = getLocalTable('productos');
            return det.map(d => ({
                ...d,
                productos: prods.find(p => p.id === d.producto_id) || { nombre: 'Desconocido' }
            }));
        }
    },

    getDetallesVentasTodos: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('detalle_ventas').select('*');
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('detalle_ventas');
        }
    },

    saveVenta: async (venta, detalles) => {
        if (DB.isSupabaseActive()) {
            const { data: ventaGuardada, error: vError } = await supabaseClient.from('ventas').insert(venta).select().single();
            if (vError) throw vError;

            const detallesInsert = detalles.map(d => ({ ...d, venta_id: ventaGuardada.id }));
            const { error: dError } = await supabaseClient.from('detalle_ventas').insert(detallesInsert);
            if (dError) throw dError;

            return ventaGuardada;
        } else {
            const ventas = getLocalTable('ventas');
            const detalle_ventas = getLocalTable('detalle_ventas');
            const inventario = getLocalTable('inventario');
            const movs = getLocalTable('movimientos_inventario');

            for (let d of detalles) {
                const inv = inventario.find(i => i.producto_id === d.producto_id);
                if (!inv || inv.stock_actual < d.cantidad) {
                    throw new Error(`Stock insuficiente para el producto ID ${d.producto_id}`);
                }
            }

            const nextVentaId = getNextId('ventas');
            const nuevaVenta = {
                ...venta,
                id: nextVentaId,
                fecha: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            ventas.push(nuevaVenta);
            saveLocalTable('ventas', ventas);

            detalles.forEach(d => {
                const detId = getNextId('detalle_ventas');
                const nuevoDet = {
                    ...d,
                    id: detId,
                    venta_id: nextVentaId
                };
                detalle_ventas.push(nuevoDet);
                saveLocalTable('detalle_ventas', detalle_ventas);

                const invIdx = inventario.findIndex(i => i.producto_id === d.producto_id);
                const stockAnt = inventario[invIdx].stock_actual;
                inventario[invIdx].stock_actual -= d.cantidad;
                inventario[invIdx].ultima_actualizacion = new Date().toISOString();
                saveLocalTable('inventario', inventario);

                movs.push({
                    id: getNextId('movimientos_inventario'),
                    producto_id: d.producto_id,
                    tipo_movimiento: 'SALIDA',
                    cantidad: d.cantidad,
                    stock_anterior: stockAnt,
                    stock_nuevo: stockAnt - d.cantidad,
                    motivo: 'Salida por venta',
                    referencia_tipo: 'VENTA',
                    referencia_id: nextVentaId,
                    fecha: new Date().toISOString()
                });
                saveLocalTable('movimientos_inventario', movs);

                DB.evaluarAlertasStockLocal(d.producto_id, stockAnt - d.cantidad);
            });

            return nuevaVenta;
        }
    },

    evaluarAlertasStockLocal: (productoId, nuevoStock) => {
        const productos = getLocalTable('productos');
        const alertas = getLocalTable('alertas_stock');
        const prod = productos.find(p => p.id === productoId);
        if (!prod) return;

        let filteredAlertas = alertas.filter(a => !(a.producto_id === productoId && a.estado === 'PENDIENTE'));

        if (nuevoStock === 0) {
            filteredAlertas.push({
                id: getNextId('alertas_stock'),
                producto_id: productoId,
                tipo_alerta: 'STOCK_AGOTADO',
                mensaje: `El producto ${prod.nombre} se ha agotado.`,
                estado: 'PENDIENTE',
                fecha: new Date().toISOString()
            });
        } else if (nuevoStock <= prod.stock_minimo) {
            filteredAlertas.push({
                id: getNextId('alertas_stock'),
                producto_id: productoId,
                tipo_alerta: 'STOCK_BAJO',
                mensaje: `El producto ${prod.nombre} está por debajo del stock mínimo (${prod.stock_minimo}).`,
                estado: 'PENDIENTE',
                fecha: new Date().toISOString()
            });
        }

        saveLocalTable('alertas_stock', filteredAlertas);
    },

    // ALERTAS STOCK
    getAlertasStock: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('alertas_stock').select('*, productos(nombre, codigo)').eq('estado', 'PENDIENTE').order('fecha', { ascending: false });
            if (error) throw error;
            return data;
        } else {
            const alertas = getLocalTable('alertas_stock').filter(a => a.estado === 'PENDIENTE');
            const prods = getLocalTable('productos');
            return alertas.map(a => ({
                ...a,
                productos: prods.find(p => p.id === a.producto_id) || { nombre: 'Desconocido' }
            })).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        }
    },

    resolverAlertaStock: async (alertaId) => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('alertas_stock').update({ estado: 'ATENDIDA' }).eq('id', alertaId).select().single();
            if (error) throw error;
            return data;
        } else {
            const alertas = getLocalTable('alertas_stock');
            const idx = alertas.findIndex(a => a.id === alertaId);
            if (idx !== -1) {
                alertas[idx].estado = 'ATENDIDA';
                saveLocalTable('alertas_stock', alertas);
                return alertas[idx];
            }
            throw new Error("Alerta no encontrada");
        }
    },

    getMetodosPago: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('metodos_pago').select('*').eq('estado', true);
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('metodos_pago');
        }
    },

    getCajas: async () => {
        if (DB.isSupabaseActive()) {
            const { data, error } = await supabaseClient.from('cajas').select('*').eq('estado', true);
            if (error) throw error;
            return data;
        } else {
            return getLocalTable('cajas');
        }
    },

    getPublicidadDiaria: async () => {
        const pubData = localStorage.getItem('sigea_publicidadDiaria');
        if (pubData) return JSON.parse(pubData);
        const seed = getSeedData();
        localStorage.setItem('sigea_publicidadDiaria', JSON.stringify(seed.publicidadDiaria));
        return seed.publicidadDiaria;
    },

    savePublicidadDiaria: async (data) => {
        localStorage.setItem('sigea_publicidadDiaria', JSON.stringify(data));
        return data;
    }
};

window.DB = DB;
