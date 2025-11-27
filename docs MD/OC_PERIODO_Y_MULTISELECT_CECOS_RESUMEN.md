# ✅ Resumen: Períodos Interanuales y Multi-CECO en OC

## 🎯 Cambios Implementados

### 1. ✅ Arreglado rango de períodos interanuales (2025 → 2026)

**Problema:** El selector de períodos no permitía elegir rangos que cruzaran años (ej: diciembre 2025 → enero 2026).

**Solución:**

#### a) YearMonthPicker - Validación cronológica en lugar de por ID
**Archivo:** `apps/web/src/components/YearMonthPicker.tsx`

```typescript
// ANTES: Comparaba por ID (incorrecto)
if (minId !== undefined && period.id < minId) return true;

// DESPUÉS: Compara por fecha cronológica (año*100 + mes)
if (minId !== undefined) {
  const minPeriod = sortedPeriods.find(p => p.id === minId);
  if (minPeriod) {
    const periodValue = period.year * 100 + period.month;
    const minValue = minPeriod.year * 100 + minPeriod.month;
    if (periodValue < minValue) return true;
  }
}
```

**Resultado:** Ahora permite seleccionar cualquier rango donde `desde <= hasta` cronológicamente, sin importar si cruzan años.

#### b) Validación frontend en form OC
**Archivo:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

```typescript
// Validar rango de períodos cronológicamente
if (form.budgetPeriodFromId && form.budgetPeriodToId && periods) {
  const fromPeriod = periods.find((p: any) => p.id === Number(form.budgetPeriodFromId));
  const toPeriod = periods.find((p: any) => p.id === Number(form.budgetPeriodToId));
  if (fromPeriod && toPeriod) {
    const fromValue = fromPeriod.year * 100 + fromPeriod.month;
    const toValue = toPeriod.year * 100 + toPeriod.month;
    if (fromValue > toValue) {
      errors.budgetPeriodToId = "El período hasta debe ser posterior o igual al período desde";
    }
  }
}
```

---

### 2. ✅ Selección múltiple de CECOs en OC

**Objetivo:** Permitir asociar múltiples CECOs a una Orden de Compra, filtrados por el sustento seleccionado.

#### a) Base de Datos - Nueva tabla pivot OCCostCenter

**Archivo:** `packages/db/schema.prisma`

```prisma
model OC {
  // ... campos existentes ...
  
  cecoId         Int?  // DEPRECATED: usar costCenters (M:N)
  ceco           CostCenter? @relation("LegacyOCCostCenter", fields: [cecoId], references: [id])
  
  // NUEVO: Relación M:N
  costCenters    OCCostCenter[]  // M:N con CostCenter
}

model CostCenter {
  // ... campos existentes ...
  
  ocs      OC[]      @relation("LegacyOCCostCenter")  // DEPRECATED: relación 1:N legacy
  ocLinks  OCCostCenter[]  // M:N con OC
}

model OCCostCenter {
  id           Int        @id @default(autoincrement())
  ocId         Int
  oc           OC         @relation(fields: [ocId], references: [id], onDelete: Cascade)
  costCenterId Int
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())

  @@unique([ocId, costCenterId], name: "ux_oc_costcenter_pair")
  @@index([ocId], name: "ix_occostcenter_oc")
  @@index([costCenterId], name: "ix_occostcenter_costcenter")
}
```

**Migración:** `packages/db/migrations/20251114000000_oc_costcenter_many_to_many/migration.sql`
- Crea tabla `OCCostCenter`
- Migra datos existentes desde `OC.cecoId` (legacy)
- Mantiene campo legacy por compatibilidad

#### b) Backend - Soporte para costCenterIds[]

**Archivo:** `apps/api/src/oc.ts`

**Schema Zod actualizado:**
```typescript
const createOcSchema = z.object({
  // ... otros campos ...
  cecoId: z.number().int().positive().nullable().optional(),  // DEPRECATED
  costCenterIds: z.array(z.number().int().positive()).min(1, "Debe seleccionar al menos un CECO").optional(),
  // ... otros campos ...
});
```

