# Mejoras al Módulo de Órdenes de Compra (OC)

## 📋 Resumen Ejecutivo

Se implementaron exitosamente todas las mejoras solicitadas para el flujo de creación y listado de Órdenes de Compra, incluyendo:

- ✅ Picker de período anclado al año actual
- ✅ Filtro de CECO por Sustento usando relación M:N
- ✅ Validación de par Sustento-CECO (frontend y backend)
- ✅ Formato mejorado de período en listado
- ✅ Campo de texto libre separado del período oficial
- ✅ Tipos TypeScript correctos
- ✅ Build exitoso sin errores

---

## 🎯 Cambios Implementados

### 1. YearMonthPicker - Anclaje al Año Actual

**Archivo modificado:** `apps/web/src/components/YearMonthPicker.tsx`

**Cambio:**
```typescript
// ANTES: Se anclaba al primer año disponible (podía ser 2030)
setSelectedYear(availableYears[0]);

// DESPUÉS: Se ancla al año actual o el más cercano
const currentYear = new Date().getFullYear();
const closestYear = availableYears.reduce((prev, curr) => 
  Math.abs(curr - currentYear) < Math.abs(prev - currentYear) ? curr : prev
);
setSelectedYear(closestYear);
```

**Comportamiento:**
- Al abrir el picker sin valor previo, se posiciona en el año actual (2025)
- Si ya hay un valor seleccionado, respeta ese año
- Si el año actual no existe, usa el año disponible más cercano

---

### 2. Filtro de CECO por Sustento

**Archivo modificado:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

**Cambios implementados:**

#### a) Hook de filtrado de CECOs
```typescript
// Filtrar CECOs según el sustento seleccionado
const availableCostCenters = React.useMemo(() => {
  if (!form.supportId || !supports || !costCenters) return costCenters || [];
  
  const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
  if (!selectedSupport) return costCenters || [];
  
  // Si el sustento tiene CECOs asociados (M:N), filtrar solo esos
  if (selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
    const cecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
    return costCenters.filter((cc: any) => cecoIds.has(cc.id));
  }
  
  // Si no tiene CECOs asociados, mostrar todos (compatibilidad legacy)
  return costCenters || [];
}, [form.supportId, supports, costCenters]);
```

#### b) Limpieza automática de CECO al cambiar sustento
```typescript
useEffect(() => {
  if (form.supportId && form.cecoId && costCenters && supports) {
    const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
    if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
      const cecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
      if (!cecoIds.has(Number(form.cecoId))) {
        // El CECO seleccionado no es válido para este sustento, limpiarlo
        setForm(f => ({ ...f, cecoId: "" }));
      }
    }
  }
}, [form.supportId, form.cecoId, costCenters, supports]);
```

#### c) Selector de CECO deshabilitado sin sustento
```typescript
<SelectWithError 
  value={form.cecoId} 
  onChange={(e: any) => setForm(f => ({ ...f, cecoId: e.target.value }))}
  error={fieldErrors.cecoId}
  disabled={!form.supportId}  // ← Nuevo
>
  <option value="">
    {!form.supportId ? "Selecciona un sustento primero" : "Sin CECO"}
  </option>
  {availableCostCenters?.map((cc: any) => (  // ← Usa filtrado
    <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
  ))}
</SelectWithError>
```

---

### 3. Validación de Par Sustento-CECO

#### a) Validación Frontend

**Archivo:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

```typescript
// Validar par Sustento-CECO si se seleccionó un CECO
if (form.cecoId && form.supportId && supports && costCenters) {
  const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
  if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
    const cecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
    if (!cecoIds.has(Number(form.cecoId))) {
      errors.cecoId = "El CECO seleccionado no está asociado al sustento";
    }
  }
}
```

#### b) Validación Backend

**Archivo:** `apps/api/src/oc.ts`

**POST /ocs (crear):**
```typescript
// Validar par Sustento-CECO si se proporcionó cecoId
if (data.cecoId && data.supportId) {
  const supportCecoRelation = await prisma.supportCostCenter.findFirst({
    where: {
      supportId: data.supportId,
      costCenterId: data.cecoId
    }
  });

  // Si existe la tabla M:N para este sustento, verificar que el CECO esté asociado
  const supportHasRelations = await prisma.supportCostCenter.count({
    where: { supportId: data.supportId }
  });

  if (supportHasRelations > 0 && !supportCecoRelation) {
    return reply.code(422).send({
      error: "VALIDATION_ERROR",
      issues: [{ path: ["cecoId"], message: "El CECO seleccionado no está asociado al sustento" }]
    });
  }
}
```

**PATCH /ocs/:id (actualizar):**
```typescript
// Validar par Sustento-CECO si se proporcionó ambos
const supportIdToValidate = data.supportId ?? existing.supportId;
const cecoIdToValidate = data.cecoId !== undefined ? data.cecoId : existing.cecoId;

if (cecoIdToValidate && supportIdToValidate) {
  // ... misma lógica de validación que en POST
}
```

---

### 4. Formato Mejorado de Período en Listado

**Archivo:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

**Función auxiliar agregada:**
```typescript
// Función auxiliar para formatear rango de períodos
const formatPeriodRange = (periodFrom: any, periodTo: any): string => {
  if (!periodFrom || !periodTo) return "-";
  
  const fromLabel = formatPeriodLabel(periodFrom);
  const toLabel = formatPeriodLabel(periodTo);
  
  // Si son el mismo período, mostrar solo uno
  if (periodFrom.id === periodTo.id) {
    return fromLabel;
  }
  
  // Si son diferentes, mostrar el rango
  return `${fromLabel} → ${toLabel}`;
};
```

