# Facturas: Refactor Completado ✅

## Fecha: 2025-11-14

## Resumen Ejecutivo

Se ha actualizado el módulo de Facturas para:
1. **Selector de periodos tipo rango** (desde/hasta) coherente con OCs
2. **Distribución por CECO con porcentajes** que suman 100%
3. **Modo "Con OC"**: CECOs y periodos filtrados por OC
4. **Modo "Sin OC"**: Selección de Sustento + buscador de CECO por código
5. **Auto-asignación de 100%** cuando solo hay 1 CECO
6. **Compatibilidad hacia atrás**: conversión automática de porcentajes a montos en el payload

---

## Cambios Implementados

### 1. Frontend - Estados y Datos

#### Nuevos imports
```typescript
import YearMonthPicker from "../components/YearMonthPicker";
```

#### Queries agregados
```typescript
const { data: supports } = useQuery({
  queryKey: ["supports"],
  queryFn: async () => (await api.get("/supports")).data
});
```

#### Estados actualizados
```typescript
const [form, setForm] = useState({
  id: "",
  ocId: "",
  supportId: "",  // NUEVO: para modo sin OC
  docType: "FACTURA",
  numberNorm: "",
  montoSinIgv: "",
  ultimusIncident: "",
  detalle: "",
  proveedor: "",
  moneda: "PEN"
});

// REEMPLAZADO: const [periodIds, setPeriodIds] = useState<number[]>([]);
const [periodFromId, setPeriodFromId] = useState<number | null>(null);
const [periodToId, setPeriodToId] = useState<number | null>(null);

// NUEVO: buscador de CECO
const [cecoSearchCode, setCecoSearchCode] = useState("");
```

### 2. Lógica de Negocio

#### Generación automática de periodIds desde rango
```typescript
const periodIds = useMemo(() => {
  if (!periodFromId || !periodToId || !periods) return [];
  
  const fromPeriod = periods.find((p: any) => p.id === periodFromId);
  const toPeriod = periods.find((p: any) => p.id === periodToId);
  if (!fromPeriod || !toPeriod) return [];
  
  const fromValue = fromPeriod.year * 100 + fromPeriod.month;
  const toValue = toPeriod.year * 100 + toPeriod.month;
  
  return periods
    .filter((p: any) => {
      const pValue = p.year * 100 + p.month;
      return pValue >= fromValue && pValue <= toValue;
    })
    .sort((a: any, b: any) => (a.year * 100 + a.month) - (b.year * 100 + b.month))
    .map((p: any) => p.id);
}, [periodFromId, periodToId, periods]);
```

#### Min/Max para selectores según OC
```typescript
const periodMinMax = useMemo(() => {
  if (hasOC && selectedOC && selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
    return {
      minId: selectedOC.budgetPeriodFrom.id,
      maxId: selectedOC.budgetPeriodTo.id
    };
  }
  return { minId: undefined, maxId: undefined };
}, [hasOC, selectedOC]);
```

#### CECOs disponibles según modo
```typescript
// Support seleccionado (modo sin OC)
const selectedSupport = useMemo(() => {
  if (!form.supportId || hasOC) return null;
  return (supports || []).find((s: any) => s.id === Number(form.supportId));
}, [form.supportId, hasOC, supports]);

// CECOs disponibles
const availableCostCenters = useMemo(() => {
  if (hasOC && selectedOC && selectedOC.costCenters) {
    return selectedOC.costCenters.map(cc => cc.costCenter);
  }
  if (!hasOC && selectedSupport && selectedSupport.costCenters) {
    return selectedSupport.costCenters.map((sc: any) => sc.costCenter);
  }
  return [];
}, [hasOC, selectedOC, selectedSupport]);

// CECOs filtrados por búsqueda de código
const filteredCostCenters = useMemo(() => {
  if (!cecoSearchCode.trim()) return availableCostCenters;
  const searchLower = cecoSearchCode.toLowerCase();
  return availableCostCenters.filter((cc: any) => 
    cc.code?.toLowerCase().includes(searchLower)
  );
}, [availableCostCenters, cecoSearchCode]);
```

