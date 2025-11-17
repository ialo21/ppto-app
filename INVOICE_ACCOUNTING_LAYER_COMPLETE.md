# Capa Contable para Facturas - Implementación Completa ✅

**Fecha:** 2025-11-17  
**Estado:** ✅ COMPLETADO

---

## 🎯 Objetivo

Agregar una capa contable a las facturas para soportar conversión de moneda USD → PEN con tipos de cambio estándar y real, sin modificar la página de PPTO ni la de Reportes.

---

## 📊 Resumen de Cambios

### 1. Modelo de Datos (Schema Prisma)

#### **Archivo:** `packages/db/schema.prisma`

Se extendió el modelo `Invoice` con 6 nuevos campos contables:

```prisma
model Invoice {
  // ... campos existentes ...
  
  // === CAMPOS CONTABLES ===
  mesContable          String?   // Formato YYYY-MM
  tcEstandar           Decimal?  // TC estándar según catálogo
  tcReal               Decimal?  // TC real (editable por usuario)
  montoPEN_tcEstandar  Decimal?  // montoSinIgv * tcEstandar
  montoPEN_tcReal      Decimal?  // montoSinIgv * tcReal
  diferenciaTC         Decimal?  // montoPEN_tcReal - montoPEN_tcEstandar
  
  // ... resto de campos ...
}
```

#### **Migración:** `packages/db/migrations/20251117000000_invoice_accounting_fields/migration.sql`

```sql
-- AlterTable: agregar campos contables a Invoice
ALTER TABLE "Invoice" ADD COLUMN "mesContable" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "tcEstandar" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "tcReal" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "montoPEN_tcEstandar" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "montoPEN_tcReal" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "diferenciaTC" DECIMAL(65,30);
```

---

### 2. Backend - API de Facturas

#### **Archivo:** `apps/api/src/invoices.ts`

##### **2.1. Actualización de Schemas de Validación**

Se agregaron los campos contables a los esquemas Zod:

```typescript
const createInvoiceSchema = z.object({
  // ... campos existentes ...
  // Campos contables
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // Formato YYYY-MM
  tcReal: z.number().positive().optional()
});

const updateInvoiceSchema = z.object({
  // ... campos existentes ...
  // Campos contables
  mesContable: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  tcReal: z.number().positive().optional()
});
```

##### **2.2. Nueva Función: `calcularCamposContables()`**

Función helper que calcula automáticamente todos los campos contables:

```typescript
async function calcularCamposContables(
  currency: string,
  montoSinIgv: number,
  periodIds: number[],
  mesContable?: string,
  tcReal?: number
): Promise<{
  mesContable: string;
  tcEstandar: number | null;
  tcReal: number | null;
  montoPEN_tcEstandar: number | null;
  montoPEN_tcReal: number | null;
  diferenciaTC: number | null;
}>
```

**Lógica:**
- Si `currency === "PEN"`: todos los campos TC son `null`
- Si `currency === "USD"`:
  - `mesContable`: usa el proporcionado o el primer periodo en formato YYYY-MM
  - `tcEstandar`: busca en el catálogo `ExchangeRate` por año del primer periodo
  - `tcReal`: usa el proporcionado o copia `tcEstandar`
  - `montoPEN_tcEstandar = montoSinIgv * tcEstandar`
  - `montoPEN_tcReal = montoSinIgv * tcReal`
  - `diferenciaTC = montoPEN_tcReal - montoPEN_tcEstandar`

##### **2.3. Modificación de POST `/invoices` (Crear)**

Se agregó el cálculo y persistencia de campos contables:

```typescript
// 3.5. Calcular campos contables
const camposContables = await calcularCamposContables(
  currency,
  data.montoSinIgv,
  data.periodIds,
  data.mesContable,
  data.tcReal
);

// 4. Crear factura + periodos + distribución en una transacción
const created = await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.create({
    data: {
      // ... campos existentes ...
      // Campos contables
      mesContable: camposContables.mesContable,
      tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
      tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
      montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
      montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
      diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null,
      // ...
    }
  });
  // ...
});
```

