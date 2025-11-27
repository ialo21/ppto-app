# Estado de Factura Inline - Implementación Completada

**Fecha:** 15 de Octubre de 2025  
**Estado:** ✅ COMPLETADO

## Resumen Ejecutivo

Se implementó el cambio de estado inline mediante chip clickeable con dropdown, eliminando los botones de estado de la columna Acciones y añadiendo optimistic updates para mejor UX.

---

## 🎯 Cambios Realizados

### A) ✅ Chip de Estado Inline

**Nuevo componente:** `apps/web/src/components/StatusChip.tsx`

#### Características

- **Chip clickeable** que muestra el estado actual con colores consistentes
- **Dropdown con todos los estados** disponibles al hacer click
- **Check visual** (✓) en el estado actual seleccionado
- **Loading spinner** durante la mutación
- **Accesibilidad completa:**
  - Cierra con ESC
  - Cierra al hacer click fuera
  - Foco vuelve al chip tras selección
  - Teclado navegable

#### Estados Soportados (7 totales)

```typescript
const INVOICE_STATUSES = [
  { value: "INGRESADO", label: "Ingresado", color: "gray" },
  { value: "EN_APROBACION", label: "En Aprobación", color: "blue" },
  { value: "EN_CONTABILIDAD", label: "En Contabilidad", color: "purple" },
  { value: "EN_TESORERIA", label: "En Tesorería", color: "indigo" },
  { value: "EN_ESPERA_DE_PAGO", label: "En Espera de Pago", color: "yellow" },
  { value: "PAGADO", label: "Pagado", color: "green" },
  { value: "RECHAZADO", label: "Rechazado", color: "red" }
];
```

#### Colores por Estado

| Estado | Color Light | Color Dark |
|--------|-------------|------------|
| INGRESADO | Gray 100/800 | Gray 800/200 |
| EN_APROBACION | Blue 100/800 | Blue 900/200 |
| EN_CONTABILIDAD | Purple 100/800 | Purple 900/200 |
| EN_TESORERIA | Indigo 100/800 | Indigo 900/200 |
| EN_ESPERA_DE_PAGO | Yellow 100/800 | Yellow 900/200 |
| PAGADO | Green 100/800 | Green 900/200 |
| RECHAZADO | Red 100/800 | Red 900/200 |

---

### B) ✅ Columna Acciones Limpia

**Antes:**
```tsx
<Td>
  <Button>Editar</Button>
  <Button>Eliminar</Button>
  <Button>EN_APROBACION</Button>
  <Button>EN_CONTABILIDAD</Button>
  <Button>PAGADO</Button>
  <Button>RECHAZADO</Button>
</Td>
```

**Después:**
```tsx
<Td>
  <Button>Editar</Button>
  <Button>Eliminar</Button>
</Td>
```

✅ Solo acciones genéricas (Editar/Eliminar)  
✅ No más botones de estado  
✅ Interfaz más limpia y clara

---

### C) ✅ Optimistic Updates Robustas

**Implementación en `updateStatusMutation`:**

```typescript
const updateStatusMutation = useMutation({
  onMutate: async ({ id, status }) => {
    // 1. Cancelar refetch en curso
    await queryClient.cancelQueries({ queryKey: ["invoices"] });
    
    // 2. Guardar snapshot
    const previousInvoices = queryClient.getQueryData<Invoice[]>(["invoices"]);
    
    // 3. Actualizar in-place (optimistic)
    queryClient.setQueryData<Invoice[]>(["invoices"], (old) => {
      if (!old) return old;
      return old.map(inv => 
        inv.id === id 
          ? { ...inv, statusCurrent: status }
          : inv
      );
    });
    
    return { previousInvoices };
  },
  
  onError: (error, variables, context) => {
    // Rollback al snapshot
    if (context?.previousInvoices) {
      queryClient.setQueryData(["invoices"], context.previousInvoices);
    }
    toast.error("Error al actualizar estado");
  },
  
  onSuccess: (data, { status }) => {
    const statusLabel = status.replace(/_/g, " ");
    toast.success(`Estado actualizado a ${statusLabel}`);
  },
  
  onSettled: () => {
    // Refetch para consistencia final
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }
});
```

#### Flujo de Actualización

1. **Usuario hace click** → Abre dropdown
2. **Selecciona nuevo estado** → Dropdown cierra
3. **onMutate** → Actualiza UI instantáneamente (optimistic)
4. **Muestra spinner** en el chip afectado
5. **Request al servidor** → PATCH /invoices/:id/status
6. **onSuccess** → Toast de confirmación
7. **onSettled** → Refetch para asegurar consistencia
8. **Si error** → Rollback automático + toast de error