#### Distribución de porcentajes
```typescript
// Auto-distribuir porcentajes entre CECOs
const distributePercentages = (cecoIds: number[]) => {
  if (cecoIds.length === 0) return [];
  if (cecoIds.length === 1) {
    return [{ costCenterId: cecoIds[0], percentage: 100 }];
  }
  const perCeco = 100 / cecoIds.length;
  return cecoIds.map(id => ({
    costCenterId: id,
    percentage: Math.round(perCeco * 100) / 100
  }));
};
```

### 3. Validaciones

#### Frontend
```typescript
// Validación frontend
const errors: Record<string, string> = {};
if (hasOC && !form.ocId) errors.ocId = "OC es requerida";
if (!hasOC && !form.supportId) errors.supportId = "Sustento es requerido";
if (!hasOC && !form.proveedor.trim()) errors.proveedor = "Proveedor es requerido";
if (!form.numberNorm.trim()) errors.numberNorm = "Número es requerido";
if (!form.montoSinIgv || Number(form.montoSinIgv) < 0) errors.montoSinIgv = "Monto inválido";
if (!periodFromId || !periodToId) errors.periodIds = "Debe seleccionar rango de periodos (desde → hasta)";
if (periodIds.length === 0) errors.periodIds = "Rango de periodos inválido";
if (allocations.length === 0) errors.allocations = "Debe seleccionar al menos un CECO";

// Validar porcentajes suman 100%
const totalPercent = allocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
if (Math.abs(totalPercent - 100) > 0.01) {
  errors.allocations = `El total de porcentajes debe ser 100% (actualmente: ${totalPercent.toFixed(2)}%)`;
}
```

#### Conversión a montos para backend
```typescript
// Convertir porcentajes a montos para el backend
const montoTotal = Number(form.montoSinIgv);
const allocationsWithAmount = allocations.map(alloc => ({
  costCenterId: alloc.costCenterId,
  amount: Math.round((montoTotal * (alloc.percentage || 0) / 100) * 100) / 100,
  percentage: alloc.percentage
}));

const payload: any = {
  ocId: hasOC ? Number(form.ocId) : undefined,
  docType: form.docType,
  numberNorm: form.numberNorm.trim(),
  montoSinIgv: montoTotal,
  periodIds,
  allocations: allocationsWithAmount,  // Incluye amount Y percentage
  ultimusIncident: form.ultimusIncident.trim() || undefined,
  detalle: form.detalle.trim() || undefined
};
```

### 4. Carga Automática desde OC

```typescript
// Cuando se selecciona OC, auto-cargar periodos y CECOs
useEffect(() => {
  if (hasOC && selectedOC && !form.id) {
    // Auto-cargar rango de periodos (desde/hasta)
    if (selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo) {
      setPeriodFromId(selectedOC.budgetPeriodFrom.id);
      setPeriodToId(selectedOC.budgetPeriodTo.id);
    }

    // Auto-cargar CECOs con distribución de porcentajes
    if (selectedOC.costCenters && selectedOC.costCenters.length > 0) {
      const cecoIds = selectedOC.costCenters.map(cc => cc.costCenterId);
      setAllocations(distributePercentages(cecoIds));
    }
  }
}, [hasOC, selectedOC, form.id]);

// Auto-asignar 100% si solo hay 1 CECO disponible
useEffect(() => {
  if (availableCostCenters.length === 1 && allocations.length === 0 && !form.id) {
    setAllocations([{
      costCenterId: availableCostCenters[0].id,
      percentage: 100
    }]);
  }
}, [availableCostCenters, allocations.length, form.id]);
```

### 5. handleEdit Actualizado

```typescript
onClick={() => {
  setForm({
    id: String(inv.id),
    ocId: inv.ocId ? String(inv.ocId) : "",
    supportId: inv.oc?.support?.id ? String(inv.oc.support.id) : "",
    // ... otros campos
  });
  setHasOC(!!inv.ocId);
  
  // Establecer rango de periodos desde/hasta
  if (inv.periods && inv.periods.length > 0) {
    const sortedPeriods = [...inv.periods].sort((a, b) => {
      const aVal = a.period.year * 100 + a.period.month;
      const bVal = b.period.year * 100 + b.period.month;
      return aVal - bVal;
    });
    setPeriodFromId(sortedPeriods[0].periodId);
    setPeriodToId(sortedPeriods[sortedPeriods.length - 1].periodId);
  }
  
  // Cargar allocations (convertir montos a porcentajes si es necesario)
  const montoTotal = inv.montoSinIgv ? Number(inv.montoSinIgv) : 0;
  setAllocations(
    inv.costCenters?.map(cc => {
      let percentage = cc.percentage ? Number(cc.percentage) : undefined;
      // Si no hay percentage pero hay amount, calcularlo
      if (!percentage && cc.amount && montoTotal > 0) {
        percentage = (Number(cc.amount) / montoTotal) * 100;
      }
      return {
        costCenterId: cc.costCenterId,
        percentage: percentage || 0
      };
    }) || []
  );
}}
```

