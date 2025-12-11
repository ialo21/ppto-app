# ✅ ESTADO ACTUAL - RPPTO Implementado y Listo

## 🎉 Backend 100% Completo y Funcionando

### ✅ Base de Datos
- Migración aplicada exitosamente
- Campo `budgetType` agregado a tabla `BudgetAllocation`
- Índices creados correctamente
- Todos los registros existentes tienen `budgetType='PPTO'`

### ✅ Prisma Client
- Regenerado correctamente
- Errores de TypeScript resueltos
- Tipos actualizados con campo `budgetType`

### ✅ Servidor API
- **Estado**: ✅ CORRIENDO en http://localhost:3001
- Todos los endpoints funcionando:
  - `GET /budgets/annual/summary` - Resumen PPTO/RPPTO
  - `DELETE /budgets/annual/delete` - Eliminar por tipo
  - `GET /reports/dashboard` - Usa RPPTO automáticamente
  - Y todos los demás actualizados

---

## 📋 SIGUIENTE PASO: Implementar Frontend

### Archivo a modificar: `apps/web/src/pages/BudgetPage.tsx`

### Cambios necesarios (en orden):

#### 1. Agregar tipos TypeScript (al inicio del archivo, después de las interfaces existentes)

```typescript
type BudgetType = 'PPTO' | 'RPPTO';

interface BudgetSummary {
  year: number;
  versionId: number;
  ppto: {
    exists: boolean;
    total: number;
    supportsWithBudget: number;
    monthsWithBudget: number;
    avgMonthly: number;
  };
  rppto: {
    exists: boolean;
    total: number;
    supportsWithBudget: number;
    monthsWithBudget: number;
    avgMonthly: number;
  };
  activeBudgetType: BudgetType;
}
```

#### 2. Agregar state para tipo seleccionado (después de los otros useState)

```typescript
// State para tipo de presupuesto seleccionado
const [selectedBudgetType, setSelectedBudgetType] = useState<BudgetType>('PPTO');
```

#### 3. Agregar query para obtener resumen (después de las queries existentes)

```typescript
// Fetch budget summary (PPTO vs RPPTO)
const { data: budgetSummary } = useQuery<BudgetSummary>({
  queryKey: ["budgets-annual-summary", selectedYear],
  queryFn: async () => {
    if (!selectedYear) return null;
    const res = await api.get("/budgets/annual/summary", { 
      params: { year: selectedYear } 
    });
    return res.data;
  },
  enabled: viewMode === "annual" && !!selectedYear
});
```

#### 4. Actualizar annualParams para incluir budgetType

Buscar `annualParams` y modificar:

```typescript
const annualParams = useMemo(() => {
  const params: any = { 
    year: selectedYear,
    budgetType: selectedBudgetType // AGREGAR ESTA LÍNEA
  };
  if (managementId) params.managementId = managementId;
  if (areaId) params.areaId = areaId;
  if (packageId) params.packageId = packageId;
  if (conceptId) params.conceptId = conceptId;
  return params;
}, [selectedYear, selectedBudgetType, managementId, areaId, packageId, conceptId]);
// AGREGAR selectedBudgetType a las dependencias
```

#### 5. Agregar mutation para eliminar presupuesto (junto a las otras mutations)

