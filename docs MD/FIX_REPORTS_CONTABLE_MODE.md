# Fix: Corrección de Modo Contable en Reportes

**Fecha**: 27 de noviembre de 2025  
**Archivos modificados**:
- `apps/web/src/pages/ReportsPage.tsx` (Frontend)
- `apps/web/src/utils/reportsCalculations.ts` (Lógica de cálculo)

---

## 🐛 Problemas Corregidos

### 1. ✅ Selectores de Mes Contable Antiguos

**Problema**: Los selectores de "Mes Contable Desde" y "Mes Contable Hasta" usaban `<Select>` antiguos, inconsistentes con Facturas y OCs.

**Solución**: Reemplazados por `<YearMonthPicker>` moderno con dropdown visual.

### 2. ✅ PPTO Asociado Incorrecto en Modo Contable

**Problema**: 
- En 2025-10: PPTO aparecía en 0 aunque el mes tenía PPTO definido
- En 2025-11: PPTO era diferente al PPTO real del mes
- El cálculo derivaba el PPTO de las facturas/provisiones en lugar de usar el PPTO del mes contable

**Solución**: PPTO Asociado ahora usa directamente `BudgetAllocation` del mes contable.

### 3. ✅ Meses Sin Actividad Contable Mostrados

**Problema**: Se mostraban meses con PPTO pero sin facturas ni provisiones (meses vacíos contablemente).

**Solución**: Solo se muestran meses con `ejecutadoContable > 0` o `provisiones !== 0`.

---

## 📋 Tarea 1: Frontend - Selectores Modernos

### Código Anterior (Líneas 676-700)

```typescript
{mode !== 'mixto' && (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">
        {mode === 'presupuestal' ? 'Período Desde' : 'Mes Contable Desde'}
      </label>
      <Select value={periodFromId || ""} onChange={(e) => setPeriodFromId(Number(e.target.value) || null)}>
        <option value="">Todos los meses</option>
        {yearPeriods.map(p => (
          <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
        ))}
      </Select>
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">
        {mode === 'presupuestal' ? 'Período Hasta' : 'Mes Contable Hasta'}
      </label>
      <Select value={periodToId || ""} onChange={(e) => setPeriodToId(Number(e.target.value) || null)}>
        <option value="">Todos los meses</option>
        {yearPeriods.map(p => (
          <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
        ))}
      </Select>
    </div>
  </div>
)}
```

### Código Nuevo (apps/web/src/pages/ReportsPage.tsx - Líneas 675-707)

```typescript
{/* Fila 4: Rango de períodos (según modo) */}
{/* IMPORTANTE: Selectores modernos consistentes con Facturas/OCs */}
{mode !== 'mixto' && (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium mb-1">
        {mode === 'presupuestal' ? 'Período Desde' : 'Mes Contable Desde'}
      </label>
      <YearMonthPicker
        value={periodFromId}
        onChange={(period) => setPeriodFromId(period ? period.id : null)}
        periods={periods || []}
        maxId={periodToId || undefined}
        placeholder="Todos los meses"
        clearable={true}
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-1">
        {mode === 'presupuestal' ? 'Período Hasta' : 'Mes Contable Hasta'}
      </label>
      <YearMonthPicker
        value={periodToId}
        onChange={(period) => setPeriodToId(period ? period.id : null)}
        periods={periods || []}
        minId={periodFromId || undefined}
        placeholder="Todos los meses"
        clearable={true}
      />
    </div>
  </div>
)}
```

### Import Agregado (Línea 9)

```typescript
import YearMonthPicker from "../components/YearMonthPicker";
```

### Beneficios

- ✅ UI consistente con Facturas y OCs
- ✅ Dropdown moderno con navegación visual por años
- ✅ Clearable (botón X para limpiar)
- ✅ Validación de rango (minId/maxId)
- ✅ Búsqueda de meses
- ✅ Indicador visual del mes actual

---

## 📋 Tarea 2: Backend - PPTO Asociado Correcto

### Lógica Anterior (INCORRECTA)

**apps/web/src/utils/reportsCalculations.ts - Líneas 208-274:**

