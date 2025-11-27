# Módulo de Reportes - Refactorización Completa ✅

**Fecha:** 18 de Noviembre, 2025  
**Estado:** ✅ Implementación Base Completa (con TODOs para integración backend)

---

## 📋 Resumen

Se ha refactorizado completamente la página de **Reportes** para convertirla en un módulo de tablas con exportación CSV, eliminando gráficos y enfocándose en comparación de PPTO, ejecutado y provisiones en distintos modos de vista.

---

## 🎯 Objetivo

Crear un módulo de reportes que permita:
- Comparar **PPTO, ejecutado y provisiones** en tres modos distintos
- Aplicar **filtros avanzados** (año, gerencia, área, paquete, sustento, CECO, moneda)
- Exportar datos a **CSV** (resumen y detalle)
- Expandir filas para ver **detalle por sustento/CECO**
- Filtrar por **desviaciones** (umbral 5%)

---

## 🗂️ Modos de Reporte Implementados

### 1. Modo PRESUPUESTAL
**Enfoque:** Visión por mes de período PPTO

**Columnas:**
- Mes Período
- PPTO
- Ejecutado Real (facturas asignadas a esos períodos)
- Variación Abs (Ejecutado - PPTO)
- Variación % ((Ejecutado / PPTO) - 1)
- Disponible (PPTO - Ejecutado)

**Lógica:**
- Basado en períodos normales de presupuesto
- Ejecutado = suma de facturas con `periodIds` que incluyen ese período
- Disponible = PPTO - Ejecutado Real

---

### 2. Modo CONTABLE
**Enfoque:** Visión por mes contable (cierre contable)

**Columnas:**
- Mes Contable
- PPTO Asociado (PPTO vinculado a facturas/provisiones de ese mes)
- Ejecutado Contable (facturas con `mesContable` = ese mes)
- Provisiones (+/-) (provisiones con `periodoContable` = ese mes)
- Resultado Contable (Ejecutado Contable + Provisiones)
- Variación vs PPTO (Resultado Contable - PPTO Asociado)

**Lógica:**
- Basado en meses contables
- Provisiones positivas = disminuyen disponible
- Provisiones negativas = liberación (aumentan disponible)
- Resultado Contable = visión de cierre mensual

---

### 3. Modo MIXTO
**Enfoque:** Comparación de visión presupuestal vs contable

**Columnas:**
- Mes Período
- PPTO
- Ejecutado Real (visión presupuestal)
- Resultado Contable (visión contable del mismo período)
- Diferencia Real vs Contable (Ejecutado Real - Resultado Contable)
- Disponible (presupuestal)

**Lógica:**
- Combina ambas visiones en una tabla
- Diferencia positiva = real > contable (posible timing)
- Diferencia negativa = contable > real (provisiones anticipadas)

---

## 🎨 Filtros Implementados

### Filtros Principales
- **Año:** Selector de años disponibles (extraído de períodos)
- **Modo:** Botones para cambiar entre Presupuestal / Contable / Mixto

### Filtros de Catálogos
- **Gerencia:** Dropdown con todas las gerencias
- **Área:** Dropdown filtrado por gerencia seleccionada
- **Paquete de Gasto:** Dropdown con todos los paquetes
- **Sustento:** Dropdown con todos los sustentos
- **Centro de Costo (CECO):** Dropdown con todos los CECOs
- **Moneda:** Selector PEN / USD

### Filtros Adicionales
- **Rango de Períodos:**
  - Modo Presupuestal: "Período Desde" → "Período Hasta"
  - Modo Contable: "Mes Contable Desde" → "Mes Contable Hasta"
  - Modo Mixto: Sin rango (todo el año)

- **Toggle "Solo con desviación > 5%":**
  - Filtra filas donde `|Variación %| > 5%`
  - Útil para identificar desviaciones significativas

---

## 📊 Estructura de Datos

### Tipo `ReportRow`
```typescript
type ReportRow = {
  periodId: number;
  periodLabel: string;
  ppto: number;
  ejecutadoReal: number;
  ejecutadoContable?: number;
  provisiones?: number;
  resultadoContable?: number;
  variacionAbs: number;
  variacionPct: number;
  disponible: number;
  diferenciaRealContable?: number;
};
```

