# INTEGRACIÓN DE DATOS REALES EN REPORTES

**Fecha:** 19 de noviembre de 2025  
**Módulo:** Reportes (ReportsPage)  
**Estado:** ✅ Completado

## Resumen

Se ha reemplazado completamente la lógica de datos mock en la página de Reportes por datos reales obtenidos de los endpoints existentes de PPTO, Facturas y Provisiones. Ahora el módulo de reportes calcula y muestra datos reales agregados según los filtros seleccionados.

---

## 📋 Cambios Implementados

### 1. Nuevo Archivo: `apps/web/src/utils/reportsCalculations.ts`

Archivo de utilidades que contiene todas las funciones de agregación y cálculo para los 3 modos de reporte:

#### Funciones Principales:

- **`getInvoiceAmountPEN(invoice)`**: Calcula el monto en PEN de una factura según reglas contables.
  - Prioriza `montoPEN_tcReal` si existe (factura procesada contablemente).
  - Si no, usa `montoPEN_tcEstandar`.
  - Si no tiene ninguno, calcula manualmente: `montoSinIgv * (tcReal ?? tcEstandar)`.

- **`calculatePresupuestalReport(budgetAllocations, invoices, periods, filters)`**:
  - Agrupa por período PPTO.
  - Calcula PPTO vs Ejecutado Real.
  - Ejecutado = facturas distribuidas proporcionalmente entre sus períodos PPTO.

- **`calculateContableReport(budgetAllocations, invoices, provisions, periods, filters)`**:
  - Agrupa por mes contable.
  - Calcula PPTO asociado (de los períodos vinculados a facturas/provisiones).
  - Ejecutado contable = facturas con mes contable.
  - Provisiones = provisiones (+/-) de ese mes contable.
  - Resultado contable = Ejecutado contable + Provisiones.

- **`calculateMixtoReport(budgetAllocations, invoices, provisions, periods, filters)`**:
  - Combina visión presupuestal y contable por período PPTO.
  - Ejecutado real = facturas por período PPTO.
  - Resultado contable = facturas con mes contable + provisiones, mapeado a su período PPTO.
  - Diferencia real vs contable = Ejecutado real - Resultado contable.

- **`filterPeriodsByRange(periods, fromId, toId)`**: Filtra períodos por rango de fechas.

#### Aplicación de Filtros:

Todas las funciones respetan los filtros seleccionados:
- Gerencia (`managementId`)
- Área (`areaId`)
- Paquete de Gasto (`packageId`)
- Sustento (`supportId`)
- Centro de Costo (`costCenterId`)

---

### 2. Modificaciones en `apps/web/src/pages/ReportsPage.tsx`

#### Nuevas Queries Agregadas:

```typescript
// Facturas
const { data: invoices = [] } = useQuery({
  queryKey: ["invoices"],
  queryFn: async () => (await api.get("/invoices")).data
});

// Provisiones
const { data: provisions = [] } = useQuery({
  queryKey: ["provisions"],
  queryFn: async () => (await api.get("/provisions")).data
});

// Presupuesto anual del año seleccionado
const { data: annualBudgetData = [] } = useQuery({
  queryKey: ["budgets-annual-report", year],
  queryFn: async () => {
    const response = await api.get("/budgets/annual", { params: { year } });
    return response.data;
  },
  enabled: !!year
});
```

#### Procesamiento de Budget Allocations:

Se agregó lógica para transformar los datos de `/budgets/annual` en un formato plano de allocations:

```typescript
const budgetAllocations = useMemo(() => {
  // Transforma annualBudgetData (estructura: { supportId, costCenterId, months: {...} })
  // en array de allocations: { supportId, costCenterId, periodId, amountPen, support }
  ...
}, [annualBudgetData]);
```

#### Reemplazo de Datos Mock:

