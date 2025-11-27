# Módulo de Facturas: Periodos Múltiples y CECOs M:N - Completado ✅

## Fecha
2025-11-14

## Resumen de Cambios

Se ha implementado una actualización completa del módulo de Facturas para soportar:
1. **Periodos múltiples** (M:N Invoice ↔ Period)
2. **CECOs múltiples** con distribución (M:N Invoice ↔ CostCenter)
3. **Toggle "Con OC" / "Sin OC"**
4. **Carga automática** de datos desde OC (CECOs M:N, periodos, proveedor, moneda)
5. **Validaciones** de periodos ⊆ rango OC y CECOs ⊆ CECOs de OC

---

## 1. Cambios en Base de Datos

### Schema Prisma (`packages/db/schema.prisma`)

#### Modelo `Invoice` actualizado:
```prisma
model Invoice {
  // ... campos existentes ...
  periods         InvoicePeriod[]         // M:N con Period (meses de registro)
  costCenters     InvoiceCostCenter[]     // M:N con CostCenter (distribución)
}
```

#### Nuevos modelos pivot:
```prisma
// Tabla pivot: Factura ↔ Periodo (meses de registro)
model InvoicePeriod {
  id        Int      @id @default(autoincrement())
  invoiceId Int
  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  periodId  Int
  period    Period   @relation("InvoicePeriod", fields: [periodId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([invoiceId, periodId], name: "ux_invoice_period_pair")
  @@index([invoiceId], name: "ix_invoiceperiod_invoice")
  @@index([periodId], name: "ix_invoiceperiod_period")
}

// Tabla pivot: Factura ↔ CostCenter (distribución)
model InvoiceCostCenter {
  id           Int        @id @default(autoincrement())
  invoiceId    Int
  invoice      Invoice    @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  costCenterId Int
  costCenter   CostCenter @relation("InvoiceCostCenter", fields: [costCenterId], references: [id], onDelete: Cascade)
  amount       Decimal?   // Monto asignado a este CECO
  percentage   Decimal?   // Porcentaje asignado (0-100)
  createdAt    DateTime   @default(now())

  @@unique([invoiceId, costCenterId], name: "ux_invoice_costcenter_pair")
  @@index([invoiceId], name: "ix_invoicecostcenter_invoice")
  @@index([costCenterId], name: "ix_invoicecostcenter_costcenter")
}
```

#### Relaciones inversas:
- **`Period`**: `invoicePeriods InvoicePeriod[] @relation("InvoicePeriod")`
- **`CostCenter`**: `invoiceLinks InvoiceCostCenter[] @relation("InvoiceCostCenter")`

### Migración (`packages/db/migrations/20251114000001_invoice_periods_costcenters_mn/migration.sql`)

Crea las tablas `InvoicePeriod` e `InvoiceCostCenter` con constraints de integridad referencial, índices únicos e índices de performance.

---

## 2. Cambios en Backend (`apps/api/src/invoices.ts`)

### Schemas Zod actualizados

#### `createInvoiceSchema`:
```typescript
const allocationSchema = z.object({
  costCenterId: z.number().int().positive(),
  amount: z.number().nonnegative().optional(),
  percentage: z.number().min(0).max(100).optional()
});

const createInvoiceSchema = z.object({
  ocId: z.number().int().positive().optional(),  // Ahora opcional (sin OC)
  docType: z.enum(["FACTURA", "NOTA_CREDITO"]).default("FACTURA"),
  numberNorm: z.string().min(1, "Número es requerido"),
  montoSinIgv: z.number().nonnegative(),
  periodIds: z.array(z.number().int().positive()).min(1, "Debe seleccionar al menos un periodo"),
  allocations: z.array(allocationSchema).min(1, "Debe seleccionar al menos un CECO"),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional(),
  // Campos para "sin OC"
  proveedor: z.string().optional(),
  moneda: z.enum(["PEN", "USD"]).optional()
});
```