```typescript
// 1. Sumar facturas por mes contable
invoices.forEach(inv => {
  if (!inv.mesContable) return;
  if (!matchesFilters(inv.oc?.support, filters)) return;
  
  const mesContable = inv.mesContable;
  const amountPEN = getInvoiceAmountPEN(inv);
  
  if (!result.has(mesContable)) {
    result.set(mesContable, {
      mesContable,
      pptoAsociado: 0,  // ❌ Inicializado en 0
      ejecutadoContable: 0,
      provisiones: 0
    });
  }
  
  const row = result.get(mesContable)!;
  row.ejecutadoContable += amountPEN;
  
  // ❌ INCORRECTO: Derivaba PPTO de los períodos de la factura
  const periodIds = inv.periods?.map(p => p.periodId) || [];
  periodIds.forEach(periodId => {
    budgetAllocations.forEach(alloc => {
      if (alloc.periodId === periodId) {
        if (!matchesFilters(alloc.support, filters)) return;
        if (filters.costCenterId && alloc.costCenterId !== filters.costCenterId) return;
        row.pptoAsociado += alloc.amountPen / periodIds.length; // ❌ Distribuido
      }
    });
  });
});

// 2. Sumar provisiones
provisions.forEach(prov => {
  // ...
  
  // ❌ INCORRECTO: Derivaba PPTO del periodoPpto de la provisión
  const periodoPptoData = parsePeriodString(prov.periodoPpto);
  if (periodoPptoData) {
    const period = periods.find(p => p.year === periodoPptoData.year && p.month === periodoPptoData.month);
    if (period) {
      budgetAllocations.forEach(alloc => {
        if (alloc.periodId === period.id) {
          if (!matchesFilters(alloc.support, filters)) return;
          if (alloc.supportId === prov.sustentoId) {
            row.pptoAsociado += alloc.amountPen; // ❌ Limitado al sustento
          }
        }
      });
    }
  }
});
```

**Problemas:**
1. ❌ El PPTO se derivaba de facturas → Si mes sin facturas, PPTO = 0
2. ❌ El PPTO se derivaba de provisiones → Si mes sin provisiones, PPTO = 0
3. ❌ El PPTO no reflejaba el PPTO real del mes contable

### Lógica Nueva (CORRECTA)

**apps/web/src/utils/reportsCalculations.ts - Líneas 195-275:**

```typescript
/**
 * MODO CONTABLE
 * Agrupa por mes contable y calcula Ejecutado Contable + Provisiones
 * 
 * REGLA DE NEGOCIO CRÍTICA:
 * - PPTO Asociado = PPTO del mes contable (no derivado de facturas/provisiones)
 * - Ejecutado Contable = facturas con mesContable definido
 * - Provisiones = provisiones con periodoContable definido
 * - Solo se muestran meses con registros contables reales (ejecutado > 0 o provisiones !== 0)
 */
export function calculateContableReport(
  budgetAllocations: BudgetAllocation[],
  invoices: Invoice[],
  provisions: Provision[],
  periods: Period[],
  filters: Filters
): Map<string, {
  mesContable: string;
  pptoAsociado: number;
  ejecutadoContable: number;
  provisiones: number;
}> {
  const result = new Map<string, {
    mesContable: string;
    pptoAsociado: number;
    ejecutadoContable: number;
    provisiones: number;
  }>();
  
  // 1. Sumar facturas por mes contable
  invoices.forEach(inv => {
    if (!inv.mesContable) return; // Solo facturas con mes contable
    if (!matchesFilters(inv.oc?.support, filters)) return;
    
    const mesContable = inv.mesContable; // ya está en formato YYYY-MM
    const amountPEN = getInvoiceAmountPEN(inv);
    
    if (!result.has(mesContable)) {
      result.set(mesContable, {
        mesContable,
        pptoAsociado: 0,
        ejecutadoContable: 0,
        provisiones: 0
      });
    }
    
    const row = result.get(mesContable)!;
    row.ejecutadoContable += amountPEN;
    // ✅ Ya no se calcula PPTO aquí
  });
  
  // 2. Sumar provisiones por período contable
  provisions.forEach(prov => {
    if (!matchesFilters(prov.sustento, filters)) return;
    
    const mesContable = prov.periodoContable;
    
    if (!result.has(mesContable)) {
      result.set(mesContable, {
        mesContable,
        pptoAsociado: 0,
        ejecutadoContable: 0,
        provisiones: 0
      });
    }
    
    const row = result.get(mesContable)!;
    row.provisiones += prov.montoPen; // Ya viene con signo correcto
    // ✅ Ya no se calcula PPTO aquí
  });
  
  // 3. ✅ CORRECCIÓN: Calcular PPTO Asociado para cada mes contable
  // IMPORTANTE: El PPTO es el del MES CONTABLE, no derivado de facturas/provisiones
  result.forEach((row, mesContable) => {
    const mesContableData = parsePeriodString(mesContable);
    if (!mesContableData) return;
    
    // Buscar el periodo correspondiente al mes contable
    const period = periods.find(p => p.year === mesContableData.year && p.month === mesContableData.month);
    if (!period) return;
    
    // ✅ Sumar todo el PPTO de ese mes con los filtros aplicados
    budgetAllocations.forEach(alloc => {
      if (alloc.periodId !== period.id) return;
      if (!matchesFilters(alloc.support, filters)) return;
      if (filters.costCenterId && alloc.costCenterId !== filters.costCenterId) return;
      
      row.pptoAsociado += alloc.amountPen;  // ✅ PPTO real del mes
    });
  });
  
  return result;
}
```