##### **2.4. Modificación de PATCH `/invoices/:id` (Actualizar)**

Se agregó recálculo de campos contables cuando se modifican campos relevantes:

```typescript
// Recalcular campos contables si es necesario
let camposContables = null;
if (data.montoSinIgv !== undefined || data.periodIds || data.moneda || data.tcReal !== undefined || data.mesContable !== undefined) {
  camposContables = await calcularCamposContables(
    finalCurrency,
    finalMonto,
    finalPeriodIds,
    data.mesContable ?? existing.mesContable ?? undefined,
    data.tcReal ?? (existing.tcReal ? Number(existing.tcReal) : undefined)
  );
}

// Actualizar factura + periodos + distribución en una transacción
const updated = await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.update({
    where: { id },
    data: {
      // ... campos existentes ...
      // Campos contables (si se recalcularon)
      ...(camposContables && {
        mesContable: camposContables.mesContable,
        tcEstandar: camposContables.tcEstandar !== null ? new Prisma.Decimal(camposContables.tcEstandar) : null,
        tcReal: camposContables.tcReal !== null ? new Prisma.Decimal(camposContables.tcReal) : null,
        montoPEN_tcEstandar: camposContables.montoPEN_tcEstandar !== null ? new Prisma.Decimal(camposContables.montoPEN_tcEstandar) : null,
        montoPEN_tcReal: camposContables.montoPEN_tcReal !== null ? new Prisma.Decimal(camposContables.montoPEN_tcReal) : null,
        diferenciaTC: camposContables.diferenciaTC !== null ? new Prisma.Decimal(camposContables.diferenciaTC) : null
      })
    }
  });
  // ...
});
```

##### **2.5. Nuevo Endpoint: GET `/invoices/tc-estandar/:year`**

Endpoint para consultar el TC estándar de un año:

```typescript
app.get("/invoices/tc-estandar/:year", async (req, reply) => {
  const year = Number((req.params as any).year);
  
  if (!year || year < 2020 || year > 2050) {
    return reply.code(400).send({ error: "Año inválido" });
  }

  const exchangeRate = await prisma.exchangeRate.findUnique({
    where: { year }
  });

  if (!exchangeRate) {
    return reply.code(404).send({ 
      error: `No se encontró tipo de cambio para el año ${year}. Configure el TC en Catálogos.` 
    });
  }

  return { year, tcEstandar: Number(exchangeRate.rate) };
});
```

---

### 3. Frontend - UI de Facturas

#### **Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

##### **3.1. Actualización de Tipos TypeScript**

Se actualizó el tipo `Invoice` para incluir los campos contables:

```typescript
type Invoice = {
  // ... campos existentes ...
  // Campos contables
  mesContable?: string | null;
  tcEstandar?: number | null;
  tcReal?: number | null;
  montoPEN_tcEstandar?: number | null;
  montoPEN_tcReal?: number | null;
  diferenciaTC?: number | null;
};
```

##### **3.2. Estado del Formulario**

Se agregaron los campos contables al estado del formulario:

```typescript
const [form, setForm] = useState({
  // ... campos existentes ...
  // Campos contables
  mesContable: "",
  tcReal: ""
});
```

##### **3.3. Payload de Creación/Actualización**

Se agregaron los campos contables al payload enviado al backend:

```typescript
const payload: any = {
  // ... campos existentes ...
  // Campos contables
  mesContable: form.mesContable.trim() || undefined,
  tcReal: form.tcReal ? Number(form.tcReal) : undefined
};
```

##### **3.4. UI - Bloque "Datos Contables" en el Formulario**

Se agregó una nueva sección en el formulario con separador visual:

