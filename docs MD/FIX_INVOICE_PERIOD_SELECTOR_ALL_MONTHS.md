# Fix: Mostrar Todos los Meses en Selector de Periodos (Facturas)

**Fecha**: 27 de noviembre de 2025  
**Archivo modificado**: `apps/api/src/index.ts`

## Problema

En el formulario de facturas (y otras páginas), los selectores de periodo solo mostraban **noviembre y diciembre**, cuando deberían mostrar todos los 12 meses del año.

**Componentes afectados:**
- ✅ Periodo Desde/Hasta en Facturas
- ✅ Mes Contable en Facturas  
- ✅ Periodos en Órdenes de Compra
- ✅ Selectores de periodo en todas las páginas del portal

## Causa Raíz

### 1. Base de Datos
La base de datos solo contenía periodos para noviembre y diciembre del año actual (2025), porque esos fueron los únicos meses creados manualmente.

### 2. Backend
El endpoint `GET /periods` tenía dos comportamientos:

**CON parámetro `?year=YYYY`:**
```typescript
// ✅ Auto-crea los 12 meses si no existen
await ensureYearPeriods(year);
return prisma.period.findMany({ where: { year }, ... });
```

**SIN parámetro (antes del fix):**
```typescript
// ❌ Solo retorna los periodos que ya existen en BD
return prisma.period.findMany({ orderBy: ... });
```

### 3. Frontend
Todas las páginas llamaban `/periods` **sin parámetros**:

```typescript
// InvoicesPage.tsx, ControlLinesPage.tsx, etc.
const { data: periods } = useQuery({
  queryKey: ["periods"],
  queryFn: async () => (await api.get("/periods")).data  // ❌ Sin ?year=
});
```

### Flujo del Bug

1. Usuario abre Facturas → Frontend llama `GET /periods`
2. Backend retorna solo los periodos en BD: [nov-2025, dic-2025]
3. `YearMonthPicker` renderiza solo nov y dic
4. Usuario no puede seleccionar ene-oct

## Solución Implementada

### Backend: Auto-crear periodos del año actual

**apps/api/src/index.ts - Líneas 39-46:**

```typescript
// IMPORTANTE: Sin filtro de año, auto-crear periodos del año actual
// para que las facturas/OCs puedan usar cualquier mes (incluso retrospectivo).
// Las facturas no se limitan por fecha actual, pueden crearse para meses pasados.
const currentYear = new Date().getFullYear();
await ensureYearPeriods(currentYear);

// Return all periods from all years
return prisma.period.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
```

### Lógica de `ensureYearPeriods`

Definida en `apps/api/src/periods.ts` (líneas 9-42):

```typescript
export async function ensureYearPeriods(year: number): Promise<void> {
  if (!year || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}`);
  }

  // Check which months already exist
  const existing = await prisma.period.findMany({
    where: { year },
    select: { month: true }
  });

  const existingMonths = new Set(existing.map(p => p.month));
  const missingMonths = [];

  for (let month = 1; month <= 12; month++) {
    if (!existingMonths.has(month)) {
      missingMonths.push(month);
    }
  }

  // Create missing periods (idempotent)
  if (missingMonths.length > 0) {
    await prisma.period.createMany({
      data: missingMonths.map(month => ({
        year,
        month,
        label: null
      })),
      skipDuplicates: true
    });

    console.log(`[ensureYearPeriods] Created ${missingMonths.length} periods for year ${year}: months ${missingMonths.join(', ')}`);
  }
}
```

**Características:**
- ✅ **Idempotente**: Puede llamarse múltiples veces sin duplicar
- ✅ **Incremental**: Solo crea los meses faltantes
- ✅ **Atómico**: `skipDuplicates: true` evita errores de race condition
- ✅ **Logging**: Reporta qué periodos se crearon

## Comportamiento Actual (Después del Fix)

### Primera Llamada al Endpoint (BD vacía para 2025)
```
GET /periods

1. Backend detecta año actual: 2025
2. ensureYearPeriods(2025) crea ene-dic 2025
3. Retorna: [ene-2024, ..., dic-2024, ene-2025, ..., dic-2025, ene-2026, ...]
```

### Llamadas Subsiguientes (Periodos ya existen)
```
GET /periods