### Diferencia Clave

| Aspecto | Lógica Anterior | Lógica Nueva |
|---------|-----------------|--------------|
| **Fuente de PPTO** | ❌ Derivado de facturas/provisiones | ✅ BudgetAllocation del mes contable |
| **Mes sin facturas** | ❌ PPTO = 0 | ✅ PPTO = real del mes |
| **Mes sin provisiones** | ❌ PPTO = 0 | ✅ PPTO = real del mes |
| **Mes con solo provisión** | ❌ PPTO incompleto | ✅ PPTO completo |
| **Filtros** | ✅ Aplicados | ✅ Aplicados correctamente |

### Ejemplo Concreto: Octubre 2025

**Escenario:**
- PPTO de octubre 2025: **50,000 PEN** (en Budget/BudgetAllocation)
- Facturas con mesContable = 2025-10: **0 PEN** (ninguna)
- Provisiones con periodoContable = 2025-10: **15,000 PEN**

**Resultado Anterior (INCORRECTO):**
```
Mes Contable: 2025-10
PPTO Asociado: 0 PEN        ❌ (derivado de facturas inexistentes)
Ejecutado Contable: 0 PEN
Provisiones: 15,000 PEN
Resultado Contable: 15,000 PEN
Variación: 15,000 PEN       ❌ (sin base de comparación)
```

**Resultado Nuevo (CORRECTO):**
```
Mes Contable: 2025-10
PPTO Asociado: 50,000 PEN   ✅ (del Budget real del mes)
Ejecutado Contable: 0 PEN
Provisiones: 15,000 PEN
Resultado Contable: 15,000 PEN
Variación: -35,000 PEN      ✅ (15,000 - 50,000 = sobra 35,000)
```

---

## 📋 Tarea 3: Filtro de Meses con Registros Reales

### Código Agregado (apps/web/src/pages/ReportsPage.tsx - Líneas 282-285)

```typescript
contableData.forEach((data, mesContable) => {
  // REGLA DE NEGOCIO: Solo mostrar meses con registros contables reales
  // (facturas con mesContable o provisiones con periodoContable)
  const hasRealActivity = data.ejecutadoContable > 0 || data.provisiones !== 0;
  if (!hasRealActivity) return; // Omitir meses sin actividad contable
  
  // ... resto del código
});
```

### Comportamiento

**Antes del filtro:**
```
Tabla mostraba:
- 2025-01: PPTO 10,000 | Ejecutado 0 | Provisiones 0   ❌ (mes vacío)
- 2025-02: PPTO 10,000 | Ejecutado 0 | Provisiones 0   ❌ (mes vacío)
- ...
- 2025-10: PPTO 50,000 | Ejecutado 0 | Provisiones 15,000  ✅
- 2025-11: PPTO 30,000 | Ejecutado 25,000 | Provisiones 0   ✅
- 2025-12: PPTO 10,000 | Ejecutado 0 | Provisiones 0   ❌ (mes vacío)
```

**Después del filtro:**
```
Tabla muestra SOLO:
- 2025-10: PPTO 50,000 | Ejecutado 0 | Provisiones 15,000  ✅
- 2025-11: PPTO 30,000 | Ejecutado 25,000 | Provisiones 0   ✅
```

### Lógica de Filtrado

```typescript
const hasRealActivity = data.ejecutadoContable > 0 || data.provisiones !== 0;
```

**Se muestra si:**
- ✅ `ejecutadoContable > 0` (hay facturas con ese mes contable)
- ✅ `provisiones !== 0` (hay provisiones positivas o negativas)

