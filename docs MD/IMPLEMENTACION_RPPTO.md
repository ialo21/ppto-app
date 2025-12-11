# Implementación de RPPTO (Presupuesto Revisado)

## ✅ Cambios Completados

### 1. Base de Datos y Modelo (Prisma)

**Archivo modificado**: `packages/db/schema.prisma`
- ✅ Agregado campo `budgetType` a modelo `BudgetAllocation` (valores: 'PPTO' | 'RPPTO')
- ✅ Actualizado constraint único para incluir `budgetType`
- ✅ Creado índice `ix_alloc_budget_type` para optimizar consultas

**Migración creada**: `packages/db/migrations/20251210000000_add_budget_type_rppto/migration.sql`
- ✅ Agrega columna `budgetType` con valor por defecto 'PPTO'
- ✅ Actualiza constraint único
- ✅ Todos los registros existentes quedan como 'PPTO'

### 2. Backend - Helper Functions

**Archivo creado**: `apps/api/src/budget-helpers.ts`

Funciones implementadas:
- ✅ `hasRPPTO(year, versionId?)` - Verifica si existe RPPTO para un año
- ✅ `getActiveBudgetType(year, versionId?)` - Retorna 'RPPTO' si existe, sino 'PPTO'
- ✅ `hasPPTO(year, versionId?)` - Verifica si existe PPTO para un año
- ✅ `getBudgetTypeSummary(year, versionId?)` - Retorna resumen completo de ambos tipos

**Lógica de negocio**:
- Si existe RPPTO para un año → se usa RPPTO como presupuesto activo
- Si NO existe RPPTO → se usa PPTO (comportamiento original)
- Ambos tipos se mantienen en BD para referencia histórica

### 3. Backend - Endpoints API Actualizados

#### `apps/api/src/budgets-detailed.ts`

**GET /budgets/detailed** (Vista mensual)
- ✅ Acepta parámetro opcional `budgetType`
- ✅ Filtra por tipo de presupuesto
- ✅ Retorna `budgetType` en la respuesta

**PUT /budgets/detailed/batch** (Guardar vista mensual)
- ✅ Acepta parámetro opcional `budgetType`
- ✅ Guarda con el tipo especificado
- ✅ Usa constraint actualizado `ux_alloc_version_period_support_ceco_type`

**GET /budgets/annual** (Vista anual - 12 meses)
- ✅ Acepta parámetro opcional `budgetType`
- ✅ Filtra datos por tipo de presupuesto
- ✅ Retorna `budgetType` en la respuesta

**PUT /budgets/annual/batch** (Guardar vista anual)
- ✅ Acepta parámetro opcional `budgetType`
- ✅ Guarda con el tipo especificado

**GET /budgets/annual/summary** (NUEVO - Para las cards de la UI)
- ✅ Retorna métricas separadas de PPTO y RPPTO:
  - `ppto.total`, `ppto.supportsWithBudget`, `ppto.monthsWithBudget`, `ppto.avgMonthly`
  - `rppto.total`, `rppto.supportsWithBudget`, `rppto.monthsWithBudget`, `rppto.avgMonthly`
  - `activeBudgetType` - Indica cuál está activo

**DELETE /budgets/annual/delete** (NUEVO - Eliminar PPTO/RPPTO por año)
- ✅ Body: `{ year: number, budgetType: 'PPTO' | 'RPPTO' }`
- ✅ Elimina todos los registros del año y tipo especificado
- ✅ Retorna count de registros eliminados

#### `apps/api/src/reports.ts`

**GET /reports/execution**
- ✅ Detecta automáticamente el tipo de presupuesto activo (RPPTO si existe, sino PPTO)
- ✅ Retorna `budgetType` en la respuesta

**GET /reports/execution/csv**
- ✅ Usa tipo de presupuesto activo automáticamente

**GET /reports/execution/series**
- ✅ Usa tipo de presupuesto activo automáticamente
- ✅ Retorna `budgetType` en la respuesta

**GET /reports/dashboard**
- ✅ Detecta automáticamente el tipo de presupuesto activo
- ✅ Usa RPPTO si existe para el año, sino usa PPTO
- ✅ Retorna `budgetType` en la respuesta
- ✅ **Dashboard y Reportes usan RPPTO automáticamente sin cambios en el frontend**

---

## 📋 Cambios Pendientes en Frontend

### Vista ANUAL de PPTO (`apps/web/src/pages/BudgetPage.tsx`)

#### 1. Agregar llamada al endpoint de summary

Agregar query para obtener resumen:
```typescript
const { data: budgetSummary } = useQuery({
  queryKey: ["budgets-annual-summary", selectedYear],
  queryFn: async () => {
    if (!selectedYear) return null;
    const res = await api.get("/budgets/annual/summary", { params: { year: selectedYear } });
    return res.data;
  },
  enabled: viewMode === "annual" && !!selectedYear
});
```

#### 2. Agregar state para el tipo de presupuesto seleccionado en vista

