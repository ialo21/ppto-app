# Facturas - Correcciones Finales y Optimizaciones

**Fecha:** 15 de Octubre de 2025  
**Estado:** ✅ COMPLETADO

## Resumen Ejecutivo

Se implementaron todas las correcciones solicitadas para el módulo de Facturas, dejándolo 100% funcional y robusto. Se corrigieron:
- Panel de información OC con contraste adecuado
- Inputs con foco estable
- Validaciones 422 con errores por campo
- Listado completo con ordenamiento
- Prefetch independiente de OCs
- Coherencia endpoints Front↔Back

---

## 1. Panel OC - Contraste Mejorado ✅

### Cambio Realizado
**Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

**Antes:**
```tsx
bg-slate-100 dark:bg-slate-800
```

**Después:**
```tsx
bg-slate-50 dark:bg-slate-900
```

### Resultado
- Usa tokens de tema consistentes (slate-50/slate-900)
- Excelente legibilidad en modo claro y oscuro
- Mantiene el border `border-slate-200 dark:border-slate-700`

---

## 2. Inputs Estables - Sin Pérdida de Foco ✅

### Problema
Los inputs perdían foco o se autocompletaban debido a:
- `fieldErrors` en dependencias del `useCallback`
- Handler se recreaba en cada cambio
- Re-renders innecesarios

### Solución
**Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

```tsx
// ❌ ANTES: Handler inestable
const handleFormChange = useCallback((field: string, value: string) => {
  setForm(prev => ({ ...prev, [field]: value }));
  if (fieldErrors[field]) {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
}, [fieldErrors]); // ⚠️ Dependencia cambia constantemente

// ✅ DESPUÉS: Handler estable
const handleFormChange = useCallback((field: string, value: string) => {
  setForm(prev => ({ ...prev, [field]: value }));
  setFieldErrors(prev => {
    if (!prev[field]) return prev; // Evita re-render si no hay cambio
    const newErrors = { ...prev };
    delete newErrors[field];
    return newErrors;
  });
}, []); // ✅ Sin dependencias - referencia estable
```

### Resultado
- Inputs no pierden foco al escribir
- Performance optimizada
- UX fluida

---

## 3. Endpoint Consistency - `/ocs` vs `/oc` ✅

### Problema
Frontend llamaba a `/oc` (singular) pero backend expone `/ocs` (plural)

### Correcciones

**Backend:** `apps/api/src/oc.ts`
- ✅ Rutas: `/ocs`, `/ocs/:id`, `/ocs/export/csv` (plural consistente)

**Frontend:** `apps/web/src/pages/InvoicesPage.tsx`
```tsx
// ❌ ANTES
const ocsQuery = useQuery<OC[]>({
  queryKey: ["ocs"],
  queryFn: async () => (await api.get("/oc")).data // ⚠️ Endpoint incorrecto
});

// ✅ DESPUÉS
const ocsQuery = useQuery<OC[]>({
  queryKey: ["ocs"],
  queryFn: async () => (await api.get("/ocs")).data, // ✅ Endpoint correcto
  staleTime: 5 * 60 * 1000, // 5 minutos
});
```

---

## 4. Prefetch de OCs - Carga Independiente ✅

### Implementación
**Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

```tsx
// Prefetch on component mount
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data,
    staleTime: 5 * 60 * 1000,
  });
}, [queryClient]);
```

### Características
- ✅ Carga automática al montar la página de Facturas
- ✅ No depende de visitar el módulo de OCs primero
- ✅ Cache con `staleTime` de 5 minutos
- ✅ Invalidación automática al crear/editar factura

**Query key estable:** `["ocs"]`

### Invalidación de Cache
```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["ocs"] }); // ✅ Actualiza consumo
}
```

---

## 5. Validación 422 con `issues` por Campo ✅

### Backend
**Archivo:** `apps/api/src/invoices.ts`

#### Schema Zod
```typescript
const createInvoiceSchema = z.object({
  ocId: z.number().int().positive({ message: "OC es requerida" }),
  docType: z.enum(["FACTURA", "NOTA_CREDITO"], { message: "Tipo inválido" }),
  numberNorm: z.string().min(1, "Número es requerido"),
  montoSinIgv: z.number().nonnegative({ message: "Monto debe ser mayor o igual a 0" }),
  ultimusIncident: z.string().optional(),
  detalle: z.string().optional()
});
```

#### Respuesta 422
```typescript
if (!parsed.success) {
  return reply.code(422).send({
    error: "VALIDATION_ERROR",
    issues: parsed.error.errors.map(err => ({
      path: err.path,        // ["ocId"] o ["montoSinIgv"]
      message: err.message   // "OC es requerida"
    }))
  });
}
```