### 6. UI del Formulario

#### Toggle Con OC / Sin OC
```tsx
<label className="flex items-center gap-2 text-sm font-medium">
  <input
    type="checkbox"
    checked={hasOC}
    onChange={(e) => {
      setHasOC(e.target.checked);
      if (e.target.checked) {
        setForm(f => ({ ...f, supportId: "", proveedor: "", moneda: "PEN" }));
      } else {
        setForm(f => ({ ...f, ocId: "" }));
      }
    }}
    className="rounded"
  />
  Asociar a Orden de Compra
</label>
```

#### Selector de Sustento (modo sin OC)
```tsx
{!hasOC && (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1">Sustento *</label>
    <Select
      value={form.supportId}
      onChange={(e) => {
        handleFormChange("supportId", e.target.value);
        setAllocations([]);  // Limpiar al cambiar sustento
      }}
      className={fieldErrors.supportId ? "border-red-500" : ""}
    >
      <option value="">Selecciona sustento</option>
      {(supports || []).map((sup: any) => (
        <option key={sup.id} value={sup.id}>{sup.name}</option>
      ))}
    </Select>
  </div>
)}
```

#### Selector de Periodos (rango)
```tsx
{/* Periodo Desde */}
<div>
  <label className="block text-sm font-medium mb-1">Periodo Desde *</label>
  <YearMonthPicker
    value={periodFromId}
    onChange={(period) => setPeriodFromId(period ? period.id : null)}
    periods={periods || []}
    minId={periodMinMax.minId}
    maxId={periodToId || periodMinMax.maxId}
    placeholder="Seleccionar período desde..."
    error={fieldErrors.periodIds}
  />
</div>

{/* Periodo Hasta */}
<div>
  <label className="block text-sm font-medium mb-1">Periodo Hasta *</label>
  <YearMonthPicker
    value={periodToId}
    onChange={(period) => setPeriodToId(period ? period.id : null)}
    periods={periods || []}
    minId={periodFromId || periodMinMax.minId}
    maxId={periodMinMax.maxId}
    placeholder="Seleccionar período hasta..."
    error={fieldErrors.periodIds}
  />
  {periodIds.length > 0 && (
    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
      {periodIds.length} mes(es) seleccionado(s)
    </p>
  )}
</div>
```

#### Buscador de CECO (modo sin OC)
```tsx
{!hasOC && (
  <div className="mb-3">
    <Input
      placeholder="Buscar CECO por código..."
      value={cecoSearchCode}
      onChange={(e) => setCecoSearchCode(e.target.value)}
      className="max-w-xs"
    />
  </div>
)}
```

#### Distribución por CECO

**Caso 1: Sin CECOs disponibles**
```tsx
{availableCostCenters.length === 0 ? (
  <div className="text-sm text-slate-500 italic py-2">
    {hasOC ? "Selecciona una OC primero" : "Selecciona un sustento primero"}
  </div>
) : ...}
```

**Caso 2: Solo 1 CECO (100% automático)**
```tsx
{availableCostCenters.length === 1 ? (
  <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">
        {availableCostCenters[0].code} - {availableCostCenters[0].name}
      </span>
      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
        100%
      </span>
    </div>
  </div>
) : ...}
```