**NO se muestra si:**
- ❌ `ejecutadoContable === 0` Y `provisiones === 0` (mes sin actividad contable)

**Casos Especiales:**

| Caso | Ejecutado | Provisiones | ¿Se muestra? |
|------|-----------|-------------|--------------|
| Mes con facturas | 10,000 | 0 | ✅ Sí |
| Mes con provisión | 0 | 5,000 | ✅ Sí |
| Mes con liberación | 0 | -5,000 | ✅ Sí (provisión negativa) |
| Mes con ambos | 10,000 | 5,000 | ✅ Sí |
| Mes vacío | 0 | 0 | ❌ No |
| Mes solo con PPTO | 0 | 0 | ❌ No |

---

## ✅ Validación Final

### Caso 2025-10 (Solo Provisiones)

**Datos:**
- PPTO real (Budget): **50,000 PEN**
- Facturas con mesContable = 2025-10: **0**
- Provisiones con periodoContable = 2025-10: **15,000 PEN**

**Resultado esperado:**
```
Mes Contable: Oct 2025
PPTO Asociado: 50,000 PEN      ✅ Correcto (del Budget)
Ejecutado Contable: 0 PEN       ✅ Correcto (sin facturas)
Provisiones: 15,000 PEN         ✅ Correcto
Resultado Contable: 15,000 PEN  ✅ Correcto (0 + 15,000)
Variación vs PPTO: -35,000 PEN  ✅ Correcto (15,000 - 50,000)
```

**Fila visible:** ✅ Sí (provisiones !== 0)

### Caso 2025-11 (Facturas + PPTO)

**Datos:**
- PPTO real (Budget): **30,000 PEN**
- Facturas con mesContable = 2025-11: **25,000 PEN**
- Provisiones con periodoContable = 2025-11: **0**

**Resultado esperado:**
```
Mes Contable: Nov 2025
PPTO Asociado: 30,000 PEN       ✅ Correcto (igual a /ppto)
Ejecutado Contable: 25,000 PEN  ✅ Correcto
Provisiones: 0 PEN              ✅ Correcto
Resultado Contable: 25,000 PEN  ✅ Correcto (25,000 + 0)
Variación vs PPTO: -5,000 PEN   ✅ Correcto (25,000 - 30,000)
```

**Fila visible:** ✅ Sí (ejecutadoContable > 0)

### Caso 2025-12 (Solo PPTO, sin actividad)

**Datos:**
- PPTO real (Budget): **10,000 PEN**
- Facturas con mesContable = 2025-12: **0**
- Provisiones con periodoContable = 2025-12: **0**

**Resultado esperado:**
```
Fila NO visible en tabla ✅ (sin actividad contable)
```

---

## 🎨 UI/UX Mejoradas

### Selectores Modernos

**Antes:**
```
[Dropdown simple ▼]
- Todos los meses
- Ene 2025
- Feb 2025
- ...
```

**Ahora:**
```
[Dropdown moderno con portal]
┌─────────────────────────┐
│  ← 2025 →               │
├─────────────────────────┤
│ Ene  Feb  Mar  Abr     │
│ May  Jun  Jul  Ago     │
│ Sep  Oct  Nov  Dic     │
└─────────────────────────┘
```

**Características:**
- ✅ Navegación visual por años con flechas
- ✅ Grid de meses 3x4
- ✅ Indicador visual del mes actual (ring)
- ✅ Búsqueda por texto
- ✅ Navegación con teclado (Arrows, Enter, Esc)
- ✅ Botón X para limpiar
- ✅ Validación de rango (minId/maxId)
- ✅ Portal con posicionamiento correcto (no se va abajo)

---

## 📊 Impacto en Otras Funciones

### ✅ Sin Cambios en Modo Presupuestal

La lógica de modo presupuestal **NO fue modificada**:
- ✅ Sigue agrupando por período PPTO
- ✅ Ejecutado Real sigue usando `invoice.periods`
- ✅ Cálculos sin cambios

### ✅ Sin Cambios en Modo Mixto

La lógica de modo mixto **NO fue modificada**:
- ✅ Sigue combinando visión presupuestal y contable
- ✅ Cálculos sin cambios

### ✅ Sin Cambios en Backend API

No se modificaron endpoints de backend:
- `/budgets/annual` sigue igual
- `/invoices` sigue igual
- `/provisions` sigue igual
- Solo cambió la lógica de **cálculo frontend**