### Cálculos
**Presupuestal:**
- `variacionAbs = ejecutadoReal - ppto`
- `variacionPct = (variacionAbs / ppto) * 100`
- `disponible = ppto - ejecutadoReal`

**Contable:**
- `resultadoContable = ejecutadoContable + provisiones`
- `variacionAbs = resultadoContable - ppto`
- `variacionPct = (variacionAbs / ppto) * 100`

**Mixto:**
- `diferenciaRealContable = ejecutadoReal - resultadoContable`
- `disponible = ppto - ejecutadoReal`

---

## 📤 Exportación CSV

### Exportar CSV (Resumen)
- Exporta las **filas visibles** de la tabla principal
- Respeta filtros activos (año, modo, gerencia, área, etc.)
- Respeta toggle "Solo con desviación"
- Columnas según modo:
  - Presupuestal: Mes, PPTO, Ejecutado Real, Variación Abs, Variación %, Disponible
  - Contable: Mes Contable, PPTO, Ejecutado Contable, Provisiones, Resultado, Variación
  - Mixto: Mes, PPTO, Ejecutado Real, Resultado Contable, Diferencia, Disponible

### Exportar CSV (Detalle)
- **TODO:** Exporta el nivel detallado por sustento/CECO/factura/provisión
- Actualmente genera placeholder
- Requiere integración con backend para obtener datos granulares

**Implementación:**
- Construcción de CSV en memoria (sin dependencias externas)
- Descarga directa en el navegador usando `Blob` y `URL.createObjectURL`
- Nombres de archivo: `reporte_{modo}_{año}_{tipo}.csv`

---

## 🎨 Características UX/UI

### Diseño Visual
- **Estilo consistente** con el resto del portal (PPTO, Facturas, OC, Provisiones)
- Cards con `rounded-2xl`, `shadow-soft`
- Botones con variantes `primary` / `secondary`
- Tablas con hover states y bordes suaves

### Colores Semánticos
- 🔴 **Rojo:** Sobregasto / Provisión positiva
- 🟢 **Verde:** Ahorro / Liberación
- 🟠 **Naranja (Mixto):** Diferencia Real > Contable
- 🔵 **Azul (Mixto):** Diferencia Contable > Real

### Interactividad
- **Expandir/Colapsar filas:** Botón `▶` / `▼` para ver detalle
- **Modo responsive:** Tabla con scroll horizontal interno
- **Variación destacada:** Variación % > 5% en rojo bold

### Leyenda
- Card inferior con explicación de colores según el modo

---

## 🔧 Estructura del Código

**Archivo:** `apps/web/src/pages/ReportsPage.tsx`

### Secciones principales:
1. **Comentarios de documentación** (líneas 1-40)
   - Modos soportados
   - Columnas por modo
   - Lógica de exportación CSV

2. **Tipos TypeScript** (líneas 42-68)
   - `ReportMode`
   - `Period`
   - `ReportRow`

3. **Queries para catálogos** (líneas 70-95)
   - Periods, Managements, Areas, Packages, Supports, Cost Centers

4. **Estados de filtros** (líneas 97-109)
   - Todos los filtros controlados por estado

5. **Lógica de datos** (líneas 111-200)
   - `availableYears`: Años extraídos de períodos
   - `yearPeriods`: Períodos del año seleccionado
   - `filteredAreas`: Áreas filtradas por gerencia
   - `reportData`: Datos mock con cálculos (TODO: integrar backend)
   - `filteredData`: Aplica filtro de desviación
   - `totals`: Suma de totales

6. **Funciones de UI** (líneas 202-230)
   - `toggleRow`: Expandir/colapsar filas
   - `exportCSVResumen`: Genera CSV resumen
   - `exportCSVDetalle`: Genera CSV detalle (placeholder)

7. **Render JSX** (líneas 232-fin)
   - Filtros superiores
   - Tabla principal con columnas dinámicas según modo
   - Filas expandibles
   - Fila de totales
   - Leyenda de colores

---

## 📝 TODOs Pendientes