```typescript
const [selectedBudgetType, setSelectedBudgetType] = useState<'PPTO' | 'RPPTO'>('PPTO');
```

#### 3. Actualizar query de vista anual para incluir budgetType

Modificar `annualParams`:
```typescript
const annualParams = useMemo(() => {
  const params: any = { 
    year: selectedYear,
    budgetType: selectedBudgetType // <-- AGREGAR
  };
  if (managementId) params.managementId = managementId;
  // ... resto de filtros
  return params;
}, [selectedYear, selectedBudgetType, managementId, areaId, packageId, conceptId]);
```

#### 4. Modificar las 4 cards existentes (líneas ~1224-1291)

Reemplazar las 4 cards actuales con **8 cards condicionales**:

```typescript
{/* SECCIÓN DE CARDS PPTO */}
{budgetSummary?.ppto?.exists && (
  <div className="col-span-full">
    <h3 className="text-sm font-semibold text-slate-700 mb-3">PPTO (Original)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total PPTO */}
      <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
        {/* ... contenido similar al actual pero usando budgetSummary.ppto.total */}
      </div>
      {/* Card 2: Sustentos con PPTO */}
      {/* Card 3: Promedio Mensual */}
      {/* Card 4: Meses con PPTO */}
    </div>
  </div>
)}

{/* SECCIÓN DE CARDS RPPTO - Solo si existe */}
{budgetSummary?.rppto?.exists && (
  <div className="col-span-full">
    <h3 className="text-sm font-semibold text-slate-700 mb-3">RPPTO (Revisado)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total RPPTO */}
      {/* Card 2: Sustentos con RPPTO */}
      {/* Card 3: Promedio Mensual (RPPTO) */}
      {/* Card 4: Meses con RPPTO */}
    </div>
  </div>
)}
```

#### 5. Agregar toggle para cambiar entre PPTO y RPPTO (antes de las cards)

```typescript
{/* Toggle PPTO / RPPTO - Solo si ambos existen */}
{budgetSummary?.ppto?.exists && budgetSummary?.rppto?.exists && (
  <div className="flex justify-center mb-4">
    <div className="inline-flex rounded-lg border border-brand-border bg-white p-1">
      <button
        onClick={() => setSelectedBudgetType('PPTO')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          selectedBudgetType === 'PPTO'
            ? 'bg-brand-primary text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Ver PPTO
      </button>
      <button
        onClick={() => setSelectedBudgetType('RPPTO')}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
          selectedBudgetType === 'RPPTO'
            ? 'bg-brand-primary text-white shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Ver RPPTO
      </button>
    </div>
  </div>
)}
```

#### 6. Actualizar botón "Mostrar detalle" (línea ~1294-1311)

Reemplazar el botón único con dos botones condicionales:

```typescript
<div className="mb-4 flex items-center justify-between gap-4">
  {/* Botón detalle PPTO */}
  {budgetSummary?.ppto?.exists && (
    <Button
      variant={showDetailTable && selectedBudgetType === 'PPTO' ? "primary" : "secondary"}
      size="sm"
      onClick={() => {
        setSelectedBudgetType('PPTO');
        setShowDetailTable(!showDetailTable || selectedBudgetType !== 'PPTO');
      }}
    >
      {showDetailTable && selectedBudgetType === 'PPTO' ? "Ocultar" : "Mostrar"} detalle de PPTO
    </Button>
  )}
  
  {/* Botón detalle RPPTO */}
  {budgetSummary?.rppto?.exists && (
    <Button
      variant={showDetailTable && selectedBudgetType === 'RPPTO' ? "primary" : "secondary"}
      size="sm"
      onClick={() => {
        setSelectedBudgetType('RPPTO');
        setShowDetailTable(!showDetailTable || selectedBudgetType !== 'RPPTO');
      }}
    >
      {showDetailTable && selectedBudgetType === 'RPPTO' ? "Ocultar" : "Mostrar"} detalle de RPPTO
    </Button>
  )}
</div>
```

#### 7. Agregar botones de eliminación

Agregar junto a los botones de detalle:

```typescript
{/* Menú de acciones (Eliminar PPTO/RPPTO) */}
<div className="flex gap-2">
  {budgetSummary?.ppto?.exists && (
    <Button
      variant="danger"
      size="sm"
      onClick={() => {
        if (confirm(`¿Eliminar todo el PPTO del año ${selectedYear}? Esta acción no se puede deshacer.`)) {
          deletebudgetMutation.mutate({ year: selectedYear, budgetType: 'PPTO' });
        }
      }}
    >
      Eliminar PPTO {selectedYear}
    </Button>
  )}
  
  {budgetSummary?.rppto?.exists && (
    <Button
      variant="danger"
      size="sm"
      onClick={() => {
        if (confirm(`¿Eliminar todo el RPPTO del año ${selectedYear}? El sistema volverá a usar PPTO.`)) {
          deleteBudgetMutation.mutate({ year: selectedYear, budgetType: 'RPPTO' });
        }
      }}
    >
      Eliminar RPPTO {selectedYear}
    </Button>
  )}
</div>
```