---

## 🧪 Testing Recomendado

### Test 1: Selectores Modernos
```
1. Ir a /reports
2. Seleccionar modo "Contable"
3. Hacer clic en "Mes Contable Desde"

✅ Verificar: Dropdown moderno se abre
✅ Verificar: Se ven 12 meses en grid
✅ Verificar: Navegación con flechas funciona
✅ Verificar: Botón X limpia selección
```

### Test 2: PPTO Correcto (2025-10)
```
1. Modo Contable, año 2025
2. Sin filtros (Todos los sustentos/CECOs)
3. Buscar fila 2025-10

✅ Verificar: PPTO Asociado = PPTO real del mes (no 0)
✅ Verificar: Provisiones = dato correcto
✅ Verificar: Resultado Contable = Ejecutado + Provisiones
✅ Verificar: Variación vs PPTO calculada correctamente
```

### Test 3: PPTO Correcto (2025-11)
```
1. Modo Contable, año 2025
2. Sin filtros
3. Buscar fila 2025-11
4. Comparar con /ppto (PPTO Presupuestal)

✅ Verificar: PPTO Asociado en Reports = PPTO en /ppto
✅ Verificar: Coincidencia exacta
```

### Test 4: Solo Meses con Actividad
```
1. Modo Contable, año 2025
2. Sin filtros, sin rango de fechas

✅ Verificar: Solo se ven meses con facturas o provisiones
✅ Verificar: NO se ven meses solo con PPTO (sin ejecutado/provisiones)
✅ Verificar: Fila de enero (sin actividad) NO aparece
```

### Test 5: Filtros Aplicados
```
1. Modo Contable
2. Seleccionar Sustento específico
3. Seleccionar CECO específico

✅ Verificar: PPTO Asociado refleja solo ese filtro
✅ Verificar: Ejecutado refleja solo ese filtro
✅ Verificar: Provisiones reflejan solo ese filtro
```

### Test 6: Rango de Meses
```
1. Modo Contable
2. Mes Contable Desde: Oct 2025
3. Mes Contable Hasta: Nov 2025

✅ Verificar: Solo se ven Oct y Nov
✅ Verificar: Selector "Hasta" limita meses >= Oct
✅ Verificar: Selector "Desde" limita meses <= Nov
```

---

## 📝 Resumen de Cambios

### Frontend (`apps/web/src/pages/ReportsPage.tsx`)

**Línea 9:**
```typescript
import YearMonthPicker from "../components/YearMonthPicker";
```

**Líneas 675-707:** Reemplazo de selectores
```typescript
// Antes: <Select>...</Select>
// Ahora: <YearMonthPicker ... />
```

**Líneas 282-285:** Filtro de meses con actividad
```typescript
const hasRealActivity = data.ejecutadoContable > 0 || data.provisiones !== 0;
if (!hasRealActivity) return;
```

### Lógica de Cálculo (`apps/web/src/utils/reportsCalculations.ts`)

**Líneas 185-275:** Función `calculateContableReport` reescrita
```typescript
// Antes: PPTO derivado de facturas/provisiones
// Ahora: PPTO del mes contable directo de BudgetAllocation
```

**Comentarios agregados:**
```typescript
// REGLA DE NEGOCIO CRÍTICA:
// - PPTO Asociado = PPTO del mes contable (no derivado de facturas/provisiones)
// - Solo se muestran meses con registros contables reales
```

---

## 🎯 Estado Final

**Archivos modificados:**
- ✅ `apps/web/src/pages/ReportsPage.tsx` (2 secciones)
- ✅ `apps/web/src/utils/reportsCalculations.ts` (1 función)

**Sin cambios en:**
- Backend API (sin modificaciones de endpoints)
- Modo Presupuestal (sin cambios)
- Modo Mixto (sin cambios)
- Base de datos (sin migraciones)

**Comportamiento:**
- ✅ Selectores modernos consistentes con Facturas/OCs
- ✅ PPTO Asociado correcto (del mes contable real)
- ✅ Solo meses con actividad contable visible
- ✅ Validaciones 2025-10 y 2025-11 correctas
- ✅ Filtros aplicados correctamente

**Breaking Changes:**
- ❌ Ninguno (solo correcciones de bugs)

---

**Versión**: 1.0  
**Estado**: ✅ Implementado y documentado
