# texteleria ACAREIA ATELIER
## Sistema Inteligente de Gestión Empresarial (ERP) con Analítica Estadística

Este es un sistema web modular e inteligente de planificación de recursos empresariales (ERP) y análisis estadístico diseñado específicamente para **texteleria ACAREIA ATELIER**. El sistema gestiona las operaciones diarias del negocio (ventas, compras, inventario, clientes, proveedores) y cuenta con un **Motor Estadístico Avanzado** integrado que utiliza los datos reales de la base de datos para realizar análisis descriptivos e inferenciales de nivel académico.

---

## 🚀 Arquitectura Tecnológica

* **Frontend**: HTML5 Semántico, CSS3 Vanilla (diseño oscuro premium, moderno y glassmorphism), y JavaScript ES6 modular.
* **Base de Datos**: PostgreSQL remoto en **Supabase** (22 tablas vinculadas mediante llaves foráneas, triggers de auditoría, funciones almacenadas y vistas de rollup).
* **Motor Estadístico**: Código matemático puro desarrollado en JS, integrando aproximaciones de Gauss (Hart), Chi-Cuadrado (Wilson-Hilferty) y Welch.
* **Gráficos**: Chart.js (gráficos descriptivos, histogramas, ojivas y diagramas de dispersión interactivos).
* **Reportes**: html2pdf.js para compilar y generar expedientes analíticos en formato PDF a nivel de cliente.

---

## 📦 Módulos del Sistema

### 1. Control de Acceso (Login)
* Validación segura de credenciales contra la función remota `fn_validar_login` en Supabase (contraseñas encriptadas mediante `pgcrypto`/`crypt`).
* **Resiliencia de Conexión**: Cuenta con un panel deslizante de configuración (icono de engranaje) que permite cambiar en caliente la URL y las claves de Supabase o restaurar los parámetros de fábrica directamente desde la pantalla de login.

### 2. Dashboard Comercial
* Tarjetas KPI en tiempo real: Ventas del día, compras, utilidades brutas estimadas y alertas de stock crítico.
* Gráficos analíticos de facturación diaria e histórico de ventas del mes.

### 3. Ventas y Checkout
* Carrito de compras interactivo con buscador de productos y control de stock físico.
* Cálculo automatizado de subtotal, IGV (18%), descuentos porcentuales y neto a pagar.
* Descuento automático de stock físico en la tabla `inventario` mediante el trigger de base de datos `trg_salida_venta` antes de confirmar la inserción de detalles.

### 4. Compras y Abastecimiento
* Registro de facturas de proveedores con actualización automatizada del stock e incremento de existencias a través del trigger `trg_entrada_compra`.

### 5. Inventario y Kardex (Movimientos)
* Vista detallada de existencias físicas y stock mínimo.
* Historial Kardex de movimientos (ENTRADAS, SALIDAS, AJUSTES) con motivos y auditoría de usuario.
* Soporte para ajustes manuales de stock mediante la función PL/pgSQL `fn_ajuste_inventario`.

### 6. Clientes y Proveedores (CRUD)
* Control de entidades con validación por tipo de documento (DNI, RUC, CE, Pasaporte) y restricciones de llave única.

### 7. Motor de Analítica Estadística (Corazón del Sistema)
Este módulo ejecuta cálculos científicos sobre la base de datos real:
* **Estadística Descriptiva**: Media, Mediana, Moda (unimodal/multimodal), Desviación Estándar, Varianza, Cuartiles y Rango. Genera tablas de frecuencias agrupadas usando la **Regla de Sturges**, un histograma de frecuencias, curva ojiva y diagrama de caja y bigotes (BoxPlot).
* **Variable Aleatoria Discreta**: Define \(X\) = *"Número de productos vendidos por transacción"* calculando su función de probabilidad \(P(X=x)\) y acumulada \(F(x)\).
* **Distribución Binomial**: Probabilidad de éxito en ventas por categoría con cálculo de factoriales y combinatorias.
* **Distribución de Poisson**: Frecuencia de transacciones por hora con aproximación a la distribución binomial y cálculo de margen de error.
* **Distribución Normal Estándar**: Curva tipificada Gaussiana dibujada dinámicamente en un lienzo Canvas (`Z ~ N(0, 1)`) sombreando el área de probabilidad acumulada para el puntaje Z calculado.
* **Distribuciones Muestrales**: Estimación del error estándar de la media, de la proporción (facturas sobre boletas) y diferencias muestrales.
* **Tamaño Muestral**: Calculadora científica del tamaño de muestra óptimo \(n\) para estimar parámetros en poblaciones finitas e infinitas.
* **Pruebas de Hipótesis (Contraste)**:
  * Prueba de Medias (t de Welch) para evaluar si los descuentos aumentan significativamente el ticket de venta.
  * Prueba de Varianzas (F-Test) para comparar la variabilidad de boletas vs facturas.
  * Prueba de Proporciones (Z-Test de dos proporciones).
  * Explicación teórica interactiva de la prevención de **Error Tipo I (\(\alpha\))** y **Error Tipo II (\(\beta\))**.
* **Prueba Chi-Cuadrado de Independencia (\(\chi^2\))**: Evalúa la relación entre las categorías de producto y los métodos de pago. Genera la tabla de contingencia de frecuencias observadas vs esperadas, grados de libertad y significancia empírica (p-valor).
* **T de Student**: Propiedades y cálculo de límites intervalares para muestras pequeñas (\(n < 30\)).
* **Reporte PDF Académico**: Compila todos los análisis, tablas e interpretaciones de pruebas en un documento A4 listo para su descarga y presentación.

---

## 🛠️ Instalación y Configuración

1. **Requisitos**: 
   * Navegador web moderno (Chrome, Edge, Firefox).
   * Un servidor HTTP local para evitar bloqueos CORS (se recomienda la extensión **Live Server** de VS Code).

2. **Base de Datos (Supabase)**:
   * Accede a tu proyecto en Supabase.
   * Abre la sección **SQL Editor** -> **New Query**.
   * Pega el contenido del script de base de datos de creación de 22 tablas y ejecútalo.
   * Ejecuta el script de desactivación de políticas RLS (`disable_rls.sql`) para otorgar acceso público a los roles anónimos del cliente JS en desarrollo.

3. **Ejecución**:
   * Abre la carpeta del proyecto en tu editor y lanza **Live Server** desde `index.html`.
   * El sistema cargará e iniciará sesión de forma segura.

---

## 🔑 Credenciales de Acceso por Defecto

* **Usuario**: `admin`
* **Contraseña**: `Admin@123`

---

## 🏢 Créditos y Branding
Desarrollado para **texteleria ACAREIA ATELIER** como un sistema avanzado de gestión comercial y modelado estadístico descriptivo e inferencial.