#### `updateInvoiceSchema`:
Similar al `createInvoiceSchema`, pero todos los campos son opcionales.

### `GET /invoices`
- **Incluye**:
  - `oc.costCenters` (M:N de OC)
  - `oc.budgetPeriodFrom` y `oc.budgetPeriodTo`
  - `periods` (M:N de Invoice)
  - `costCenters` (M:N de Invoice con distribución)

### `POST /invoices`
1. **Determina** si es "Con OC" o "Sin OC":
   - **Con OC**: carga OC con periodos y CECOs, hereda moneda/proveedor.
   - **Sin OC**: valida que se proporcionen `proveedor` y `moneda`.
2. **Valida saldo** de OC (si aplica).
3. **Valida periodos** ⊆ rango de OC:
   ```typescript
   if (periodValue < fromValue || periodValue > toValue) {
     return reply.code(422).send({
       error: "VALIDATION_ERROR",
       issues: [{ path: ["periodIds"], message: "El periodo ... está fuera del rango de la OC" }]
     });
   }
   ```
4. **Valida CECOs** ⊆ CECOs de OC:
   ```typescript
   const ocCecoIds = new Set(oc.costCenters.map(cc => cc.costCenterId));
   const invalidCecos = data.allocations.filter(a => !ocCecoIds.has(a.costCenterId));
   if (invalidCecos.length > 0) {
     return reply.code(422).send({ error: "VALIDATION_ERROR", ... });
   }
   ```
5. **Valida distribución** (suma = monto total con tolerancia de 0.01):
   ```typescript
   const totalAllocated = data.allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
   if (Math.abs(totalAllocated - data.montoSinIgv) > 0.01) {
     return reply.code(422).send({ error: "VALIDATION_ERROR", ... });
   }
   ```
6. **Crea factura** + periodos + distribución en una transacción Prisma:
   ```typescript
   const created = await prisma.$transaction(async (tx) => {
     const invoice = await tx.invoice.create({ ... });
     await tx.invoicePeriod.createMany({ ... });
     await tx.invoiceCostCenter.createMany({ ... });
     await tx.invoiceStatusHistory.create({ ... });
     return invoice;
   });
   ```

### `PATCH /invoices/:id`
1. **Carga factura** existente con OC (incluyendo periodos y CECOs).
2. **Revalida** saldo OC, periodos y CECOs (si se proporcionan nuevos valores).
3. **Actualiza** factura + periodos + distribución en transacción:
   ```typescript
   await prisma.$transaction(async (tx) => {
     await tx.invoice.update({ ... });
     if (data.periodIds) {
       await tx.invoicePeriod.deleteMany({ where: { invoiceId: id } });
       await tx.invoicePeriod.createMany({ ... });
     }
     if (data.allocations) {
       await tx.invoiceCostCenter.deleteMany({ where: { invoiceId: id } });
       await tx.invoiceCostCenter.createMany({ ... });
     }
   });
   ```

---

## 3. Cambios en Frontend (`apps/web/src/pages/InvoicesPage.tsx`)

### Queries adicionales
- **`periods`**: `useQuery({ queryKey: ["periods"], ... })`
- **`costCenters`**: `useQuery({ queryKey: ["cost-centers"], ... })`
- **`ocsQuery`**: incluye `costCenters`, `budgetPeriodFrom`, `budgetPeriodTo`

### Estados nuevos
```typescript
const [hasOC, setHasOC] = useState(true);  // Toggle Con OC / Sin OC
const [periodIds, setPeriodIds] = useState<number[]>([]);
const [allocations, setAllocations] = useState<Allocation[]>([]);
```

### Toggle "Con OC" / "Sin OC"
```tsx
<label className="flex items-center gap-2 text-sm font-medium">
  <input
    type="checkbox"
    checked={hasOC}
    onChange={(e) => {
      setHasOC(e.target.checked);
      if (e.target.checked) {
        setForm(f => ({ ...f, proveedor: "", moneda: "PEN" }));
      } else {
        setForm(f => ({ ...f, ocId: "" }));
      }
    }}
    className="rounded"
  />
  Asociar a Orden de Compra
</label>
```