#### Validaciones de Negocio

**FACTURA:** No puede exceder saldo disponible
```typescript
if (data.docType === "FACTURA") {
  if (data.montoSinIgv > saldoDisponible) {
    return reply.code(422).send({
      error: "VALIDATION_ERROR",
      issues: [{
        path: ["montoSinIgv"],
        message: `El monto (${data.montoSinIgv.toFixed(2)}) excede el saldo disponible de la OC (${saldoDisponible.toFixed(2)} ${oc.moneda})`
      }]
    });
  }
}
```

**NOTA_CREDITO:** No puede restar más de lo consumido
```typescript
else if (data.docType === "NOTA_CREDITO") {
  if (data.montoSinIgv > consumoActual) {
    return reply.code(422).send({
      error: "VALIDATION_ERROR",
      issues: [{
        path: ["montoSinIgv"],
        message: `La nota de crédito (${data.montoSinIgv.toFixed(2)}) no puede ser mayor al consumo actual (${consumoActual.toFixed(2)} ${oc.moneda})`
      }]
    });
  }
}
```

### Frontend
**Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

```tsx
onError: (error: any) => {
  if (error.response?.status === 422 && error.response?.data?.issues) {
    const errors: Record<string, string> = {};
    error.response.data.issues.forEach((issue: any) => {
      const field = issue.path.join("."); // "ocId" o "montoSinIgv"
      errors[field] = issue.message;
    });
    setFieldErrors(errors);
    toast.error("Revisa los campos resaltados");
    
    // Debug log (solo desarrollo)
    if (import.meta.env.DEV) {
      console.error("❌ Errores de validación backend:", errors);
      console.error("❌ Response completo:", error.response?.data);
    }
  }
}
```

### Logs de Depuración (Solo Dev)

**Backend:**
```typescript
if (process.env.NODE_ENV === "development") {
  console.log("📥 POST /invoices - Payload recibido:", JSON.stringify(req.body, null, 2));
}
```

**Frontend:**
```typescript
if (import.meta.env.DEV) {
  console.log("📤 Payload factura:", JSON.stringify(payload, null, 2));
}
```

---

## 6. Listado - Columnas Completas y Ordenamiento ✅

### Columnas del Listado
**Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

```tsx
<thead>
  <tr>
    <Th onClick={() => handleSort("numberNorm")}>Número ↑↓</Th>
    <Th onClick={() => handleSort("docType")}>Tipo ↑↓</Th>
    <Th onClick={() => handleSort("numeroOc")}>OC ↑↓</Th>
    <Th onClick={() => handleSort("proveedor")}>Proveedor ↑↓</Th>
    <Th onClick={() => handleSort("currency")}>Moneda ↑↓</Th>
    <Th onClick={() => handleSort("montoSinIgv")}>Monto sin IGV ↑↓</Th>
    <Th onClick={() => handleSort("paquete")}>Paquete ↑↓</Th>          {/* ✅ Nueva */}
    <Th onClick={() => handleSort("concepto")}>Concepto ↑↓</Th>        {/* ✅ Nueva */}
    <Th onClick={() => handleSort("ceco")}>CECO ↑↓</Th>                {/* ✅ Nueva */}
    <Th onClick={() => handleSort("ultimusIncident")}>Incidente ↑↓</Th> {/* ✅ Nueva */}
    <Th onClick={() => handleSort("statusCurrent")}>Estado ↑↓</Th>
    <Th>Acciones</Th>
  </tr>
</thead>
```

### Datos de Columnas Nuevas
```tsx
<Td>{inv.oc?.support?.expensePackage?.name || "-"}</Td>
<Td>{inv.oc?.support?.expenseConcept?.name || "-"}</Td>
<Td>{(inv.oc?.ceco?.name || inv.oc?.support?.costCenter?.name) || "-"}</Td>
<Td className="text-xs">{inv.ultimusIncident || "-"}</Td>
```

### Ordenamiento

**Orden por Defecto:**
```tsx
const DEFAULT_SORT = { key: "createdAt", direction: "desc" as const };
```

**Handler de Ordenamiento:**
```tsx
const handleSort = useCallback((key: string) => {
  setSortConfig(prev => {
    if (prev.key === key) {
      // Ciclo: asc -> desc -> default
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return DEFAULT_SORT; // ✅ Vuelve al default
      return { key, direction: "asc" };
    } else {
      return { key, direction: "asc" };
    }
  });
}, []);
```