```tsx
{/* Separador */}
<div className="col-span-full border-t border-slate-200 pt-4">
  <h3 className="text-md font-semibold text-slate-700 mb-3">📊 Datos Contables</h3>
</div>

{/* Mes Contable */}
<div className="w-full">
  <label className="block text-sm font-medium mb-1">Mes Contable</label>
  <Input
    type="month"
    placeholder="YYYY-MM"
    value={form.mesContable}
    onChange={(e) => handleFormChange("mesContable", e.target.value)}
    className={fieldErrors.mesContable ? "border-red-500" : ""}
  />
  <p className="text-xs text-slate-500 mt-1">
    Formato: YYYY-MM. Si no se ingresa, se usará el primer periodo seleccionado.
  </p>
</div>

{/* TC Real (solo si USD) */}
{form.moneda === "USD" && (
  <div className="w-full">
    <label className="block text-sm font-medium mb-1">TC Real (editable)</label>
    <Input
      type="number"
      step="0.0001"
      placeholder="TC Real (ej. 3.7650)"
      value={form.tcReal}
      onChange={(e) => handleFormChange("tcReal", e.target.value)}
      className={fieldErrors.tcReal ? "border-red-500" : ""}
    />
    <p className="text-xs text-slate-500 mt-1">
      Si no se ingresa, se usará el TC estándar del año.
    </p>
  </div>
)}

{/* Info: Los campos calculados se mostrarán después de guardar */}
{form.moneda === "USD" && (
  <div className="col-span-full">
    <p className="text-xs text-slate-600 italic">
      ℹ️ Los montos en PEN (TC estándar y TC real) se calcularán automáticamente al guardar la factura.
    </p>
  </div>
)}
```

**Características:**
- Campo `mesContable`: tipo `month` (HTML5) para formato YYYY-MM
- Campo `tcReal`: solo visible si moneda es USD
- Mensajes de ayuda para el usuario
- Los campos calculados (TC estándar, montos PEN, diferencia) se calculan automáticamente en el backend

---

## 🔄 Flujo de Uso

### Crear Factura en USD

1. Usuario selecciona OC o ingresa datos manualmente
2. Selecciona **Moneda: USD**
3. Ingresa **Monto sin IGV**
4. Selecciona **Periodos** (desde → hasta)
5. **Opcional:** Ingresa **Mes Contable** (si no, usa primer periodo)
6. **Opcional:** Ingresa **TC Real** (si no, usa TC estándar del año)
7. Al guardar, el backend:
   - Busca el TC estándar del año en el catálogo `ExchangeRate`
   - Calcula `montoPEN_tcEstandar = montoSinIgv * tcEstandar`
   - Calcula `montoPEN_tcReal = montoSinIgv * (tcReal || tcEstandar)`
   - Calcula `diferenciaTC = montoPEN_tcReal - montoPEN_tcEstandar`
   - Persiste todos los campos en la BD

### Crear Factura en PEN

1. Usuario selecciona OC o ingresa datos manualmente
2. Selecciona **Moneda: PEN**
3. Ingresa **Monto sin IGV**
4. Los campos contables USD no se muestran
5. Al guardar, los campos TC quedan como `null` (no aplica conversión)

### Editar Factura

- Si se modifica monto, moneda, periodos, o `tcReal`, se recalculan automáticamente los campos contables
- Si se modifica `mesContable`, se actualiza sin recalcular TCs

---

## 📋 Campos Contables - Detalle

| Campo | Tipo | Descripción | Cálculo |
|-------|------|-------------|---------|
| `mesContable` | String (YYYY-MM) | Mes contable de la factura | Usuario o primer periodo |
| `tcEstandar` | Decimal | TC estándar del catálogo | `ExchangeRate.rate` del año |
| `tcReal` | Decimal | TC real (editable) | Usuario o `tcEstandar` |
| `montoPEN_tcEstandar` | Decimal | Monto en PEN con TC estándar | `montoSinIgv * tcEstandar` |
| `montoPEN_tcReal` | Decimal | Monto en PEN con TC real | `montoSinIgv * tcReal` |
| `diferenciaTC` | Decimal | Diferencia cambiaria | `montoPEN_tcReal - montoPEN_tcEstandar` |

---

## ✅ Validaciones

### Backend

