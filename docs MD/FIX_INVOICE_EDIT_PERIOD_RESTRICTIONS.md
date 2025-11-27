# Fix: Remover Restricciones de Periodos en Modo Edición de Facturas

**Fecha**: 27 de noviembre de 2025  
**Archivo modificado**: `apps/web/src/pages/InvoicesPage.tsx`

## Problema

En la página de Facturas, al **editar** una factura existente, los selectores de "Periodo Desde" y "Periodo Hasta" solo mostraban **noviembre y diciembre**, limitando la selección de periodos.

**Comportamiento incorrecto:**
- ✅ Modo **Creación**: Se mostraban todos los meses (ene-dic) ✅ (ya corregido)
- ❌ Modo **Edición**: Solo se mostraban nov-dic ❌ (ahora corregido)

## Causa Raíz

### Restricciones Basadas en la OC

**Líneas 242-250 (antes del fix):**

```typescript
const periodMinMax = useMemo(() => {
  if (hasOC && selectedOC && selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
    return {
      minId: selectedOC.budgetPeriodFrom.id,  // ❌ Limitaba incluso en edición
      maxId: selectedOC.budgetPeriodTo.id      // ❌ Limitaba incluso en edición
    };
  }
  return { minId: undefined, maxId: undefined };
}, [hasOC, selectedOC]);
```

### Flujo del Bug (Modo Edición)

1. Usuario hace clic en **"Editar"** en una factura existente
2. `openEditForm()` carga `form.ocId` de la factura
3. `selectedOC` se calcula basándose en `form.ocId`
4. Si la OC tiene `budgetPeriodFrom = nov-2025` y `budgetPeriodTo = dic-2025`:
   - `periodMinMax.minId` = ID de nov-2025
   - `periodMinMax.maxId` = ID de dic-2025
5. `YearMonthPicker` deshabilita meses fuera de ese rango
6. Usuario solo ve nov-dic como opciones ❌

### ¿Por Qué en Creación Funcionaba?

En modo **creación**, si no se selecciona una OC (o se usa "Sin OC"):
- `selectedOC` es `null`
- `periodMinMax` retorna `{ minId: undefined, maxId: undefined }`
- Todos los periodos están disponibles ✅

Sin embargo, incluso en creación **con OC**, los periodos estaban limitados al rango de la OC.

## Solución Implementada

### Diferenciar Modo Creación vs Edición

**apps/web/src/pages/InvoicesPage.tsx - Líneas 241-256:**

```typescript
// Min/Max para selector de periodos según OC o global
// IMPORTANTE: Regla de negocio - las facturas pueden usar periodos en retrospectiva.
// Solo aplicamos restricciones de OC en modo CREACIÓN. En modo EDICIÓN, el usuario
// puede seleccionar cualquier periodo del catálogo, sin limitarse a la fecha actual
// ni a los periodos originales de la OC. El cierre contable se gestiona en backend.
const periodMinMax = useMemo(() => {
  // Solo aplicar restricciones de OC si estamos en modo creación
  if (formMode === 'create' && hasOC && selectedOC && selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
    return {
      minId: selectedOC.budgetPeriodFrom.id,
      maxId: selectedOC.budgetPeriodTo.id
    };
  }
  // En modo edición o sin OC: sin restricciones (cualquier periodo disponible)
  return { minId: undefined, maxId: undefined };
}, [formMode, hasOC, selectedOC]);
```

### Cambios Clave

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Dependencias** | `[hasOC, selectedOC]` | `[formMode, hasOC, selectedOC]` |
| **Condición** | `if (hasOC && selectedOC && ...)` | `if (formMode === 'create' && hasOC && ...)` |
| **Modo Edición** | ❌ Aplicaba restricciones de OC | ✅ Sin restricciones (`undefined`) |
| **Modo Creación con OC** | ✅ Aplicaba restricciones de OC | ✅ Aplicaba restricciones de OC |
| **Modo Creación sin OC** | ✅ Sin restricciones | ✅ Sin restricciones |

## Regla de Negocio Aplicada

### ✅ Facturas en Retrospectiva

**Caso de uso válido:**
- Factura creada en marzo-2025 con OC de nov-dic 2025
- Usuario necesita editar la factura y cambiar periodo a enero-2025
- ✅ Ahora puede seleccionar enero sin restricciones

**Comentario en código:**
```typescript
// IMPORTANTE: Regla de negocio - las facturas pueden usar periodos en retrospectiva.
// Solo aplicamos restricciones de OC en modo CREACIÓN. En modo EDICIÓN, el usuario
// puede seleccionar cualquier periodo del catálogo, sin limitarse a la fecha actual
// ni a los periodos originales de la OC. El cierre contable se gestiona en backend.
```

### ✅ Sin Filtros por Fecha Actual