**Reset al Cambiar Filtros:**
```tsx
<Select
  value={filters.status}
  onChange={e => {
    setFilters(f => ({ ...f, status: e.target.value }));
    setSortConfig(DEFAULT_SORT); // ✅ Restaura orden por defecto
  }}
>
```

### Lógica de Ordenamiento
```tsx
switch (sortConfig.key) {
  case "paquete":
    aValue = a.oc?.support?.expensePackage?.name || "";
    bValue = b.oc?.support?.expensePackage?.name || "";
    break;
  case "concepto":
    aValue = a.oc?.support?.expenseConcept?.name || "";
    bValue = b.oc?.support?.expenseConcept?.name || "";
    break;
  case "ceco":
    aValue = (a.oc?.ceco?.name || a.oc?.support?.costCenter?.name) || "";
    bValue = (b.oc?.ceco?.name || b.oc?.support?.costCenter?.name) || "";
    break;
  case "ultimusIncident":
    aValue = a.ultimusIncident || "";
    bValue = b.ultimusIncident || "";
    break;
  // ... otras columnas
}
```

---

## 7. Correcciones de TypeScript ✅

### Table Components
**Archivo:** `apps/web/src/components/ui/Table.tsx`

**Antes:**
```tsx
export function Th({ children }: {children: React.ReactNode}){ 
  return <th className="...">{children}</th>; 
}
```

**Después:**
```tsx
import { cn } from "../../lib/ui";

export function Th({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return <th className={cn("...", className)} {...props}>{children}</th>;
}
```

### Benefits
- ✅ Acepta `className` y otros props HTML
- ✅ Compatible con eventos `onClick` para sorting
- ✅ Sin errores de TypeScript

### Settings Page Fixes
**Archivo:** `apps/web/src/pages/SettingsPage.tsx`

Corregido:
- ✅ Removido campo `code` de `managementForm` (no existe en schema)
- ✅ Removido campo `code` de `areaForm` (no existe en schema)
- ✅ Corregido `management` → `managementId` en `supportForm`

---

## 8. Coherencias Finales ✅

### Enums
```typescript
docType: "FACTURA" | "NOTA_CREDITO"
```

### Moneda y Proveedor
- ✅ Se heredan de la OC (read-only)
- ✅ No se envía `vendorId` manualmente
- ✅ Backend asigna `currency: oc.moneda`

### Reglas de Consumo
```typescript
// FACTURA suma al consumo
consumo += monto;

// NOTA_CREDITO resta del consumo
consumo -= monto;
```

### IDs Ocultos
- ✅ IDs usados internamente (keys, valores)
- ✅ UI muestra labels/nombres
- ✅ Selects usan value={id} con display de nombres

---

## 9. Testing y Build ✅

### TypeScript Check
```bash
cd apps/web
pnpm exec tsc --noEmit
```
**Resultado:** ✅ Sin errores

### Backend Build
```bash
cd apps/api
pnpm build
```
**Resultado:** ✅ Compilado exitosamente

### Frontend Build
```bash
cd apps/web
pnpm build
```
**Resultado:** ✅ Compilado exitosamente
- Output: `dist/assets/index-BKXGGgX0.js` (762.82 kB)
- Gzipped: 220.52 kB

### Linter
**Resultado:** ✅ Sin errores

---

## 10. Endpoints Tocados

### Backend API (`apps/api/src/invoices.ts`)
- `GET /invoices` - Lista con joins (OC, Support, Paquete, Concepto, CECO)
- `POST /invoices` - Validación 422 con issues por campo
- `PATCH /invoices/:id` - Actualización con validación
- `GET /invoices/oc/:ocId/consumo` - Cálculo de saldo disponible
- `PATCH /invoices/:id/status` - Cambio de estado
- `GET /invoices/export/csv` - Exportación

### Backend OC (`apps/api/src/oc.ts`)
- `GET /ocs` - Lista de OCs para prefetch
- `GET /ocs/:id` - Detalle de OC
- `POST /ocs` - Crear OC (invalida cache en frontend)
- `PATCH /ocs/:id` - Actualizar OC

### Frontend Queries
```tsx
["invoices"]              // Lista de facturas
["ocs"]                   // Lista de OCs (prefetch)
["invoices", "oc", id, "consumo"]  // Consumo de OC específica
```

---

## 11. Orden por Defecto del Listado

**Default:** `createdAt DESC` (más recientes primero)

### Comportamiento
1. **Al cargar la página:** `createdAt DESC`
2. **Al hacer clic en columna:** Alterna `ASC → DESC → Default`
3. **Al cambiar filtros:** Vuelve a `createdAt DESC`
4. **Al refrescar datos:** Mantiene orden actual (no reset)