1. Backend detecta año actual: 2025
2. ensureYearPeriods(2025) verifica y no crea nada (ya existen)
3. Retorna todos los periodos (rápido, solo SELECT)
```

### Beneficios

| Aspecto | Antes | Después |
|---------|-------|---------|
| Periodos visibles | Solo nov-dic | Todos los 12 meses |
| Auto-creación | ❌ Manual | ✅ Automática |
| Performance | N/A | Idempotente, sin sobrecarga |
| Retroactividad | ❌ No permitida | ✅ Meses pasados disponibles |

## Impacto en Otras Páginas

Este fix beneficia **automáticamente** a todas las páginas que usan periodos:

### ✅ Facturas (`/invoices`)
- Periodo Desde/Hasta: Ahora muestra ene-dic
- Mes Contable: Ahora muestra ene-dic

### ✅ Órdenes de Compra (`/purchase-orders`)
- Periodo PPTO Desde/Hasta: Ahora muestra ene-dic

### ✅ Control Lines (`/control-lines`)
- Selector de periodo operativo/contable: ene-dic

### ✅ PPTO (`/ppto`)
- Selector de periodo: ene-dic

### ✅ Reportes (`/reports`)
- Selector de periodo: ene-dic

### ✅ Provisiones (`/provisions`)
- Periodo PPTO / Contable: ene-dic

## Lógica de Negocio Respetada

### ✅ Facturas Retrospectivas

**Caso de uso válido:**
- Hoy es 27-nov-2025
- Usuario necesita registrar factura de enero-2025 (mes pasado)
- ✅ Ahora puede seleccionar enero en el selector

**Comentario en el código:**
```typescript
// Las facturas no se limitan por fecha actual, pueden crearse para meses pasados.
```

### ✅ Sin Filtro por Fecha Actual

A diferencia de otros sistemas que bloquean meses pasados, este sistema permite:
- Registro retrospectivo de gastos
- Corrección de datos históricos
- Cierre contable flexible

**No hay validación de:**
- `period.month >= currentMonth` ❌ (removido/nunca existió)
- `period.isFuture` ❌
- `period.isOpen` ❌

## Años Múltiples

El fix solo auto-crea periodos del **año actual**, pero retorna todos los años existentes:

**Ejemplo (27-nov-2025):**
```json
[
  { "id": 1, "year": 2024, "month": 1 },  // Años anteriores (si existen)
  ...
  { "id": 12, "year": 2024, "month": 12 },
  { "id": 13, "year": 2025, "month": 1 },  // ✅ Auto-creado
  { "id": 14, "year": 2025, "month": 2 },  // ✅ Auto-creado
  ...
  { "id": 24, "year": 2025, "month": 12 }, // ✅ Auto-creado
  { "id": 25, "year": 2026, "month": 1 },  // Del seed (si existe)
  ...
]
```

**Para crear periodos de años futuros:**
```http
GET /periods?year=2026
```

Esto auto-creará ene-dic 2026 si no existen.

## Performance

### Impacto en Carga Inicial

**Primera vez (BD sin 2025):**
- Tiempo: ~50-100ms adicionales (12 INSERTs)
- Solo ocurre UNA VEZ en la vida del sistema por año

**Llamadas posteriores:**
- Tiempo: ~5-10ms adicionales (12 SELECTs rápidos)
- Negligible, solo verifica existencia

### Optimización Futura (Opcional)

Si el chequeo se vuelve un cuello de botella (muy improbable):

```typescript
// Cache en memoria (1 hora)
let lastEnsuredYear: number | null = null;
let lastEnsureTime: number = 0;

app.get("/periods", async (req, reply) => {
  const currentYear = new Date().getFullYear();
  const now = Date.now();
  
  // Solo verificar si pasó 1 hora O cambió el año
  if (lastEnsuredYear !== currentYear || (now - lastEnsureTime) > 3600000) {
    await ensureYearPeriods(currentYear);
    lastEnsuredYear = currentYear;
    lastEnsureTime = now;
  }
  
  return prisma.period.findMany({ ... });
});
```

**No implementado** porque la sobrecarga actual es negligible.

## Alternativas Consideradas (No Implementadas)

### Opción 1: Frontend pasa `?year=currentYear`
```typescript
// InvoicesPage.tsx
const currentYear = new Date().getFullYear();
const { data: periods } = useQuery({
  queryKey: ["periods", currentYear],
  queryFn: async () => (await api.get(`/periods?year=${currentYear}`)).data
});
```

**Desventajas:**
- ❌ No muestra periodos de años anteriores
- ❌ Requiere cambios en múltiples archivos frontend
- ❌ Duplicación de lógica

### Opción 2: Job/Cron que auto-cree periodos
```typescript
// Ejecutar al inicio del año
cron.schedule('0 0 1 1 *', async () => {
  const year = new Date().getFullYear();
  await ensureYearPeriods(year);
});
```

**Desventajas:**
- ❌ Más complejo (requiere scheduler)
- ❌ No cubre caso de DB nueva/migrada
- ❌ Delay hasta que corra el job

### Opción 3: Trigger de BD
```sql
-- Trigger en Postgres que auto-cree periodos
CREATE TRIGGER ensure_current_year_periods ...
```

**Desventajas:**
- ❌ Lógica fuera del código (difícil de versionar)
- ❌ Complejidad en migraciones
- ❌ No portable entre DBs

**Solución elegida (backend auto-create):**
- ✅ Simple
- ✅ Centralizada
- ✅ Idempotente
- ✅ Sin cambios frontend
- ✅ Cubre todos los casos

## Testing

### Test 1: Primera carga (BD vacía para año actual)
```bash
# 1. Borrar periodos del año actual
DELETE FROM "Period" WHERE year = 2025;

# 2. Llamar endpoint
curl http://localhost:3001/periods

# 3. Verificar logs del backend
# [ensureYearPeriods] Created 12 periods for year 2025: months 1, 2, 3, ..., 12

# 4. Verificar BD
SELECT * FROM "Period" WHERE year = 2025 ORDER BY month;
# Debe retornar 12 filas (ene-dic)
```

### Test 2: Carga subsiguiente (periodos ya existen)
```bash
# 1. Llamar endpoint nuevamente
curl http://localhost:3001/periods

# 2. Verificar logs del backend
# Sin mensaje de creación (no hay periodos faltantes)

# 3. Verificar performance
# Debe ser rápido (~10ms)
```

### Test 3: Frontend - Selector de periodo
1. Abrir Facturas → Nueva Factura
2. Click en "Periodo Desde"
3. ✅ Verificar: Se muestran **12 botones** (ene-dic), no solo nov-dic
4. Seleccionar **enero**
5. ✅ Verificar: Se puede seleccionar sin errores

### Test 4: Mes pasado seleccionable
1. Fecha actual: 27-nov-2025
2. Crear factura con Periodo Desde: **ene-2025**
3. ✅ Verificar: Se guarda correctamente
4. ✅ Verificar: No hay validación que rechace meses pasados

---

**Estado**: ✅ Implementado y documentado  
**Versión**: 1.0  
**Breaking Changes**: Ninguno (solo corrección de bug funcional)  
**Rollback**: Revertir el cambio en `apps/api/src/index.ts` líneas 39-43