### Integración Backend (Prioridad Alta)
- [ ] Reemplazar `reportData` mock con llamadas reales al backend
- [ ] Crear/adaptar endpoint para modo Presupuestal
- [ ] Crear/adaptar endpoint para modo Contable
- [ ] Crear/adaptar endpoint para modo Mixto
- [ ] Implementar filtros en el backend (gerencia, área, paquete, sustento, CECO)

### Detalles por Fila (Prioridad Media)
- [ ] Implementar tabla detallada al expandir filas
- [ ] Mostrar facturas asociadas al período/mes contable
- [ ] Mostrar provisiones asociadas
- [ ] Mostrar distribución por sustento/CECO

### Exportación CSV Detallada (Prioridad Media)
- [ ] Implementar exportación detallada con datos granulares
- [ ] Incluir todas las facturas y provisiones del rango
- [ ] Agregar columnas: Sustento, CECO, Tipo (Factura/Provisión), Monto, Detalle

### Conversión de Monedas (Prioridad Baja)
- [ ] Implementar conversión USD ↔ PEN si el filtro de moneda ≠ moneda de los datos
- [ ] Usar tipos de cambio estándar del año

### Optimización (Prioridad Baja)
- [ ] Cache de datos para evitar consultas repetidas
- [ ] Paginación si hay muchos meses/datos
- [ ] Loading states durante carga de datos

---

## 🔄 Cambios Realizados

### Archivos Modificados
- ✅ `apps/web/src/pages/ReportsPage.tsx` - Refactorización completa

### Archivos Nuevos
- ✅ `REPORTS_MODULE_REFACTOR.md` - Esta documentación

---

## 🚀 Cómo Usar

### 1. Acceder al Módulo
- Ir al menú lateral → **Reportes**

### 2. Seleccionar Año y Modo
- Elegir año en el dropdown
- Hacer clic en el botón de modo deseado (Presupuestal / Contable / Mixto)

### 3. Aplicar Filtros (Opcional)
- Seleccionar gerencia, área, paquete, sustento, CECO
- Seleccionar moneda de visualización
- Establecer rango de períodos (si aplica)
- Activar toggle "Solo con desviación" si se desea

### 4. Visualizar Datos
- La tabla se actualiza automáticamente según filtros
- Ver colores para identificar sobregastos/ahorros
- Expandir filas (▶) para ver detalle (cuando esté implementado)

### 5. Exportar CSV
- Clic en "Exportar CSV (Resumen)" → descarga tabla visible
- Clic en "Exportar CSV (Detalle)" → descarga datos granulares (pendiente implementar)

---

## 📊 Ejemplo de Uso

### Caso 1: Reporte Presupuestal Anual
1. Año: 2025
2. Modo: Presupuestal
3. Filtros: Ninguno (todo el año, todas las gerencias)
4. Resultado: Tabla con 12 filas (enero - diciembre)
5. Exportar CSV (Resumen) → `reporte_presupuestal_2025_resumen.csv`

### Caso 2: Reporte Contable con Desviación
1. Año: 2025
2. Modo: Contable
3. Filtros: Gerencia = "TI", Solo con desviación > 5%
4. Resultado: Tabla solo con meses que tuvieron variación > 5%
5. Ver provisiones positivas (rojas) y liberaciones (verdes)

### Caso 3: Reporte Mixto para Comparación
1. Año: 2025
2. Modo: Mixto
3. Filtros: Paquete = "Licencias", Sustento = "Microsoft 365"
4. Resultado: Comparación de visión presupuestal vs contable
5. Identificar diferencias de timing entre registro y contabilización

---

## ✅ Estado Final

| Componente | Estado |
|------------|--------|
| Estructura de página | ✅ Completo |
| Filtros superiores | ✅ Completo |
| Modo Presupuestal (UI) | ✅ Completo |
| Modo Contable (UI) | ✅ Completo |
| Modo Mixto (UI) | ✅ Completo |
| Exportación CSV Resumen | ✅ Completo |
| Exportación CSV Detalle | ⏳ Placeholder (TODO) |
| Integración backend | ⏳ Mock data (TODO) |
| Detalle por fila | ⏳ Placeholder (TODO) |
| Conversión de monedas | ⏳ Pendiente (TODO) |

**Próximos pasos:** Integrar con endpoints backend reales para obtener datos de PPTO, facturas y provisiones según los filtros aplicados.

---

**Fin del documento**