```typescript
// Mutation para eliminar PPTO o RPPTO
const deleteBudgetMutation = useMutation({
  mutationFn: async ({ year, budgetType }: { year: number; budgetType: BudgetType }) => {
    return await api.delete("/budgets/annual/delete", { 
      data: { year, budgetType } 
    });
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

#### 6. Actualizar saveAnnualMutation para incluir budgetType

Buscar `saveAnnualMutation` y modificar el `mutationFn`:

```typescript
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
    budgetType: selectedBudgetType // AGREGAR ESTA LÍNEA
  })).data;
},
```

#### 7. Reemplazar las 4 cards actuales (líneas ~1222-1291)

**BUSCAR** la sección que empieza con:
```typescript
{/* Summary Section - KPI Cards (Annual) */}
<div className="mb-6">
```

**REEMPLAZAR** todo el contenido hasta el cierre del `</div>` de las cards con:

```typescript
{/* Summary Section - KPI Cards (Annual) */}
<div className="mb-6 space-y-6">
  {/* Toggle PPTO/RPPTO - Solo si ambos existen */}
  {budgetSummary?.ppto?.exists && budgetSummary?.rppto?.exists && (
    <div className="flex justify-center">
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

  {/* CARDS PPTO */}
  {budgetSummary?.ppto?.exists && (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        PPTO (Original)
        {budgetSummary.activeBudgetType === 'PPTO' && (
          <span className="ml-2 text-xs font-normal text-green-600">● Activo</span>
        )}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total PPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Total PPTO {selectedYear}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <Wallet size={18} className="text-brand-primary" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            S/ {formatNumber(budgetSummary.ppto.total)}
          </div>
        </div>

        {/* Card 2: Sustentos con PPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Sustentos con PPTO
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <FileText size={18} className="text-blue-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            {budgetSummary.ppto.supportsWithBudget}
          </div>
        </div>

        {/* Card 3: Promedio Mensual PPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Promedio Mensual
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <TrendingUp size={18} className="text-green-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            S/ {formatNumber(budgetSummary.ppto.avgMonthly)}
          </div>
        </div>

        {/* Card 4: Meses con PPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Meses con PPTO
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <Calendar size={18} className="text-purple-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            {budgetSummary.ppto.monthsWithBudget} / 12
          </div>
        </div>
      </div>
    </div>
  )}

  {/* CARDS RPPTO - Solo si existe */}
  {budgetSummary?.rppto?.exists && (
    <div>
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        RPPTO (Revisado)
        {budgetSummary.activeBudgetType === 'RPPTO' && (
          <span className="ml-2 text-xs font-normal text-green-600">● Activo en Dashboard</span>
        )}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total RPPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Total RPPTO {selectedYear}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <Wallet size={18} className="text-brand-primary" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            S/ {formatNumber(budgetSummary.rppto.total)}
          </div>
        </div>

        {/* Card 2: Sustentos con RPPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Sustentos con RPPTO
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <FileText size={18} className="text-blue-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            {budgetSummary.rppto.supportsWithBudget}
          </div>
        </div>

        {/* Card 3: Promedio Mensual RPPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Promedio Mensual
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <TrendingUp size={18} className="text-green-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            S/ {formatNumber(budgetSummary.rppto.avgMonthly)}
          </div>
        </div>

        {/* Card 4: Meses con RPPTO */}
        <div className="bg-white border border-brand-border rounded-xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-xs text-brand-text-secondary uppercase tracking-wide font-semibold mb-1">
                Meses con RPPTO
              </p>
            </div>
            <div className="p-2 rounded-lg bg-brand-background">
              <Calendar size={18} className="text-purple-600" strokeWidth={2} />
            </div>
          </div>
          <div className="text-2xl font-bold text-brand-text-primary">
            {budgetSummary.rppto.monthsWithBudget} / 12
          </div>
        </div>
      </div>
    </div>
  )}
</div>
```

#### 8. Reemplazar el botón "Mostrar detalle" (línea ~1294-1311)

**BUSCAR**:
```typescript
{/* Toggle Detail Table Button */}
<div className="mb-4 flex items-center justify-between">
  <Button
```

**REEMPLAZAR** hasta el cierre del `</div>` con:

```typescript
{/* Botones de detalle y acciones */}
<div className="mb-4 flex items-center justify-between flex-wrap gap-4">
  <div className="flex gap-2">
    {/* Botón detalle PPTO */}
    {budgetSummary?.ppto?.exists && (
      <Button
        variant={showDetailTable && selectedBudgetType === 'PPTO' ? "primary" : "secondary"}
        size="sm"
        onClick={() => {
          setSelectedBudgetType('PPTO');
          setShowDetailTable(!showDetailTable || selectedBudgetType !== 'PPTO');
        }}
        className="flex items-center gap-2"
      >
        {showDetailTable && selectedBudgetType === 'PPTO' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
        className="flex items-center gap-2"
      >
        {showDetailTable && selectedBudgetType === 'RPPTO' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {showDetailTable && selectedBudgetType === 'RPPTO' ? "Ocultar" : "Mostrar"} detalle de RPPTO
      </Button>
    )}
  </div>

  {/* Botones de eliminación */}
  <div className="flex gap-2">
    {budgetSummary?.ppto?.exists && (
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (confirm(`¿Eliminar todo el PPTO del año ${selectedYear}?\n\nEsta acción no se puede deshacer.`)) {
            deleteBudgetMutation.mutate({ year: selectedYear!, budgetType: 'PPTO' });
          }
        }}
        disabled={deleteBudgetMutation.isPending}
      >
        Eliminar PPTO {selectedYear}
      </Button>
    )}
    
    {budgetSummary?.rppto?.exists && (
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (confirm(`¿Eliminar todo el RPPTO del año ${selectedYear}?\n\nEl sistema volverá a usar PPTO como referencia.`)) {
            deleteBudgetMutation.mutate({ year: selectedYear!, budgetType: 'RPPTO' });
          }
        }}
        disabled={deleteBudgetMutation.isPending}
      >
        Eliminar RPPTO {selectedYear}
      </Button>
    )}
  </div>

  {showDetailTable && (
    <div className="text-sm text-slate-600 w-full sm:w-auto">
      {filteredAnnualRows.length} fila{filteredAnnualRows.length !== 1 ? 's' : ''}
      {debouncedSearch && ` para "${debouncedSearch}"`}
      <span className="ml-2 font-medium">
        ({selectedBudgetType})
      </span>
    </div>
  )}
</div>
```

#### 9. Verificar imports necesarios

Asegúrate de que estos imports estén en el archivo:

```typescript
import { formatNumber } from "../utils/numberFormat";
```

---

## 🧪 Probar la Implementación

### Test 1: Sin RPPTO (Estado inicial)
1. Abrir http://localhost:5173
2. Ir a página PPTO, vista ANUAL
3. **Verificar**: Solo aparecen 4 cards de PPTO
4. **Verificar**: Solo hay botón "Mostrar detalle de PPTO"

### Test 2: Cargar RPPTO manualmente
Ejecutar en la consola del navegador (F12):
```javascript
// Cargar RPPTO de prueba para 2025
fetch('http://localhost:3001/budgets/annual/batch', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    budgetType: 'RPPTO',
    changes: [
      { supportId: 1, costCenterId: 1, periodId: 1, amountPen: 50000 },
      { supportId: 1, costCenterId: 1, periodId: 2, amountPen: 55000 }
    ]
  })
})
```

3. Refrescar la página
4. **Verificar**: Aparecen 8 cards (4 PPTO + 4 RPPTO)
5. **Verificar**: Aparece toggle "Ver PPTO / Ver RPPTO"
6. **Verificar**: RPPTO tiene indicador "● Activo en Dashboard"
7. **Verificar**: Aparecen 2 botones de detalle
8. **Verificar**: Aparecen 2 botones de eliminación

### Test 3: Cambiar entre vistas
1. Click en toggle "Ver RPPTO"
2. **Verificar**: Tabla muestra datos de RPPTO
3. Click en "Ver PPTO"
4. **Verificar**: Tabla muestra datos de PPTO

### Test 4: Eliminar RPPTO
1. Click en "Eliminar RPPTO 2025"
2. Confirmar
3. **Verificar**: Cards de RPPTO desaparecen
4. **Verificar**: Solo quedan 4 cards de PPTO
5. Ir al Dashboard
6. **Verificar**: Dashboard vuelve a usar PPTO

---

## 📝 Notas Finales

### ✅ Lo que YA funciona (sin cambios en frontend):
- Dashboard usa RPPTO automáticamente cuando existe
- Reportes usan RPPTO automáticamente cuando existe
- API completa y funcionando

### 🔄 Lo que falta (solo frontend):
- Vista ANUAL de PPTO con 8 cards
- Toggle entre PPTO y RPPTO
- Botones de eliminación
- Indicador visual de cuál está activo

### 🎯 Resultado esperado:
Una vez implementado el frontend, el sistema permitirá:
- Ver PPTO y RPPTO lado a lado
- Cambiar entre vistas fácilmente
- Eliminar cualquiera de los dos de forma segura
- Dashboard y Reportes usan RPPTO automáticamente
- Todo sin romper funcionalidad existente

---

## 🚀 ¿Listo para empezar?

1. Abre `apps/web/src/pages/BudgetPage.tsx`
2. Sigue los pasos 1-9 de arriba
3. Guarda el archivo
4. El frontend se actualizará automáticamente (hot reload)
5. Prueba la funcionalidad

**¡Éxito con la implementación!** 🎉