- ❌ **No se valida**: `period.month >= currentMonth`
- ❌ **No se valida**: `period.isFuture`
- ❌ **No se valida**: `period.isOpen`
- ✅ **Backend controla**: Cierre contable (si existe)

## Comportamiento Actual (Después del Fix)

### Modo Creación con OC

```typescript
// Usuario selecciona OC con periodos: nov-2025 a dic-2025
formMode = 'create'
hasOC = true
selectedOC.budgetPeriodFrom = nov-2025
selectedOC.budgetPeriodTo = dic-2025

// Resultado:
periodMinMax = { minId: nov-2025, maxId: dic-2025 }
// ✅ Selector muestra solo nov-dic (guía al usuario al rango de la OC)
```

### Modo Creación sin OC

```typescript
formMode = 'create'
hasOC = false
selectedOC = null

// Resultado:
periodMinMax = { minId: undefined, maxId: undefined }
// ✅ Selector muestra ene-dic completo
```

### Modo Edición (con o sin OC)

```typescript
formMode = 'edit'
hasOC = true (o false, no importa)
selectedOC = cualquier OC

// Resultado:
periodMinMax = { minId: undefined, maxId: undefined }
// ✅ Selector muestra ene-dic completo (sin restricciones)
```

## Diferencias Create vs Edit

### Tabla Comparativa

| Escenario | Modo Creación | Modo Edición |
|-----------|---------------|--------------|
| **Con OC (nov-dic)** | Limita a nov-dic | ✅ Todos los meses |
| **Sin OC** | ✅ Todos los meses | ✅ Todos los meses |
| **Cambiar periodo a ene** | ❌ No permitido (con OC) | ✅ Permitido |
| **Meses pasados** | ❌ No permitido (con OC) | ✅ Permitido |

### Justificación del Diseño

**¿Por qué limitar en creación pero no en edición?**

**Modo Creación con OC:**
- La OC define un rango de periodos presupuestarios
- Guiar al usuario al rango de la OC evita errores
- Es una **sugerencia**, no una restricción absoluta
- Si necesita períodos fuera del rango, puede usar "Sin OC"

**Modo Edición:**
- La factura puede haber sido creada con lógica diferente
- La OC puede haber cambiado después
- Necesitamos flexibilidad para correcciones
- Aplicar restricciones causaría inconsistencias

## Componente YearMonthPicker

### Sin Cambios Necesarios

El componente `YearMonthPicker` **no requiere modificaciones**. Su lógica es correcta:

**apps/web/src/components/YearMonthPicker.tsx - Líneas 115-134:**

```typescript
const isPeriodDisabled = (period: Period) => {
  // Comparar por fecha cronológica (año-mes), no por ID
  if (minId !== undefined) {
    const minPeriod = sortedPeriods.find(p => p.id === minId);
    if (minPeriod) {
      const periodValue = period.year * 100 + period.month;
      const minValue = minPeriod.year * 100 + minPeriod.month;
      if (periodValue < minValue) return true;  // ✅ Deshabilita si está antes del min
    }
  }
  if (maxId !== undefined) {
    const maxPeriod = sortedPeriods.find(p => p.id === maxId);
    if (maxPeriod) {
      const periodValue = period.year * 100 + period.month;
      const maxValue = maxPeriod.year * 100 + maxPeriod.month;
      if (periodValue > maxValue) return true;  // ✅ Deshabilita si está después del max
    }
  }
  return false;  // ✅ Habilitado si no hay restricciones
};
```

**Características:**
- ✅ Si `minId` y `maxId` son `undefined` → **todos los periodos habilitados**
- ✅ Si `minId` y `maxId` están definidos → solo ese rango habilitado
- ✅ No tiene lógica de fecha actual (`new Date()`)
- ✅ No filtra por `isClosed`, `isOpen`, etc.

## Testing

### Test 1: Edición - Ver todos los meses
```bash
Pasos:
1. Ir a Facturas
2. Crear factura con OC que tenga periodos nov-dic 2025
3. Guardar factura
4. Hacer clic en "Editar" en esa factura
5. Abrir selector "Periodo Desde"

Resultado esperado:
✅ Se muestran 12 botones (ene, feb, mar, ..., dic)
✅ Todos los meses son seleccionables (no deshabilitados)
```

### Test 2: Edición - Cambiar a mes anterior
```bash
Pasos:
1. Editar factura existente con periodos nov-dic
2. Cambiar "Periodo Desde" a **marzo 2025**
3. Cambiar "Periodo Hasta" a **mayo 2025**
4. Guardar

Resultado esperado:
✅ Se guarda correctamente
✅ No hay error de validación
✅ Al volver a editar, muestra mar-may seleccionados
```

### Test 3: Creación con OC - Verificar guía
```bash
Pasos:
1. Nueva Factura
2. Seleccionar OC con periodos nov-dic 2025
3. Abrir selector "Periodo Desde"

Resultado esperado:
✅ Solo nov-dic están habilitados (ene-oct deshabilitados)
✅ Esto guía al usuario al rango de la OC
```