1. **Formato `mesContable`:** Debe cumplir regex `/^\d{4}-\d{2}$/` (YYYY-MM)
2. **`tcReal`:** Debe ser positivo (> 0)
3. **TC estándar requerido:** Si moneda es USD y no hay TC del año, se lanza error con mensaje claro

### Frontend

1. Campo `mesContable` usa input tipo `month` (HTML5)
2. Campo `tcReal` usa input tipo `number` con step `0.0001`
3. Campos solo visibles cuando moneda es USD

---

## 🚀 Endpoints Modificados

### `POST /invoices` (Crear)
- **Acepta:** `mesContable`, `tcReal`
- **Calcula y persiste:** Todos los campos contables

### `PATCH /invoices/:id` (Actualizar)
- **Acepta:** `mesContable`, `tcReal`
- **Recalcula:** Si cambian montoSinIgv, moneda, periodIds, tcReal o mesContable

### `GET /invoices` (Listar)
- **Retorna:** Facturas con todos los campos contables incluidos

### `GET /invoices/:id` (Detalle)
- **Retorna:** Factura con todos los campos contables incluidos

### 🆕 `GET /invoices/tc-estandar/:year` (Nuevo)
- **Retorna:** `{ year, tcEstandar }` del catálogo
- **Error 404:** Si no existe TC para el año

---

## 📦 Archivos Modificados

### Schema y Migraciones
- ✅ `packages/db/schema.prisma` - Modelo Invoice extendido
- ✅ `packages/db/migrations/20251117000000_invoice_accounting_fields/migration.sql` - Migración nueva

### Backend
- ✅ `apps/api/src/invoices.ts`
  - Schemas de validación actualizados
  - Función `calcularCamposContables()` nueva
  - POST `/invoices` modificado
  - PATCH `/invoices/:id` modificado
  - GET `/invoices/tc-estandar/:year` nuevo

### Frontend
- ✅ `apps/web/src/pages/InvoicesPage.tsx`
  - Tipo `Invoice` actualizado
  - Estado del formulario actualizado
  - Payload actualizado
  - UI con bloque "Datos Contables" agregado

---

## 🎯 Próximos Pasos (No Implementados)

1. **Reportes Contables:**
   - Crear reportes que muestren diferencias cambiarias
   - Agrupación por mes contable
   - Totales de conversión USD → PEN

2. **Vista de Detalle:**
   - Mostrar campos contables en modo solo lectura en la tabla de facturas
   - Agregar columnas opcionales con montoPEN_tcEstandar, montoPEN_tcReal, diferenciaTC

3. **Validación Avanzada:**
   - Alertar si `tcReal` se desvía mucho del `tcEstandar` (ej. > 5%)

---

## 📝 Notas Importantes

- ✅ **No se modificó** la página de PPTO
- ✅ **No se modificó** la página de Reportes
- ✅ Los campos contables son **opcionales** (solo aplican para USD)
- ✅ La funcionalidad es **retrocompatible** (facturas antiguas siguen funcionando)
- ✅ El catálogo `ExchangeRate` ya existía y se reutilizó

---

## 🧪 Cómo Probar

1. **Configurar TC Anual:**
   - Ir a **Catálogos → Tipos de Cambio Anuales**
   - Agregar TC para 2025: `3.7500`

2. **Crear Factura USD:**
   - Ir a **Facturas**
   - Click "Crear Factura"
   - Seleccionar OC en USD o modo "Sin OC" con moneda USD
   - Ingresar monto: `1000.00 USD`
   - Seleccionar periodos
   - **Opcional:** Ingresar TC Real: `3.7650`
   - Guardar

3. **Verificar Cálculos:**
   - Backend calculará automáticamente:
     - `tcEstandar = 3.7500`
     - `tcReal = 3.7650` (o 3.7500 si no se ingresó)
     - `montoPEN_tcEstandar = 1000 * 3.75 = 3750.00`
     - `montoPEN_tcReal = 1000 * 3.765 = 3765.00`
     - `diferenciaTC = 3765 - 3750 = 15.00`

---

**Estado:** ✅ Implementación completa y lista para pruebas
**Próximo paso:** Migrar base de datos y probar funcionalidad