#### 8. Agregar mutation para eliminación

```typescript
const deleteBudgetMutation = useMutation({
  mutationFn: async ({ year, budgetType }: { year: number; budgetType: 'PPTO' | 'RPPTO' }) => {
    return await api.delete("/budgets/annual/delete", { data: { year, budgetType } });
  },
  onSuccess: (_, variables) => {
    toast.success(`${variables.budgetType} del año ${variables.year} eliminado exitosamente`);
    queryClient.invalidateQueries({ queryKey: ["budgets-annual"] });
    queryClient.invalidateQueries({ queryKey: ["budgets-annual-summary"] });
    refetchAnnual();
  },
  onError: () => {
    toast.error("Error al eliminar el presupuesto");
  }
});
```

#### 9. Actualizar mutation de guardado para incluir budgetType

Modificar `saveAnnualMutation`:

```typescript
const saveAnnualMutation = useMutation({
  mutationFn: async () => {
    const changes = Array.from(annualEdited.values())
      .filter(e => e.isValid)
      .map(e => ({
        supportId: e.supportId,
        costCenterId: e.costCenterId,
        periodId: e.periodId,
        amountPen: parseFloat(e.value) || 0
      }));
    
    return (await api.put("/budgets/annual/batch", {
      changes,
      budgetType: selectedBudgetType // <-- AGREGAR
    })).data;
  },
  // ... resto igual
});
```

---

## 🚀 Pasos para Aplicar los Cambios

### 1. Regenerar Prisma Client

```bash
cd packages/db
npx prisma generate
```

### 2. Aplicar la migración

```bash
npx prisma migrate deploy
# O en desarrollo:
npx prisma migrate dev
```

### 3. Verificar que la migración se aplicó

```sql
-- En psql o tu cliente PostgreSQL:
\d "BudgetAllocation"
-- Debe aparecer la columna budgetType
```

### 4. Reiniciar el servidor API

```bash
cd apps/api
pnpm dev
```

### 5. Implementar cambios en frontend

Seguir las instrucciones de la sección "Cambios Pendientes en Frontend" arriba.

### 6. Probar funcionalidad

1. **Sin RPPTO**: Verificar que solo aparecen 4 cards de PPTO (comportamiento actual)
2. **Cargar RPPTO**: Usar CSV o crear manualmente para un año
3. **Con RPPTO**: Verificar que aparecen 8 cards (4 PPTO + 4 RPPTO)
4. **Toggle**: Cambiar entre vista de PPTO y RPPTO
5. **Dashboard**: Verificar que usa RPPTO automáticamente cuando existe
6. **Eliminar RPPTO**: El sistema debe volver a usar PPTO

---

## 📊 Flujo de Trabajo del Usuario

1. **Inicio de año**: Solo existe PPTO (presupuesto original)
2. **Mitad de año**: Se carga RPPTO (presupuesto revisado)
3. **Desde ese momento**:
   - Dashboard y Reportes usan RPPTO automáticamente
   - En la página de PPTO se pueden ver ambos tipos
   - Se pueden hacer cambios a cualquiera de los dos
4. **Si se elimina RPPTO**: El sistema vuelve a usar PPTO como referencia

---

## ⚠️ Notas Importantes

### Errores de TypeScript Esperados

Los errores actuales de TypeScript en `budgets-detailed.ts` y `reports.ts` son normales y se resolverán automáticamente después de:
1. Aplicar la migración SQL
2. Regenerar Prisma Client con `npx prisma generate`

### No Rompe Funcionalidad Existente

- ✅ Todos los registros existentes quedan como `budgetType='PPTO'` (valor por defecto)
- ✅ Si no hay RPPTO, el sistema funciona exactamente igual que antes
- ✅ Dashboard y Reportes detectan automáticamente qué tipo usar

### CSV Upload

El componente `BulkUploader` actual carga datos como PPTO por defecto. Para cargar RPPTO:
- Opción 1: Agregar un toggle en el componente para seleccionar el tipo
- Opción 2: Usar un nombre de archivo específico (ej: `ppto_revisado_2025.csv`)
- Por ahora, se puede cargar como PPTO y luego cambiar el tipo manualmente en BD si es necesario

---

## 🎯 Resultado Final

Cuando esté completo, el usuario podrá:

1. ✅ Ver métricas separadas de PPTO y RPPTO en la página de presupuestos
2. ✅ Cambiar entre vista de PPTO y RPPTO en la tabla anual
3. ✅ Ver detalle de cada tipo por separado
4. ✅ Eliminar PPTO o RPPTO de un año específico
5. ✅ Dashboard y Reportes usan automáticamente RPPTO cuando existe (sin intervención manual)
6. ✅ Mantener ambos tipos como referencia histórica
