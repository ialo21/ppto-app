# 📊 Botón Status + Timeline de Estados en Facturas

## ✅ Implementación Completada

Se agregó el botón **Status** con timeline de estados en las tarjetas del **Listado de Facturas**, siguiendo el mismo patrón visual y funcional de Órdenes de Compra.

---

## 🎯 Características Implementadas

### **1. Botón Status en Tarjetas**
- ✅ Ubicado junto al botón "Ver Detalle" en cada tarjeta
- ✅ Icono de reloj (`Clock`) para consistencia visual
- ✅ Abre modal con timeline de estados
- ✅ Accesible en modo viewer (solo lectura)

### **2. Timeline de Estados**
- ✅ Muestra flujo completo de estados de la factura
- ✅ Indica estado actual con badge "Actual" y ring visual
- ✅ Muestra fechas reales del historial de cambios
- ✅ Estados completados con ícono de check verde
- ✅ Estados pendientes con círculo gris
- ✅ Líneas conectoras verdes entre estados alcanzados

### **3. Flujo Normal de Estados**
```
INGRESADO → EN_APROBACION → EN_CONTABILIDAD → 
EN_TESORERIA → EN_ESPERA_DE_PAGO → PAGADO
```

**RECHAZADO** NO aparece en el flujo normal, solo cuando la factura fue rechazada.

### **4. Casos Especiales**

#### **Factura Rechazada:**
- Timeline muestra TODOS los estados por los que pasó (del historial)
- Banner rojo al final indicando rechazo
- Ícono X rojo en el paso "RECHAZADO"
- Fecha del rechazo

#### **Factura Pagada:**
- Banner verde al final indicando pago exitoso
- Ícono check verde

---

## 📁 Archivos Creados/Modificados

### **Nuevo Componente:**
- ✅ `apps/web/src/components/InvoiceStatusTimeline.tsx`
  - Basado en `OcStatusTimeline.tsx`
  - Configuración de 7 estados según enum `InvStatus` del schema
  - Lógica de flujo ideal vs flujo rechazado
  - Formateo de fechas

### **Modificado:**
- ✅ `apps/web/src/pages/invoices/InvoiceListadoPage.tsx`
  - Import de `InvoiceStatusTimeline`
  - Estado para modal de timeline
  - Query para obtener historial (`/invoices/:id/history`)
  - Handlers `handleOpenTimeline` y `handleCloseTimeline`
  - Botón "Status" en `InvoiceCard`
  - Modal de timeline

---

## 🔍 Fuentes de Datos

### **Enum de Estados (schema.prisma):**
```prisma
enum InvStatus {
  INGRESADO 
  EN_APROBACION 
  EN_CONTABILIDAD 
  EN_TESORERIA 
  EN_ESPERA_DE_PAGO 
  PAGADO 
  RECHAZADO
}
```

### **Endpoint de Historial:**
```typescript
GET /invoices/:id/history
// Retorna: StatusHistoryEntry[]
// Permiso: facturas:listado
```

### **Tabla de Base de Datos:**
```
InvoiceStatusHistory
├── id
├── invoiceId
├── status
├── changedAt
└── note (opcional)
```

---

## 🎨 Diseño y Colores

| Estado | Color Badge | Color Ícono |
|--------|-------------|-------------|
| INGRESADO | Gris | Gris |
| EN_APROBACION | Amarillo | Amarillo |
| EN_CONTABILIDAD | Azul | Azul |
| EN_TESORERIA | Morado | Morado |
| EN_ESPERA_DE_PAGO | Naranja | Naranja |
| PAGADO | Verde | Verde |
| RECHAZADO | Rojo | Rojo |

---

## 🧪 Pruebas Sugeridas

### **1. Factura en Estado Inicial (INGRESADO):**
- ✅ Ver que solo el primer estado tiene check
- ✅ Los demás estados aparecen como "Pendiente"

### **2. Factura en Estado Intermedio (EN_CONTABILIDAD):**
- ✅ Estados anteriores marcados como completados
- ✅ Estado actual tiene badge "Actual" y ring
- ✅ Estados futuros aparecen pendientes

### **3. Factura Rechazada:**
- ✅ Verificar que "RECHAZADO" aparece en el timeline
- ✅ Banner rojo al final
- ✅ Fecha del rechazo visible

### **4. Factura Pagada:**
- ✅ Todos los estados del flujo completados
- ✅ Banner verde de éxito al final

### **5. Facturas con Retroceso de Estado:**
- ✅ El timeline debe mostrar el estado actual correctamente
- ✅ Solo los estados alcanzados hasta el actual deben tener check

---

## 🔧 Consideraciones Técnicas

### **Lógica de Estados Alcanzados:**
```typescript
// Flujo normal: marcar como alcanzados solo hasta posición actual
const currentIndex = IDEAL_FLOW.indexOf(currentStatus);
for (let i = 0; i <= currentIndex; i++) {
  if (statusDates.has(IDEAL_FLOW[i])) {
    reachedStatuses.add(IDEAL_FLOW[i]);
  }
}

// Flujo rechazado: marcar todos los del historial
if (isRejected) {
  history.forEach(h => reachedStatuses.add(h.status));
}
```

### **Fechas del Historial:**
- Se usa la **última ocurrencia** de cada estado (más reciente)
- Maneja correctamente casos de retroceso
- Si no hay fecha, muestra "Pendiente" en cursiva

### **Modal:**
- Tamaño: `md` (mediano)
- Loading state mientras carga historial
- Query habilitada solo cuando modal está abierto
- Auto-limpieza de `selectedInvoiceId` al cerrar

---

## ✨ Consistencia con OCs

| Característica | OCs | Facturas |
|---------------|-----|----------|
| Botón en tarjetas | ✅ | ✅ |
| Ícono Clock | ✅ | ✅ |
| Modal de timeline | ✅ | ✅ |
| Estados en flujo | 4 + ANULADO | 6 + RECHAZADO |
| Estado especial no en flujo | ANULADO | RECHAZADO |
| Banners de éxito/error | ✅ | ✅ |
| Formateo de fechas | ✅ | ✅ |

---

## 📝 Notas Importantes

1. **RECHAZADO** solo aparece si la factura fue rechazada (no está en `IDEAL_FLOW`)
2. El endpoint `/invoices/:id/history` ya existía y funciona correctamente
3. Los permisos están correctos: `facturas:listado` puede ver historial
4. El componente es reutilizable y fácil de mantener
5. Se siguió exactamente el mismo patrón de OCs para consistencia

---

**Fecha de Implementación:** 16 de Diciembre de 2025  
**Patrón Base:** OcStatusTimeline  
**Compatible con:** Todos los estados del enum InvStatus