**POST /ocs - Crear OC con múltiples CECOs:**
```typescript
// Determinar CECOs a validar (nuevo array o legacy cecoId único)
const cecoIdsToValidate = data.costCenterIds || (data.cecoId ? [data.cecoId] : []);

// Validar que todos los CECOs estén asociados al sustento
if (cecoIdsToValidate.length > 0 && data.supportId) {
  const supportHasRelations = await prisma.supportCostCenter.count({
    where: { supportId: data.supportId }
  });

  if (supportHasRelations > 0) {
    const validCecoIds = await prisma.supportCostCenter.findMany({
      where: {
        supportId: data.supportId,
        costCenterId: { in: cecoIdsToValidate }
      },
      select: { costCenterId: true }
    });

    const validIds = new Set(validCecoIds.map(r => r.costCenterId));
    const invalidIds = cecoIdsToValidate.filter(id => !validIds.has(id));

    if (invalidIds.length > 0) {
      return reply.code(422).send({
        error: "VALIDATION_ERROR",
        issues: [{ path: ["costCenterIds"], message: `Los CECOs ${invalidIds.join(", ")} no están asociados al sustento` }]
      });
    }
  }
}

// Usar transacción para crear OC y sus CECOs
const created = await prisma.$transaction(async (tx) => {
  const oc = await tx.oC.create({ data: { /* ... */ } });

  // Crear relaciones M:N con CECOs
  if (cecoIdsToValidate.length > 0) {
    await tx.oCCostCenter.createMany({
      data: cecoIdsToValidate.map(cecoId => ({
        ocId: oc.id,
        costCenterId: cecoId
      })),
      skipDuplicates: true
    });
  }

  return await tx.oC.findUnique({
    where: { id: oc.id },
    include: {
      // ... relaciones ...
      costCenters: { include: { costCenter: true } }
    }
  });
});
```

**PATCH /ocs/:id - Actualizar OC con múltiples CECOs:**
```typescript
// Usar transacción para actualizar OC y sus CECOs
const updated = await prisma.$transaction(async (tx) => {
  const oc = await tx.oC.update({ where: { id }, data: updateData });

  // Actualizar relaciones M:N con CECOs si se especificaron
  if (data.costCenterIds !== undefined || data.cecoId !== undefined) {
    // Eliminar relaciones actuales
    await tx.oCCostCenter.deleteMany({ where: { ocId: id } });
    
    // Crear nuevas relaciones
    if (cecoIdsToValidate.length > 0) {
      await tx.oCCostCenter.createMany({
        data: cecoIdsToValidate.map(cecoId => ({
          ocId: id,
          costCenterId: cecoId
        })),
        skipDuplicates: true
      });
    }
  }

  return await tx.oC.findUnique({
    where: { id },
    include: { /* ... relaciones incluido costCenters ... */ }
  });
});
```

**GET /ocs - Incluir costCenters en listado:**
```typescript
include: {
  // ... otras relaciones ...
  costCenters: { 
    include: { 
      costCenter: { select: { id: true, code: true, name: true } }
    }
  }
}
```

#### c) Frontend - Multiselect con chips

**Archivo:** `apps/web/src/pages/PurchaseOrdersPage.tsx`

**Estado del formulario:**
```typescript
const [form, setForm] = useState({
  // ... otros campos ...
  cecoId: "",  // DEPRECATED: mantener por compatibilidad
  costCenterIds: [] as number[],  // NUEVO: múltiples CECOs
  // ... otros campos ...
});
```

**Selector con chips:**
```tsx
<div className="md:col-span-2">
  <label className="block text-sm font-medium mb-1">Centros de Costo (CECO) *</label>
  {!form.supportId ? (
    <div className="text-sm text-slate-500 italic py-2">
      Selecciona un sustento primero
    </div>
  ) : (
    <>
      <Select
        value=""
        onChange={(e: any) => {
          const cecoId = Number(e.target.value);
          if (cecoId && !form.costCenterIds.includes(cecoId)) {
            setForm(f => ({ ...f, costCenterIds: [...f.costCenterIds, cecoId] }));
          }
        }}
        className={fieldErrors.costCenterIds ? "border-red-500" : ""}
      >
        <option value="">Selecciona uno o más CECOs...</option>
        {availableCostCenters
          ?.filter((cc: any) => !form.costCenterIds.includes(cc.id))
          .map((cc: any) => (
            <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
          ))}
      </Select>
      {/* Chips de CECOs seleccionados */}
      {form.costCenterIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {form.costCenterIds.map(cecoId => {
            const ceco = costCenters?.find((cc: any) => cc.id === cecoId);
            return ceco ? (
              <div
                key={cecoId}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200"
              >
                <span>{ceco.code} - {ceco.name}</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    costCenterIds: f.costCenterIds.filter(id => id !== cecoId)
                  }))}
                  className="hover:text-brand-600 dark:hover:text-brand-100"
                >
                  ×
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}
      {fieldErrors.costCenterIds && (
        <p className="text-xs text-red-600 mt-1">{fieldErrors.costCenterIds}</p>
      )}
    </>
  )}
</div>
```

**Limpieza automática al cambiar sustento:**
```typescript
// Limpiar CECOs si cambia el sustento y ya no son válidos
useEffect(() => {
  if (form.supportId && form.costCenterIds.length > 0 && costCenters && supports) {
    const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
    if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
      const validCecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
      const filteredCecoIds = form.costCenterIds.filter(id => validCecoIds.has(id));
      
      if (filteredCecoIds.length !== form.costCenterIds.length) {
        setForm(f => ({ ...f, costCenterIds: filteredCecoIds }));
      }
    }
  }
}, [form.supportId, form.costCenterIds, costCenters, supports]);
```

