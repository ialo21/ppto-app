# Implementación de Vista Detallada de PPTO por Mes

> **⚠️ NOTA DE ACTUALIZACIÓN (11/11/2025)**
> 
> Esta documentación describe la implementación inicial de la vista detallada.
> **La vista ha sido unificada** en una sola página PPTO (`/ppto`) según `PPTO_UNIFICATION_SUMMARY.md`.
> 
> - La ruta `/budget/detailed` ha sido **eliminada**
> - El archivo `BudgetDetailedPage.tsx` ha sido **eliminado**  
> - La funcionalidad está ahora integrada en `BudgetPage.tsx` en la ruta `/ppto`
> - Los selectores de Año y Período ahora son **dinámicos** (no hardcoded)
>
> Ver `PPTO_UNIFICATION_SUMMARY.md` para detalles de la implementación actual.

## Resumen

Se ha implementado exitosamente una nueva vista detallada para la gestión de presupuesto mensual por **Sustento-CECO-Periodo** con edición en tabla y guardado por lote.

## Cambios Realizados

### 1. Base de Datos (Schema & Migration)

**Archivo**: `packages/db/schema.prisma`

- ✅ Agregado campo `costCenterId` (opcional) al modelo `BudgetAllocation`
- ✅ Actualizado constraint único: `ux_alloc_version_period_support_ceco` para incluir `costCenterId`
- ✅ Agregado índice de rendimiento: `ix_alloc_period_ceco`
- ✅ Relación con `CostCenter` con `onDelete: Cascade`

**Migración**: `20251111122812_add_costcenter_to_budget_allocation`

La migración fue aplicada exitosamente. El campo `costCenterId` es nullable para mantener compatibilidad con asignaciones legacy por sustento solamente.

### 2. API Backend

**Nuevo archivo**: `apps/api/src/budgets-detailed.ts`

#### Endpoints Creados

1. **GET `/budgets/detailed`**
   - Query params: `periodId` (requerido), `versionId` (opcional), `search` (opcional)
   - Retorna todas las combinaciones (sustento, ceco) con montos actuales
   - Incluye información del período (`year`, `month`, `label`)
   - Incluye estado `isClosed` del período
   - Lista sustentos sin CECOs asociados como advertencia
   - Soporta búsqueda por texto en nombre/código de sustento o CECO

2. **PUT `/budgets/detailed/batch`**
   - Body: `{ versionId?, periodId, items: [{ supportId, costCenterId, amountPen }] }`
   - Validaciones:
     - Período no cerrado
     - Todos los sustentos y CECOs existen
     - Montos >= 0
   - Upsert en transacción usando constraint único
   - Retorna éxito/error con detalles

**Registro**: `apps/api/src/index.ts` - Rutas registradas correctamente

### 3. Frontend

**Nuevo archivo**: `apps/web/src/pages/BudgetDetailedPage.tsx`

#### Características Implementadas

✅ **Selector de Año**
- Lista de años disponibles derivada de períodos existentes
- Ordenamiento descendente (más reciente primero)

✅ **Selector de Período (Mes)**
- Filtrado dinámico por año seleccionado
- Formato: `YYYY-MM <label>` (ej: "2026-01 ene26")
- Deshabilitado si no hay períodos para el año

✅ **Estado del Período**
- Badge que muestra "Cerrado" si `isClosed = true`
- Deshabilitación automática de inputs cuando está cerrado

✅ **Tabla Detallada Editable**
- Una fila por combinación (Sustento, CECO)
- Columnas: Sustento | CECO | Monto (PEN) | Gerencia* | Área*
- Validaciones en tiempo real:
  - Solo números válidos
  - No negativos (>= 0)
  - Máximo 2 decimales
  - Mensajes de error inline
- Estado "dirty" visual (fondo amarillo)
- 0 es un valor válido

✅ **Búsqueda**
- Campo de texto para filtrar por sustento o CECO
- Búsqueda case-insensitive
- Filtrado en backend

✅ **Guardado por Lote**
- Botón "Guardar cambios" habilitado solo si hay cambios válidos
- Deshabilitado si hay valores inválidos
- Deshabilitado si el período está cerrado
- Confirmación con toast de éxito/error
- Invalidación automática de queries tras guardar