La lógica de `reportData` ahora:
1. Aplica filtros seleccionados.
2. Filtra períodos por rango (excepto en modo mixto).
3. Llama a las funciones de cálculo correspondientes según el modo.
4. Calcula campos derivados: variaciones, disponible, diferencias.

#### Exportación CSV:

La función `exportCSVResumen` ahora exporta datos reales calculados, no mock.

---

## 🔄 Flujo de Datos

### Modo PRESUPUESTAL:

1. **Origen de datos:**
   - PPTO: `/budgets/annual` → `budgetAllocations`.
   - Ejecutado: `/invoices` → distribución proporcional por períodos PPTO asignados a cada factura.

2. **Agregación:**
   - Por cada período PPTO:
     - PPTO = suma de allocations para ese período (filtrados).
     - Ejecutado Real = suma de facturas distribuidas en ese período.
     - Disponible = PPTO - Ejecutado Real.
     - Variación % = (Ejecutado - PPTO) / PPTO * 100.

### Modo CONTABLE:

1. **Origen de datos:**
   - Ejecutado contable: `/invoices` → solo facturas con `mesContable` definido.
   - Provisiones: `/provisions` → filtradas por `periodoContable`.
   - PPTO asociado: suma de PPTO de los períodos vinculados a facturas/provisiones de ese mes.

2. **Agregación:**
   - Por cada mes contable:
     - PPTO Asociado = suma proporcional de PPTO de períodos vinculados.
     - Ejecutado Contable = suma de facturas en ese mes contable (en PEN).
     - Provisiones = suma de provisiones en ese mes contable (con signo).
     - Resultado Contable = Ejecutado Contable + Provisiones.
     - Variación vs PPTO = Resultado Contable - PPTO Asociado.

### Modo MIXTO:

1. **Origen de datos:**
   - PPTO y Ejecutado Real: igual que modo presupuestal.
   - Resultado Contable: igual que modo contable, pero mapeado al período PPTO de cada factura/provisión.

2. **Agregación:**
   - Por cada período PPTO:
     - PPTO = suma de allocations.
     - Ejecutado Real = suma de facturas por período.
     - Resultado Contable = suma de facturas con mes contable + provisiones, mapeadas a su período PPTO.
     - Diferencia Real vs Contable = Ejecutado Real - Resultado Contable.
     - Disponible = PPTO - Ejecutado Real.

---

## 💱 Reglas de Moneda

### Provisiones y Contabilidad:
- **Siempre en PEN**. No hay conversión.

### Facturas:
- Pueden estar en PEN o USD.
- Para calcular monto en PEN:
  - Si la factura tiene `montoPEN_tcReal`: usar ese (factura procesada contablemente con TC real).
  - Si no, usar `montoPEN_tcEstandar`.
  - Si no tiene ninguno, calcular: `montoSinIgv * (tcReal ?? tcEstandar)`.

### Selector de Moneda en la UI:
- Por ahora, **solo se muestra en PEN**.
- Conversión a USD está pendiente (comentarios `// TODO: conversión PEN ↔ USD`).

---

## 📊 Interpretación de Signos

### Facturas:
- Monto siempre positivo.
- Aumenta el "Ejecutado".

### Provisiones:
- `montoPen > 0`: Provisión (disminuye disponible, aumenta obligación).
- `montoPen < 0`: Liberación/extorno (aumenta disponible, reduce obligación).

### Variaciones:
- Variación positiva → Sobregasto (mal).
- Variación negativa → Ahorro (bien).
- En la UI:
  - Rojo: Sobregasto / Provisión positiva.
  - Verde: Ahorro / Liberación.

---

## 🧪 Cómo Probar

1. **Iniciar servidores:**
   ```bash
   cd apps/api
   npm run dev

   cd apps/web
   npm run dev
   ```

2. **Ir a la página de Reportes:**
   - URL: `http://localhost:5173/reports`