### Implementación
```tsx
const DEFAULT_SORT = { key: "createdAt", direction: "desc" as const };

// Reset en filtros
onChange={e => {
  setFilters(f => ({ ...f, status: e.target.value }));
  setSortConfig(DEFAULT_SORT);
}}
```

---

## 12. Prefetch de OCs - Funcionamiento

### Estrategia
```tsx
// 1. Query con staleTime
const ocsQuery = useQuery<OC[]>({
  queryKey: ["ocs"],
  queryFn: async () => (await api.get("/ocs")).data,
  staleTime: 5 * 60 * 1000, // ✅ Cache por 5 minutos
});

// 2. Prefetch al montar componente
useEffect(() => {
  queryClient.prefetchQuery({
    queryKey: ["ocs"],
    queryFn: async () => (await api.get("/ocs")).data,
    staleTime: 5 * 60 * 1000,
  });
}, [queryClient]);

// 3. Invalidación al crear/editar factura
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["ocs"] }); // ✅ Actualiza consumo
}
```

### Ventajas
- ✅ Carga inmediata al entrar a Facturas
- ✅ No requiere visitar módulo de OCs primero
- ✅ Cache compartida entre módulos
- ✅ Actualización automática al modificar datos

---

## 13. Archivos Modificados

### Frontend
1. ✅ `apps/web/src/pages/InvoicesPage.tsx` - Módulo principal
2. ✅ `apps/web/src/components/ui/Table.tsx` - Componentes con props
3. ✅ `apps/web/src/pages/SettingsPage.tsx` - Correcciones de tipos
4. ✅ `apps/web/package.json` - Añadido `@types/lodash`

### Backend
- ✅ `apps/api/src/invoices.ts` - Ya estaba correcto (validación 422)
- ✅ `apps/api/src/oc.ts` - Ya estaba correcto (endpoints `/ocs`)

---

## 14. Resumen de Cambios

| Ítem | Estado | Descripción |
|------|--------|-------------|
| Panel OC Contraste | ✅ | `bg-slate-50 dark:bg-slate-900` (antes `bg-slate-100 dark:bg-slate-800`) |
| Inputs Estables | ✅ | `useCallback` sin dependencias, sin pérdida de foco |
| Endpoint Consistency | ✅ | Frontend usa `/ocs` (plural) consistente con backend |
| Prefetch OCs | ✅ | `useEffect` + `prefetchQuery` con `staleTime: 5min` |
| Validación 422 | ✅ | Backend retorna `{error, issues:[{path,message}]}` |
| Mapeo Frontend | ✅ | `issues.forEach` → `setFieldErrors` + toast |
| Columnas Completas | ✅ | Paquete, Concepto, CECO, Incidente Ultimus |
| Sorting | ✅ | Click columnas, ciclo ASC→DESC→Default |
| Reset Orden | ✅ | Al cambiar filtros vuelve a `createdAt DESC` |
| TypeScript | ✅ | Sin errores, `Table` acepta props |
| Build Backend | ✅ | Compilado sin errores |
| Build Frontend | ✅ | Compilado sin errores (762KB gzipped 220KB) |
| Linter | ✅ | Sin errores |

---

## 15. Logs de Depuración (Solo Dev)

### Flag Automático
Se usa `import.meta.env.DEV` (frontend) y `process.env.NODE_ENV === "development"` (backend)

### Logs Backend
```
📥 POST /invoices - Payload recibido: {...}
❌ Validación Zod fallida: [...]
❌ OC con ID X no encontrada
✅ Factura creada exitosamente: 123
```

### Logs Frontend
```
📤 Payload factura: {...}
❌ Errores de validación backend: { montoSinIgv: "..." }
❌ Response completo: { error: "VALIDATION_ERROR", issues: [...] }
```

---

## 16. Próximos Pasos (Opcional)

### Performance
- Considerar paginación si hay >1000 facturas
- Lazy loading de columnas CECO/Paquete/Concepto
- Code splitting para reducir bundle inicial

### Features
- Filtro avanzado por rango de fechas
- Exportación Excel con columnas nuevas
- Búsqueda full-text en número de factura

### UX
- Loading skeleton en lugar de "Cargando..."
- Confirmación visual al guardar (animación)
- Shortcuts de teclado (Ctrl+S para guardar)

---

## Conclusión

✅ **Módulo de Facturas 100% operativo y robusto**

- Todos los inputs estables y validados
- Panel OC con excelente contraste
- Validaciones 422 con mensajes por campo
- Listado completo con ordenamiento funcional
- Prefetch de OCs independiente del módulo
- TypeScript, linter y builds sin errores

**Contracto Front↔Back alineado y documentado.**

---

**Fin del documento**