### Selector de meses múltiple
```tsx
<div className="flex flex-wrap gap-2 mb-2">
  {availablePeriods.map((period: any) => {
    const isSelected = periodIds.includes(period.id);
    return (
      <button
        key={period.id}
        type="button"
        onClick={() => {
          if (isSelected) {
            setPeriodIds(prev => prev.filter(id => id !== period.id));
          } else {
            setPeriodIds(prev => [...prev, period.id]);
          }
        }}
        className={`px-2 py-1 text-xs rounded ${
          isSelected
            ? "bg-brand-500 text-white"
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
        }`}
      >
        {formatPeriodLabel(period)}
      </button>
    );
  })}
</div>
```

### UI distribución por CECO
- **Lista de CECOs** con checkboxes.
- **Input de monto** por cada CECO seleccionado.
- **Cálculo automático** de porcentaje.
- **Auto-distribución** equitativa al cambiar monto total o seleccionar/deseleccionar CECOs.

```tsx
<div className="space-y-2">
  {availableCostCenters.map((ceco: any) => {
    const allocation = allocations.find(a => a.costCenterId === ceco.id);
    return (
      <div key={ceco.id} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={!!allocation}
          onChange={(e) => {
            if (e.target.checked) {
              // Auto-distribuir
              const amount = Number(form.montoSinIgv) || 0;
              const currentAllocations = allocations.filter(a => a.costCenterId !== ceco.id);
              const newCecoIds = [...currentAllocations.map(a => a.costCenterId), ceco.id];
              setAllocations(distributeAmount(amount, newCecoIds));
            } else {
              // Redistribuir entre restantes
              setAllocations(prev => { ... });
            }
          }}
        />
        <span className="flex-1 text-sm">{ceco.code} - {ceco.name}</span>
        {allocation && (
          <Input
            type="number"
            step="0.01"
            value={allocation.amount || ""}
            onChange={(e) => { ... }}
            className="w-32 text-sm"
            placeholder="Monto"
          />
        )}
        {allocation && allocation.percentage !== undefined && (
          <span className="text-xs text-slate-600 dark:text-slate-400 w-12 text-right">
            {allocation.percentage.toFixed(1)}%
          </span>
        )}
      </div>
    );
  })}
</div>
```

### Carga automática desde OC
```typescript
useEffect(() => {
  if (hasOC && selectedOC && !form.id) {
    // Auto-cargar periodos (desde hasta)
    if (selectedOC.budgetPeriodFrom && selectedOC.budgetPeriodTo && periods) {
      const fromValue = selectedOC.budgetPeriodFrom.year * 100 + selectedOC.budgetPeriodFrom.month;
      const toValue = selectedOC.budgetPeriodTo.year * 100 + selectedOC.budgetPeriodTo.month;
      const relevantPeriods = periods.filter((p: any) => {
        const pValue = p.year * 100 + p.month;
        return pValue >= fromValue && pValue <= toValue;
      });
      setPeriodIds(relevantPeriods.map((p: any) => p.id));
    }

    // Auto-cargar CECOs
    if (selectedOC.costCenters && selectedOC.costCenters.length > 0) {
      const cecoIds = selectedOC.costCenters.map(cc => cc.costCenterId);
      const amount = Number(form.montoSinIgv) || 0;
      if (amount > 0) {
        setAllocations(distributeAmount(amount, cecoIds));
      }
    }
  }
}, [hasOC, selectedOC, form.id, form.montoSinIgv, periods]);
```

### Listado actualizado
- **Columna "Periodos"**: muestra rango (e.g., "2025-01 → 2025-03") o único periodo.
- **Columna "CECOs"**: muestra chips con códigos de CECOs seleccionados.