---

### D) ✅ Persistencia de Fila y Orden

**Comportamiento:**

- ✅ La fila **NO desaparece** al cambiar estado
- ✅ Se actualiza **in-place** en la tabla
- ✅ Mantiene **orden de sort** actual
- ✅ Mantiene **filtros** aplicados
- ✅ Mantiene **posición de scroll**
- ✅ Solo desaparece si el filtro activo la excluye (tras onSettled)

**Ejemplo:**

```
Usuario tiene filtro: status = "INGRESADO"
Fila actual: ID 123, status "INGRESADO"

1. Usuario cambia a "EN_APROBACION"
2. onMutate: Actualiza a "EN_APROBACION" in-place
3. Fila sigue visible (optimistic)
4. onSettled: Refetch → fila desaparece (no cumple filtro)
```

---

### E) ✅ Feedback y DX

#### Toasts

**Éxito:**
```
✅ Estado actualizado a EN APROBACION
✅ Estado actualizado a PAGADO
```

**Error:**
```
❌ Error al actualizar estado
❌ [mensaje del backend si disponible]
```

#### Loading Indicator

- **Spinner mini** en el chip mientras se actualiza
- Solo el chip afectado muestra loading
- Otros chips permanecen interactivos

#### Logs de Debug (Solo Dev)

```typescript
// Al iniciar mutación
📤 Actualizando estado factura: { id: 123, status: "PAGADO" }

// Al completar
✅ Estado actualizado: { id: 123, statusCurrent: "PAGADO", ... }

// Si hay error
❌ Error actualizando estado: { error: "...", ... }
```

---

### F) ✅ Backend - Sin Cambios Necesarios

El endpoint ya existía y funciona correctamente:

**Endpoint:** `PATCH /invoices/:id/status`

**Request:**
```json
{
  "status": "EN_APROBACION"
}
```

**Response (200):**
```json
{
  "id": 123,
  "statusCurrent": "EN_APROBACION",
  "updatedAt": "2025-10-15T10:00:00.000Z",
  ...
}
```

**Validación (422):**
```json
{
  "error": "VALIDATION_ERROR",
  "issues": [{
    "path": ["status"],
    "message": "Estado inválido"
  }]
}
```

✅ Estados válidos según schema Zod (línea 27-30 `apps/api/src/invoices.ts`)

---

## 📁 Archivos Modificados

### Nuevos Archivos

1. ✅ `apps/web/src/components/StatusChip.tsx` (113 líneas)
   - Componente reutilizable
   - Maneja dropdown, estados, loading
   - Accesibilidad completa

### Archivos Modificados

2. ✅ `apps/web/src/pages/InvoicesPage.tsx`
   - Importa StatusChip
   - Reemplaza columna Estado (línea 630-638)
   - Elimina botones de estado de Acciones
   - Optimistic updates en mutación (líneas 301-354)

---

## 🎨 Estilo y Tema

### Componente Reutilizable

El `StatusChip` está diseñado para ser reutilizable en otras tablas:

```tsx
import StatusChip from "../components/StatusChip";

<StatusChip
  currentStatus={invoice.statusCurrent}
  onStatusChange={(newStatus) => updateStatus(invoice.id, newStatus)}
  isLoading={isUpdating}
  disabled={false}
/>
```

### Consistencia con Diseño Existente

- ✅ Usa tokens de Tailwind del proyecto
- ✅ Soporta dark mode
- ✅ Colores consistentes con badges actuales
- ✅ Animaciones sutiles (hover, focus)
- ✅ Sin librerías nuevas

---

## ✅ Criterios de Aceptación

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Columna Estado muestra chip clickeable | ✅ | StatusChip renderizado en línea 631 |
| Dropdown muestra todos los estados | ✅ | 7 estados del enum InvStatus |
| Estado actual marcado con check | ✅ | SVG check en opción seleccionada |
| Al seleccionar, cambia y permanece | ✅ | Optimistic update in-place |
| No hay botones de estado en Acciones | ✅ | Eliminados (antes líneas 617-626) |
| Fila no desaparece al actualizar | ✅ | onMutate actualiza sin remover |
| Orden/filtros/paginación conservados | ✅ | No se resetea sort ni filtros |
| Toasts y loaders correctos | ✅ | onSuccess/onError con mensajes |
| Sin IDs visibles | ✅ | Solo labels de estados |
| Sin flicker | ✅ | Optimistic + keepPreviousData |