### Test 4: Creación sin OC - Todos los meses
```bash
Pasos:
1. Nueva Factura
2. Toggle "Sin OC"
3. Seleccionar Sustento
4. Abrir selector "Periodo Desde"

Resultado esperado:
✅ Se muestran 12 meses habilitados (ene-dic)
✅ Puede seleccionar cualquier mes
```

### Test 5: Verificar que formMode se actualiza correctamente
```bash
Pasos:
1. Nueva Factura → formMode debe ser 'create'
2. Cerrar formulario → formMode debe ser null
3. Editar factura → formMode debe ser 'edit'
4. Cerrar formulario → formMode debe ser null

Verificar en React DevTools o con console.log
```

## Consistencia con Fixes Anteriores

Este fix se complementa con:

### 1. FIX_INVOICE_MES_CONTABLE_CLEAR.md
- **Problema**: No se podía borrar el mes contable
- **Solución**: Enviar `null` explícitamente
- **Relación**: Ambos fixes permiten flexibilidad en campos de periodo/mes

### 2. FIX_YEAR_MONTH_PICKER_POSITIONING.md
- **Problema**: Dropdown mal posicionado
- **Solución**: Corregir cálculo de posición `fixed`
- **Relación**: Mismo componente (`YearMonthPicker`)

### 3. FIX_INVOICE_PERIOD_SELECTOR_ALL_MONTHS.md
- **Problema**: Solo se veían nov-dic en selectores
- **Solución**: Backend auto-crea periodos del año actual
- **Relación**: Fix de backend que habilita este fix de frontend

**Flujo completo:**
1. Backend crea ene-dic 2025 (FIX #3)
2. Frontend recibe todos los periodos
3. Modo creación sin OC: muestra todos (ya funcionaba)
4. Modo edición: muestra todos ✅ (este fix)
5. Dropdown se posiciona bien (FIX #2)
6. Puede limpiar mes contable (FIX #1)

## Alternativas Consideradas (No Implementadas)

### Opción 1: Remover restricciones en ambos modos
```typescript
// Siempre sin restricciones
const periodMinMax = { minId: undefined, maxId: undefined };
```

**Desventajas:**
- ❌ Pierde la guía de la OC en modo creación
- ❌ Usuario puede crear facturas con periodos fuera del rango de la OC sin darse cuenta

### Opción 2: Agregar toggle "Periodos fuera de rango"
```typescript
const [allowOutOfRangePeriods, setAllowOutOfRangePeriods] = useState(false);

const periodMinMax = useMemo(() => {
  if (!allowOutOfRangePeriods && hasOC && selectedOC && ...) {
    return { minId: ..., maxId: ... };
  }
  return { minId: undefined, maxId: undefined };
}, [allowOutOfRangePeriods, ...]);
```

**Desventajas:**
- ❌ Complejidad adicional innecesaria
- ❌ Confunde al usuario con un checkbox más
- ❌ No soluciona el problema de modo edición

### Opción 3: Backend valida restricciones
```typescript
// Backend rechaza periodos fuera del rango de la OC
if (invoice.ocId && invoice.periods.some(p => !isInOcRange(p))) {
  throw new Error("Periodos fuera del rango de la OC");
}
```

**Desventajas:**
- ❌ Inflexible (no permite correcciones)
- ❌ Contradice la regla de negocio (retrospectiva permitida)
- ❌ Errores al editar facturas antiguas

**Solución elegida (diferenciar por modo):**
- ✅ Balancea guía vs flexibilidad
- ✅ Simple (1 línea de código)
- ✅ Respeta regla de negocio
- ✅ Sin breaking changes

## Estado de formMode

El estado `formMode` se maneja correctamente en el código:

**Inicialización:**
```typescript
const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
```

**Al crear:**
```typescript
const openCreateForm = () => {
  resetForm();
  setFormMode('create');  // ✅ Establece modo creación
  setShowForm(true);
};
```

**Al editar:**
```typescript
const openEditForm = (invoice: Invoice) => {
  // ... cargar datos
  setFormMode('edit');  // ✅ Establece modo edición
  setShowForm(true);
};
```

**Al cerrar:**
```typescript
const resetForm = () => {
  // ... limpiar campos
  setFormMode(null);  // ✅ Limpia el modo
};
```

## Archivos No Modificados

- ✅ `apps/web/src/components/YearMonthPicker.tsx` (sin cambios necesarios)
- ✅ `apps/api/src/invoices.ts` (sin cambios necesarios)
- ✅ Otras páginas (no afectadas)

---

**Estado**: ✅ Implementado y documentado  
**Versión**: 1.0  
**Breaking Changes**: Ninguno (solo mejora funcional)  
**Rollback**: Revertir líneas 246-256 de `InvoicesPage.tsx`