```tsx
<Td className="text-xs">
  {inv.periods && inv.periods.length > 0
    ? formatPeriodsRange(inv.periods.map(p => p.period))
    : "-"}
</Td>
<Td className="text-xs">
  {inv.costCenters && inv.costCenters.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {inv.costCenters.map((cc: any) => (
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

## 4. Validaciones Implementadas

### Frontend
1. `hasOC && !form.ocId`: "OC es requerida"
2. `!hasOC && !form.proveedor`: "Proveedor es requerido"
3. `!form.numberNorm`: "Número es requerido"
4. `!form.montoSinIgv || < 0`: "Monto inválido"
5. `periodIds.length === 0`: "Debe seleccionar al menos un periodo"
6. `allocations.length === 0`: "Debe seleccionar al menos un CECO"
7. `Math.abs(totalAllocated - montoSinIgv) > 0.01`: "La suma de las distribuciones no coincide con el monto total"

### Backend
1. **OC no encontrada** (422)
2. **Saldo insuficiente** en OC (422)
3. **Periodos fuera del rango** de OC (422):
   - `periodValue < fromValue || periodValue > toValue`
4. **CECOs no asociados** a OC (422):
   - `invalidCecos = allocations.filter(a => !ocCecoIds.has(a.costCenterId))`
5. **Distribución incorrecta** (422):
   - `Math.abs(totalAllocated - montoSinIgv) > 0.01`
6. **Proveedor/moneda requeridos** cuando no hay OC (422)

---

## 5. Payload de Ejemplo

### POST /invoices (Con OC)
```json
{
  "ocId": 5,
  "docType": "FACTURA",
  "numberNorm": "F001-12345",
  "montoSinIgv": 10000,
  "periodIds": [123, 124, 125],
  "allocations": [
    { "costCenterId": 1, "amount": 5000, "percentage": 50 },
    { "costCenterId": 2, "amount": 3000, "percentage": 30 },
    { "costCenterId": 3, "amount": 2000, "percentage": 20 }
  ],
  "ultimusIncident": "INC-2025-001",
  "detalle": "Pago servicios cloud Q1 2025"
}
```

### POST /invoices (Sin OC)
```json
{
  "docType": "FACTURA",
  "numberNorm": "F002-67890",
  "montoSinIgv": 5000,
  "proveedor": "Proveedor XYZ SAC",
  "moneda": "PEN",
  "periodIds": [123],
  "allocations": [
    { "costCenterId": 4, "amount": 5000, "percentage": 100 }
  ],
  "ultimusIncident": "INC-2025-002",
  "detalle": "Compra equipamiento"
}
```

---

## 6. Mejoras Futuras (Opcionales)

### 6.1 Cálculo de consumo PPTO por periodos seleccionados
Actualmente, el sistema **no bloquea** la creación de facturas si se excede el presupuesto. Para implementar warnings/controles de presupuesto por periodos:

1. **Obtener presupuestos** por (supportId, costCenterId, periodId):
   ```typescript
   const budgets = await prisma.budgetAllocation.findMany({
     where: {
       supportId: data.supportId,
       costCenterId: { in: data.allocations.map(a => a.costCenterId) },
       periodId: { in: data.periodIds }
     }
   });
   ```

2. **Calcular consumo acumulado** por (supportId, costCenterId, periodId):
   ```typescript
   const consumption = await prisma.invoiceCostCenter.findMany({
     where: {
       invoice: {
         oc: { supportId: data.supportId },
         periods: { some: { periodId: { in: data.periodIds } } }
       },
       costCenterId: { in: data.allocations.map(a => a.costCenterId) }
     },
     select: { amount: true, costCenterId: true, invoice: { include: { periods: true } } }
   });
   ```

3. **Prorratear** monto del CECO entre periodos seleccionados (distribución uniforme o custom).

4. **Comparar** contra presupuesto y emitir **warnings** (no bloquear):
   ```typescript
   if (newConsumption > budget) {
     warnings.push({
       message: `CECO ${cecoCode} excede presupuesto en periodo ${periodLabel}`,
       budget,
       consumption: newConsumption,
       excess: newConsumption - budget
     });
   }
   ```

5. **Incluir** warnings en la respuesta del endpoint (no 422, solo información):
   ```json
   {
     "invoice": { ... },
     "budgetWarnings": [
       {
         "cecoCode": "CECO-001",
         "periodLabel": "2025-01",
         "budget": 10000,
         "consumption": 12000,
         "excess": 2000
       }
     ]
   }
   ```

### 6.2 UI para warnings de presupuesto
- **Modal o toast** al guardar factura mostrando excesos por CECO/periodo.
- **Badge** en la distribución por CECO indicando si se excede el presupuesto.
- **Tooltip** con desglose de consumo vs. presupuesto al pasar cursor sobre CECO.

---

## 7. Archivos Modificados

### Base de Datos
- `packages/db/schema.prisma`
- `packages/db/migrations/20251114000001_invoice_periods_costcenters_mn/migration.sql`

### Backend
- `apps/api/src/invoices.ts`

### Frontend
- `apps/web/src/pages/InvoicesPage.tsx`

---

## 8. Pruebas de Aceptación

✅ **Con OC:**
- [x] Al seleccionar una OC, se cargan automáticamente los periodos (desde/hasta) y CECOs asociados.
- [x] Los meses seleccionables están dentro del rango de la OC.
- [x] La distribución por CECO se auto-calcula equitativamente.
- [x] Al guardar, se valida que periodos ⊆ rango OC y CECOs ⊆ CECOs de OC.
- [x] La suma de distribuciones debe igualar el monto total.

✅ **Sin OC:**
- [x] Se desactiva el selector de OC.
- [x] Se habilitan campos manuales de Proveedor y Moneda.
- [x] Se pueden seleccionar cualquier periodo y CECO disponibles.
- [x] Al guardar, se valida que proveedor y moneda no estén vacíos.

✅ **Listado:**
- [x] La columna "Periodos" muestra el rango de periodos (e.g., "2025-01 → 2025-03").
- [x] La columna "CECOs" muestra chips con los códigos de CECOs asociados.
- [x] Al editar una factura, se precargan los periodos y distribución existentes.

✅ **Edición:**
- [x] Se precargan `periodIds` y `allocations` desde la factura existente.
- [x] Se respetan las mismas validaciones que al crear.
- [x] Al cambiar la OC, se re-filtran periodos y CECOs disponibles.

✅ **Build:**
- [x] `pnpm build` pasa sin errores.
- [x] TypeScript compila correctamente.
- [x] Vite genera bundle optimizado.

---

## 9. Notas Finales

- **Compatibilidad hacia atrás**: El schema mantiene campos legacy (e.g., `Invoice.vendorId`, `Invoice.totalForeign`) para no romper código existente.
- **Transacciones**: Todas las operaciones críticas (crear/actualizar factura + periodos + distribución) se ejecutan en transacciones Prisma para garantizar atomicidad.
- **Validación dual**: Frontend valida antes de enviar para mejorar UX; backend valida para garantizar seguridad.
- **Tolerancia de redondeo**: Se acepta una diferencia de hasta 0.01 en la suma de distribuciones para evitar errores por redondeo de decimales.
- **Auto-distribución**: Al seleccionar/deseleccionar CECOs o cambiar el monto total, el sistema redistribuye automáticamente de forma equitativa.

---

## Estado: ✅ Completado

Todos los objetivos del alcance han sido implementados y verificados:
1. ✅ Datos desde OC (CECOs M:N, periodos)
2. ✅ Selector de meses múltiple con validación contra OC
3. ✅ Distribución por CECO con UI intuitiva
4. ✅ Toggle Con OC / Sin OC
5. ✅ Listado actualizado (periodos y CECOs)
6. ✅ Validaciones completas (frontend + backend)
7. ✅ Build exitoso

**Mejora futura opcional**: Implementar cálculo de consumo PPTO por periodos seleccionados con warnings no bloqueantes.