---

## 🧪 Testing Manual

### Caso 1: Cambio de Estado Exitoso

1. Ir a módulo Facturas
2. Click en chip de estado (ej. "Ingresado")
3. Dropdown aparece con 7 opciones
4. Seleccionar "En Aprobación"
5. **Resultado esperado:**
   - Dropdown cierra
   - Chip muestra spinner brevemente
   - Chip cambia a "En Aprobación" (azul)
   - Toast: "Estado actualizado a EN APROBACION"
   - Fila permanece en la tabla

### Caso 2: Cambio con Filtro Activo

1. Aplicar filtro: Estado = "INGRESADO"
2. Cambiar una fila a "PAGADO"
3. **Resultado esperado:**
   - Fila se actualiza optimisticamente
   - Tras refetch, fila desaparece (no cumple filtro)
   - Sin error ni flicker

### Caso 3: Error de Red

1. Desconectar backend
2. Intentar cambiar estado
3. **Resultado esperado:**
   - Spinner en chip
   - Tras timeout, estado vuelve al anterior (rollback)
   - Toast: "Error al actualizar estado"

### Caso 4: Accesibilidad

1. Tab para navegar a chip
2. Enter para abrir dropdown
3. Flechas para navegar opciones
4. Enter para seleccionar
5. ESC para cerrar sin cambios
6. **Resultado esperado:** Todo funciona con teclado

---

## 🚀 Próximos Pasos Opcionales

### Mejoras Futuras (No Implementadas)

1. **Animación de fade-out** cuando fila se remueve por filtro
2. **Confirmación** para cambios críticos (ej. PAGADO → RECHAZADO)
3. **Historial de cambios** en tooltip del chip
4. **Permisos por rol** (algunos usuarios no pueden cambiar a PAGADO)
5. **Shortcuts de teclado** (Ctrl+1 = INGRESADO, etc.)

### Reutilización en Otros Módulos

El componente `StatusChip` puede usarse en:
- Módulo de Órdenes de Compra (diferentes estados)
- Módulo de Control Lines (estados PROCESADO/PROVISIONADO)
- Cualquier entidad con workflow de estados

**Ejemplo para OC:**
```tsx
// Adaptar estados en StatusChip o crear OCStatusChip
const OC_STATUSES = [
  { value: "PENDIENTE", label: "Pendiente", color: "gray" },
  { value: "APROBACION_VP", label: "En Aprobación VP", color: "blue" },
  // ... etc
];
```

---

## 📊 Métricas de Impacto

### Antes vs Después

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Clicks para cambiar estado | 1 click (botón directo) | 2 clicks (chip + opción) | -1 click |
| Opciones visibles | 4 botones fijos | 7 opciones en dropdown | +75% |
| Espacio en Acciones | ~200px | ~100px | -50% |
| Flicker al actualizar | Sí (fila desaparece) | No (optimistic) | ✅ |
| Feedback visual | Solo toast final | Spinner + toast | ✅ |

### Bundle Size

```
Antes: 762.82 kB (220.52 kB gzipped)
Después: 766.51 kB (221.76 kB gzipped)
Incremento: +3.69 kB (+1.24 kB gzipped)
```

**Razón:** Nuevo componente StatusChip (~3KB)  
**Aceptable:** < 0.5% del bundle total

---

## 🔧 Comandos de Verificación

```bash
# TypeScript
pnpm exec tsc --noEmit
# ✅ Sin errores

# Linter
pnpm lint
# ✅ Sin errores

# Build
pnpm build
# ✅ Compilado exitosamente

# Dev
pnpm dev
# ✅ Servidor corriendo en localhost:5173
```

---

## 📚 Documentación Relacionada

- `INVOICES_MODULE_FINAL_FIXES.md` - Correcciones previas del módulo
- `INVOICE_TIMESTAMPS_FIX.md` - Fix de timestamps P2022
- `INVOICES_OC_INTEGRATION.md` - Integración OC ↔ Facturas

---

## ✅ Conclusión

**Estado de factura inline implementado exitosamente:**

- ✅ Chip clickeable con dropdown de 7 estados
- ✅ Optimistic updates sin flicker
- ✅ Acciones limpias (solo Editar/Eliminar)
- ✅ Feedback visual completo (spinner + toasts)
- ✅ Accesibilidad y teclado funcionales
- ✅ Componente reutilizable
- ✅ Build exitoso sin errores

**UX mejorada:** Cambio de estado más intuitivo, sin perder contexto de la fila.

---

**Fin del documento**