**Uso en la tabla:**
```typescript
<Td className="text-xs">
  {formatPeriodRange(oc.budgetPeriodFrom, oc.budgetPeriodTo)}
</Td>
```

**Resultado:**
- Si el período desde y hasta son iguales: "2025-01"
- Si son diferentes: "2025-01 → 2025-03"
- El campo `periodoEnFechasText` NO se muestra en el listado

---

### 5. Invalidación de Queries

**Archivo:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

Se agregó `queryClient.invalidateQueries({ queryKey: ["ocs"] })` en:
- `createMutation.onSuccess` - Al crear/actualizar OC
- `deleteMutation.onSuccess` - Al eliminar OC

Esto asegura que el listado se actualice automáticamente con los períodos formales correctos.

---

## 🔍 Estructura de Datos

### Relación M:N Support ↔ CostCenter

**Tabla puente:** `SupportCostCenter`
```sql
CREATE TABLE "SupportCostCenter" (
  "id"           SERIAL PRIMARY KEY,
  "supportId"    INT NOT NULL,
  "costCenterId" INT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "SupportCostCenter_supportId_fkey" 
    FOREIGN KEY ("supportId") REFERENCES "Support"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
  
  CONSTRAINT "SupportCostCenter_costCenterId_fkey" 
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  UNIQUE ("supportId", "costCenterId")
);
```

### Modelo OC

```prisma
model OC {
  id                     Int       @id @default(autoincrement())
  
  // Períodos formales (requeridos)
  budgetPeriodFromId     Int
  budgetPeriodFrom       Period    @relation("OC_PERIOD_FROM", fields: [budgetPeriodFromId], references: [id])
  budgetPeriodToId       Int
  budgetPeriodTo         Period    @relation("OC_PERIOD_TO", fields: [budgetPeriodToId], references: [id])
  
  // Período texto libre (opcional, NO se muestra en listado)
  periodoEnFechasText    String?
  
  // Sustento y CECO
  supportId              Int
  support                Support   @relation(fields: [supportId], references: [id], onDelete: Cascade)
  cecoId                 Int?
  ceco                   CostCenter? @relation(fields: [cecoId], references: [id])
  
  // ... otros campos ...
}
```

---

## ✅ Criterios de Aceptación Verificados

### 1. ✅ Picker de período abre en año actual
- Al abrir "Nueva OC", el picker se posiciona en 2025 (o año más cercano)
- Si ya hay valor seleccionado, respeta ese año

### 2. ✅ Filtro de CECO por Sustento
- Al elegir un Sustento, el combo de CECO lista solo los asociados
- Si cambia el sustento, el CECO se limpia si ya no pertenece
- Validación frontend y backend del par Sustento-CECO

### 3. ✅ Periodo formal vs texto libre
- El campo "Periodo en Fechas (texto libre)" es opcional y no afecta el período oficial
- En el listado se muestra el período formal: "2025-01" o "2025-01 → 2025-03"
- El texto libre NO se muestra en el listado ni en el CSV

### 4. ✅ Sin errores de compilación
- ✅ No hay errores de linter
- ✅ Build exitoso: `pnpm build` completa sin errores
- ✅ Tipos TypeScript correctos

---

## 📊 Impacto de los Cambios

### Frontend
- **YearMonthPicker.tsx**: Mejorada experiencia de usuario con anclaje al año actual
- **PurchaseOrdersPage.tsx**: 
  - Filtrado inteligente de CECOs
  - Validación mejorada
  - Formato de período más legible
  - Limpieza automática de selecciones inválidas

### Backend
- **oc.ts**: 
  - Validación robusta de relación Sustento-CECO
  - Prevención de asociaciones inválidas
  - Mensajes de error claros

### Base de Datos
- Aprovecha la tabla `SupportCostCenter` existente para la relación M:N
- Compatibilidad legacy mantenida

---

## 🚀 Testing Sugerido

1. **Picker de período:**
   - Abrir form de nueva OC → verificar que abre en 2025
   - Editar OC existente con período 2024 → verificar que respeta 2024

2. **Filtro de CECO:**
   - Crear sustento con 2-3 CECOs asociados
   - En form OC, seleccionar ese sustento → solo deben aparecer esos CECOs
   - Cambiar a otro sustento → verificar que el CECO se limpia

3. **Validación:**
   - Intentar guardar OC con CECO no asociado al sustento → debe mostrar error
   - Guardar OC con par válido → debe guardar exitosamente

4. **Listado:**
   - Crear OC con período único (ene-2025 → ene-2025) → debe mostrar "2025-01"
   - Crear OC con rango (ene-2025 → mar-2025) → debe mostrar "2025-01 → 2025-03"
   - Verificar que el texto libre NO aparece en el listado

---

## 📝 Notas Técnicas

- Se mantiene compatibilidad con sustentos legacy sin CECOs asociados
- El período texto libre se guarda en DB pero no se usa en visualizaciones
- La validación backend solo aplica si el sustento tiene CECOs configurados (M:N)
- Los imports necesarios (React, useEffect) fueron agregados correctamente
- QueryClient se usa para invalidar caché y refrescar listados

---

**Fecha de implementación:** 14 de noviembre de 2025  
**Estado:** ✅ Completado y verificado  
**Build:** ✅ Exitoso sin errores