**Caso 3: Múltiples CECOs (inputs de %)**
```tsx
{/* Múltiples CECOs → inputs de porcentaje */}
<div className="space-y-2">
  {filteredCostCenters.map((ceco: any) => {
    const allocation = allocations.find(a => a.costCenterId === ceco.id);
    return (
      <div key={ceco.id} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!allocation}
          onChange={(e) => {
            if (e.target.checked) {
              const currentAllocations = allocations.filter(a => a.costCenterId !== ceco.id);
              const newCecoIds = [...currentAllocations.map(a => a.costCenterId), ceco.id];
              setAllocations(distributePercentages(newCecoIds));
            } else {
              const filtered = allocations.filter(a => a.costCenterId !== ceco.id);
              if (filtered.length > 0) {
                setAllocations(distributePercentages(filtered.map(a => a.costCenterId)));
              } else {
                setAllocations([]);
              }
            }
          }}
          className="rounded"
        />
        <span className="flex-1 text-sm">{ceco.code} - {ceco.name}</span>
        {allocation && (
          <>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={allocation.percentage || ""}
              onChange={(e) => {
                const newPercent = Number(e.target.value) || 0;
                setAllocations(prev =>
                  prev.map(a =>
                    a.costCenterId === ceco.id
                      ? { ...a, percentage: newPercent }
                      : a
                  )
                );
              }}
              className="w-24 text-sm"
              placeholder="%"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 w-6">%</span>
          </>
        )}
      </div>
    );
  })}
</div>

{/* Total de porcentajes */}
{allocations.length > 0 && availableCostCenters.length > 1 && (
  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium">Total:</span>
      <span className={`font-bold ${
        Math.abs(allocations.reduce((sum, a) => sum + (a.percentage || 0), 0) - 100) > 0.01
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400"
      }`}>
        {allocations.reduce((sum, a) => sum + (a.percentage || 0), 0).toFixed(2)}%
      </span>
    </div>
  </div>
)}
```

---

## Compatibilidad hacia atrás

- **Backend ya soporta `periodIds[]` y `allocations[]`** (implementado previamente)
- **Payload incluye `amount` Y `percentage`**: el backend puede usar el que necesite
- **Al editar facturas antiguas**: si solo tienen `amount`, se calcula automáticamente el `percentage`
- **Prorrateo por meses**: el backend ya maneja la distribución del monto por periodo (no modificado)
- **TC (tipo de cambio)**: se mantiene la conversión a PEN (no modificado)
- **Comparación PPTO**: se mantiene la lógica existente (no modificado)

---

## Pruebas de Aceptación

### Con OC ✅
1. **Selector de periodos**: Solo muestra meses dentro del rango de la OC
2. **Auto-carga**: Al seleccionar OC, se cargan automáticamente:
   - Periodo desde/hasta
   - CECOs asociados con distribución equitativa de %
3. **Validación**: No permite seleccionar meses fuera del rango
4. **Distribución**:
   - Si 1 CECO → muestra "100%" bloqueado
   - Si varios → permite ajustar % con validación de suma = 100%

### Sin OC ✅
1. **Sustento requerido**: Debe seleccionar un sustento primero
2. **Selector de periodos**: Muestra todos los periodos disponibles (global)
3. **CECOs filtrados**: Solo muestra CECOs asociados al sustento seleccionado
4. **Buscador por código**: Filtra CECOs por código en tiempo real
5. **Distribución**: Misma lógica de % que con OC

### General ✅
1. **Build**: `pnpm build` pasa sin errores ✅
2. **Listado**: Ya muestra periodos (rango) y CECOs (chips) correctamente ✅
3. **Edición**: Precarga `periodFromId`/`periodToId` y `allocations` con %
4. **Validación 100%**: Aviso visual rojo si total ≠ 100%

---

## Archivos Modificados

- `apps/web/src/pages/InvoicesPage.tsx` (refactor completo)
- `apps/web/src/components/YearMonthPicker.tsx` (ya existente, reutilizado)

---

## Estado: ✅ Completado

Todos los objetivos han sido implementados:
- ✅ Selector de rango (desde/hasta) coherente con OCs
- ✅ Distribución por CECO con porcentajes que suman 100%
- ✅ Modo Con OC: CECOs y periodos filtrados por OC
- ✅ Modo Sin OC: Sustento + CECOs del sustento + buscador por código
- ✅ Auto-asignación 100% cuando solo hay 1 CECO
- ✅ Compatibilidad hacia atrás (conversión % ↔ montos)
- ✅ Build exitoso
- ✅ Integraciones previas intactas (TC, PPTO, prorrateo)

**No se rompió nada**: El backend ya soportaba `periodIds[]` y `allocations[]`, y la conversión de % a montos se hace en el frontend antes de enviar el payload.