**Validación frontend:**
```typescript
// Validar que haya al menos un CECO seleccionado
if (!form.costCenterIds || form.costCenterIds.length === 0) {
  errors.costCenterIds = "Debe seleccionar al menos un CECO";
} else if (form.supportId && supports && costCenters) {
  // Validar que todos los CECOs seleccionados estén asociados al sustento
  const selectedSupport = supports.find((s: any) => s.id === Number(form.supportId));
  if (selectedSupport && selectedSupport.costCenters && selectedSupport.costCenters.length > 0) {
    const validCecoIds = new Set(selectedSupport.costCenters.map((cc: any) => cc.costCenterId));
    const invalidCecos = form.costCenterIds.filter(id => !validCecoIds.has(id));
    if (invalidCecos.length > 0) {
      errors.costCenterIds = "Algunos CECOs seleccionados no están asociados al sustento";
    }
  }
}
```

**Payload:**
```typescript
const payload: any = {
  // ... otros campos ...
  costCenterIds: form.costCenterIds,  // NUEVO: array de CECOs
  // ... otros campos ...
};
```

**Cargar en edición:**
```typescript
const handleEdit = (oc: any) => {
  // Extraer IDs de CECOs de la relación M:N
  const costCenterIds = oc.costCenters?.map((cc: any) => cc.costCenterId) || [];
  
  setForm({
    // ... otros campos ...
    costCenterIds: costCenterIds,
    // ... otros campos ...
  });
  setEditingId(oc.id);
  setShowForm(true);
};
```

#### d) Listado - Mostrar múltiples CECOs

**Tabla con columna CECOs:**
```tsx
<Th>CECOs</Th>

{/* ... */}

<Td className="text-xs">
  {oc.costCenters && oc.costCenters.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {oc.costCenters.map((cc: any) => (
        <span
          key={cc.id}
          className="inline-block px-1.5 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800"
        >
          {cc.costCenter.code}
        </span>
      ))}
    </div>
  ) : (
    "-"
  )}
</Td>
```

---

## 📋 Archivos Modificados

### Base de Datos
- `packages/db/schema.prisma` - Agregado modelo `OCCostCenter` y relación M:N
- `packages/db/migrations/20251114000000_oc_costcenter_many_to_many/migration.sql` - Nueva migración

### Backend
- `apps/api/src/oc.ts` - Endpoints actualizados para soportar `costCenterIds[]`

### Frontend
- `apps/web/src/components/YearMonthPicker.tsx` - Validación cronológica de períodos
- `apps/web/src/pages/PurchaseOrdersPage.tsx` - Multiselect CECOs con chips + validación de rango

---

## ✅ Pruebas Manuales Verificadas

### Períodos Interanuales
- ✅ 2025-11 → 2026-01 (permite)
- ✅ 2025-12 → 2026-12 (permite)
- ✅ 2024-06 → 2026-03 (permite)
- ❌ 2026-03 → 2026-02 (bloquea correctamente)

### Multi-CECO
- ✅ Elegir sustento con múltiples CECOs → solo aparecen los asociados
- ✅ Seleccionar varios CECOs → se muestran como chips
- ✅ Remover chip → se elimina del array
- ✅ Cambiar sustento → CECOs inválidos se eliminan automáticamente
- ✅ Guardar OC → persiste múltiples CECOs
- ✅ Editar OC → precarga CECOs existentes
- ✅ Listado → muestra CECOs como chips compactos

### Validaciones
- ✅ Frontend: Requiere al menos un CECO
- ✅ Frontend: Valida que CECOs pertenezcan al sustento
- ✅ Backend: Valida relación Sustento-CECO antes de guardar
- ✅ Backend: Mensaje claro si CECOs no son válidos

---

## 🚀 Build Exitoso

```
✅ Backend compilado sin errores
✅ Frontend compilado sin errores  
✅ No hay errores de linter
✅ Cliente Prisma generado con nuevo schema
```

---

## 📝 Notas Técnicas

1. **Compatibilidad Legacy:** Se mantiene el campo `cecoId` en la DB por compatibilidad, pero está marcado como DEPRECATED.

2. **Migración de Datos:** La migración automáticamente copia CECOs existentes desde `OC.cecoId` a la tabla pivot `OCCostCenter`.

3. **Transacciones:** Se usan transacciones Prisma para garantizar consistencia al crear/actualizar OCs con sus CECOs.

4. **Filtrado de CECOs:** El filtrado por sustento reutiliza la tabla `SupportCostCenter` existente (M:N Support-CECO).

5. **UI/UX:** Los chips tienen estilos consistentes con el resto de la aplicación (usa `bg-brand-*` y `dark:` variants).

6. **Validación Cronológica:** La comparación de períodos usa `year * 100 + month` para ordenamiento cronológico independiente de IDs.

---

**Fecha de implementación:** 14 de noviembre de 2025  
**Estado:** ✅ Completado, testeado y en producción  
**Build:** ✅ Exitoso sin errores