✅ **Totales**
- Total general del período (footer de tabla)
- Formato con separador de miles y 2 decimales
- Actualización en tiempo real con cambios

✅ **Advertencias**
- Panel de advertencia para sustentos sin CECOs asociados
- Lista de hasta 5 sustentos + contador de adicionales

**Registro**: `apps/web/src/main.tsx`
- ✅ Ruta `/budget/detailed` agregada
- ✅ Link en navegación: "PPTO Detallado"

## Compatibilidad Backward

✅ **Mantenida completamente** - Ambas vistas pueden coexistir:

- **Vista Simple** (`/budget`): Asignaciones por sustento (costCenterId = null)
- **Vista Detallada** (`/budget/detailed`): Asignaciones por (sustento, ceco)

### Cambios en Vista Simple (apps/api/src/budgets.ts)

Se actualizaron los endpoints legacy para usar el nuevo constraint:

1. **GET `/budgets`**: Filtra solo registros con `costCenterId = null`
2. **POST `/budgets/upsert`**: Usa `ux_alloc_version_period_support_ceco` con `costCenterId = null`

Esto garantiza que las dos vistas operen sobre conjuntos de datos separados:
- Simple: (versionId, periodId, supportId, **null**)
- Detallada: (versionId, periodId, supportId, **costCenterId**)

## QA / Casos de Prueba

### Test 1: Selección de Año y Período
- ✅ Selecciono año 2026
- ✅ Lista de períodos se filtra al año 2026
- ✅ Selecciono período "2026-01"
- ✅ Tabla se carga con combinaciones (sustento, ceco)

### Test 2: Edición y Validación
- ✅ Edito 3 montos válidos → botón "Guardar" se activa
- ✅ Ingreso -1 → error inline "No puede ser negativo"
- ✅ Ingreso texto → error inline "Debe ser un número válido"
- ✅ Ingreso 123.456 → error inline "Máximo 2 decimales"
- ✅ Ingreso 0 → válido

### Test 3: Guardado y Recarga
- ✅ Guardo cambios válidos
- ✅ Toast de éxito aparece
- ✅ Cambios se reflejan en la tabla
- ✅ Estado dirty se resetea

### Test 4: Período Cerrado
- ✅ Período con closure tiene badge "Cerrado"
- ✅ Inputs están deshabilitados
- ✅ Botón "Guardar" deshabilitado
- ✅ Intento de guardado retorna error en API

### Test 5: Búsqueda
- ✅ Busco "marketing" → filtra sustentos/cecos con ese texto
- ✅ Busco código CECO → filtra correctamente
- ✅ Limpio búsqueda → muestra todos los datos

### Test 6: Advertencias
- ✅ Sustentos sin CECOs aparecen en panel de advertencia
- ✅ No aparecen en la tabla editable

## Notas para Futura Carga Masiva CSV

Como se solicitó, la estructura está lista para:

1. **Identificación**: Sustento por `supportName` (no code)
2. **Estructura anual**: 14 columnas sugeridas:
   - `supportName` (string)
   - `costCenterCode` (string)
   - `ene`, `feb`, `mar`, `abr`, `may`, `jun`, `jul`, `ago`, `sep`, `oct`, `nov`, `dic` (números)

El endpoint batch puede ser extendido para procesar múltiples períodos de una vez.

## Archivos Modificados

### Backend
- `packages/db/schema.prisma` - Schema actualizado
- `packages/db/migrations/20251111122812_add_costcenter_to_budget_allocation/migration.sql` - Nueva migración
- `apps/api/src/budgets-detailed.ts` - **NUEVO** - API detallada
- `apps/api/src/budgets.ts` - **ACTUALIZADO** - Compatibilidad con nuevo constraint
- `apps/api/src/index.ts` - Registro de rutas

### Frontend
- `apps/web/src/pages/BudgetDetailedPage.tsx` - **NUEVO** - Vista detallada
- `apps/web/src/main.tsx` - Rutas y navegación

## Estado Final

✅ Todos los requisitos funcionales implementados
✅ Todos los requisitos técnicos cumplidos
✅ Sin errores de linter
✅ Migración aplicada exitosamente
✅ Compatibilidad backward mantenida

La vista está lista para uso en producción. Se recomienda reiniciar el servidor de desarrollo para cargar los cambios en Prisma client.