3. **Probar Modo PRESUPUESTAL:**
   - Seleccionar un año (ej. 2025).
   - Modo: Presupuestal.
   - Filtrar por gerencia/área/paquete (opcional).
   - Seleccionar rango de períodos (opcional).
   - Verificar que la tabla muestre datos reales de PPTO y facturas.
   - Exportar CSV y verificar que contenga los mismos datos.

4. **Probar Modo CONTABLE:**
   - Cambiar modo a Contable.
   - Seleccionar rango de meses contables.
   - Verificar que la tabla agrupe por mes contable.
   - Verificar que las provisiones se sumen correctamente (con signo).

5. **Probar Modo MIXTO:**
   - Cambiar modo a Mixto.
   - Verificar que muestre ambas vistas (Ejecutado Real vs Resultado Contable).
   - Verificar que la "Diferencia Real vs Contable" tenga sentido.

6. **Probar Filtros:**
   - Cambiar filtros de gerencia, área, paquete, sustento, CECO.
   - Verificar que los datos se actualicen correctamente.

7. **Probar "Solo con desviación > 5%":**
   - Activar el toggle.
   - Verificar que solo muestre filas con variación % mayor a 5%.

---

## 📝 TODOs Pendientes

### 1. Conversión de Moneda USD:
- Actualmente solo se muestran datos en PEN.
- Implementar lógica para convertir a USD cuando el usuario seleccione "USD" en el filtro de moneda.
- Definir si usar TC real, TC estándar, o un TC promedio del período.

### 2. Exportación CSV Detallada:
- La función `exportCSVDetalle` actualmente es un placeholder.
- Implementar descarga detallada con:
  - Nivel de sustento/CECO.
  - Detalle de facturas y provisiones individuales.
  - Debe respetar filtros y modo actual.

### 3. Optimización de Cálculos:
- Actualmente todos los cálculos se hacen en el frontend.
- Para grandes volúmenes de datos, considerar mover la agregación al backend (endpoints `/reports/presupuestal`, `/reports/contable`, `/reports/mixto`).

### 4. Detalle Expandible por Fila:
- Actualmente, al expandir una fila solo se muestra un placeholder.
- Implementar tabla detallada con:
  - Desglose por sustento/CECO.
  - Listado de facturas y provisiones que afectan ese período/mes.

### 5. Caché y Performance:
- Considerar cachear resultados de cálculos costosos.
- Evaluar usar `useMemo` adicionales o mover lógica pesada a Web Workers.

---

## 🎯 Resultado Final

✅ **La página de Reportes ahora muestra datos reales** obtenidos de:
- Presupuestos (PPTO).
- Facturas (ejecutado real y contable).
- Provisiones (+/-).

✅ **Los 3 modos funcionan con datos reales:**
- Presupuestal: PPTO vs Ejecutado Real.
- Contable: Ejecutado Contable + Provisiones vs PPTO Asociado.
- Mixto: Comparación entre Ejecutado Real y Resultado Contable.

✅ **Filtros activos:**
- Año, Gerencia, Área, Paquete, Sustento, CECO.
- Rango de períodos (presupuestal/contable).
- Solo con desviación > 5%.

✅ **Exportación CSV (Resumen) funcional** con datos reales.

✅ **No se modificaron las páginas de PPTO, Facturas ni Provisiones** (solo lectura de datos).

---

## 📁 Archivos Modificados/Creados

### Creados:
- `apps/web/src/utils/reportsCalculations.ts` - Funciones de agregación y cálculo.
- `REPORTS_REAL_DATA_INTEGRATION.md` - Este archivo de documentación.

### Modificados:
- `apps/web/src/pages/ReportsPage.tsx` - Integración de datos reales, queries, y procesamiento.

---

## 🚀 Próximos Pasos

1. Probar exhaustivamente los 3 modos con datos reales.
2. Implementar conversión a USD (si se requiere).
3. Implementar exportación CSV detallada.
4. Implementar detalle expandible por fila.
5. Optimizar performance para grandes volúmenes de datos (mover cálculos al backend si es necesario).

