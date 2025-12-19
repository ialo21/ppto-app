# Análisis: Entidad Proveedor como Concepto Central

## Resumen Ejecutivo

Este documento detalla el análisis del repositorio para implementar **Proveedor** como una entidad central del sistema, reemplazando los campos de texto libre actuales por una entidad reutilizable con catálogo propio.

---

## 1. Estado Actual del Sistema

### 1.1 Schema de Base de Datos

#### Modelo `Vendor` existente (líneas 229-236 de `schema.prisma`)
```prisma
model Vendor {
  id        Int     @id @default(autoincrement())
  legalName String
  taxId     String? @unique
  purchaseOrders PurchaseOrder[]
  invoices       Invoice[]
}
```
- **Estado**: Definido pero **NO USADO** activamente
- Las relaciones con `PurchaseOrder` e `Invoice` existen pero no se utilizan

#### Modelo `OC` - Campos libres actuales (líneas 398-399)
```prisma
proveedor              String    // Campo de texto libre
ruc                    String    // Campo de texto libre
```

#### Modelo `Invoice` (líneas 256-257)
- `vendorId` marcado como DEPRECATED
- El proveedor se deriva de la OC asociada

### 1.2 API Backend (`apps/api/src/`)

| Archivo | Uso de Proveedor |
|---------|------------------|
| `oc.ts` | Valida `proveedor` y `ruc` como strings. Filtro por proveedor en GET /ocs |
| `invoices.ts` | Campo `proveedor` opcional para facturas "sin OC" |
| `masters.ts` | **No tiene endpoints para Vendor/Proveedor** |

### 1.3 Frontend - Lugares que usan Proveedor

#### Órdenes de Compra
| Archivo | Uso |
|---------|-----|
| `OcSolicitudPage.tsx` | Input libre para proveedor y RUC (paso 4 del wizard) |
| `OcGestionPage.tsx` | Input libre para proveedor y RUC en formulario de edición |
| `OcListadoPage.tsx` | Muestra proveedor en tarjetas, busca por proveedor, estadística "Proveedor Top" |

#### Facturas
| Archivo | Uso |
|---------|-----|
| `InvoicesPage.tsx` | Input libre para proveedor cuando factura no tiene OC |
| `InvoiceGestionPage.tsx` | Igual que arriba |
| `InvoiceListadoPage.tsx` | Muestra `oc.proveedor`, busca por proveedor, estadística "Proveedor Top" |

#### Aprobaciones
| Archivo | Uso |
|---------|-----|
| `AprobacionVPOCsPage.tsx` | Muestra proveedor, busca por proveedor |
| `AprobacionVPFacturasPage.tsx` | Muestra `oc.proveedor` |
| `AprobacionHeadFacturasPage.tsx` | Muestra `oc.proveedor` |

---

## 2. Patrones Existentes a Reutilizar

### 2.1 Patrón de Catálogos (`masters.ts` + `SettingsPage.tsx`)

**Backend** - Estructura típica:
```typescript
// GET - Listar
app.get("/cost-centers", { preHandler: requireAuth }, async () => 
  prisma.costCenter.findMany({ orderBy: { code: "asc" } })
);

// POST - Crear/Actualizar (upsert pattern)
app.post("/cost-centers", { preHandler: [requireAuth, requirePermission("catalogos")] }, ...);

// DELETE
app.delete("/cost-centers/:id", { preHandler: [requireAuth, requirePermission("catalogos")] }, ...);
```

**Frontend** - Estructura típica:
- Sección en `SettingsPage.tsx` con:
  - Formulario de creación/edición
  - Tabla con búsqueda
  - Acciones Editar/Eliminar

### 2.2 Componente FilterSelect

Componente reutilizable con:
- Búsqueda integrada (fuzzy)
- Portal para dropdown
- Botón X para limpiar
- Diseño consistente con el sistema

### 2.3 Secciones actuales de Catálogos
```typescript
const sections: SectionKey[] = [
  "packages",        // Paquetes & Conceptos
  "costCenters",     // Centros de costo
  "articulos",       // Artículos
  "managements",     // Gerencias & Áreas
  "supports",        // Sustentos
  "exchangeRates",   // Tipos de cambio
  "approvalThresholds", // Umbrales
  "bulk"             // Carga masiva
];
```

---

## 3. Propuesta de Implementación

### 3.1 Modelo de Datos

**Renombrar/Expandir `Vendor` → `Proveedor`:**

```prisma
model Proveedor {
  id          Int      @id @default(autoincrement())
  razonSocial String   // Nombre o razón social
  ruc         String   @unique  // RUC (11 dígitos, único)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  ocs         OC[]
  
  @@index([ruc], name: "ix_proveedor_ruc")
  @@index([razonSocial], name: "ix_proveedor_razon_social")
}
```

**Modificar modelo `OC`:**
```prisma
model OC {
  // ... campos existentes ...
  
  // DEPRECATED: mantener para compatibilidad/migración
  proveedor              String?   // Ahora opcional
  ruc                    String?   // Ahora opcional
  
  // NUEVO: Relación con entidad Proveedor
  proveedorId            Int?
  proveedorRef           Proveedor? @relation(fields: [proveedorId], references: [id])
}
```

### 3.2 Endpoints API

**Nuevos endpoints en `masters.ts`:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/proveedores` | Listar proveedores (búsqueda opcional) |
| POST | `/proveedores` | Crear/Actualizar proveedor |
| DELETE | `/proveedores/:id` | Eliminar proveedor |
| GET | `/proveedores/search?q=` | Búsqueda rápida para autocompletado |

### 3.3 Frontend - Catálogo

**Nueva sección "Proveedores" en SettingsPage.tsx:**
- Agregar a `sections`: `{ key: "proveedores", label: "Proveedores", description: "..." }`
- Formulario: Razón Social + RUC
- Tabla con búsqueda

### 3.4 Componente Reutilizable

**`ProveedorSelector.tsx`:**
- Extiende patrón de `FilterSelect`
- Búsqueda por razón social o RUC
- Al seleccionar: auto-llena RUC (readonly o display)
- Botón "+ Nuevo" para crear proveedor inline
- Modal de creación rápida sin salir del flujo

### 3.5 Integración en Módulos

**Cambios por archivo:**

| Archivo | Cambio |
|---------|--------|
| `OcSolicitudPage.tsx` | Reemplazar inputs proveedor/RUC por `ProveedorSelector` |
| `OcGestionPage.tsx` | Reemplazar inputs proveedor/RUC por `ProveedorSelector` |
| `InvoiceGestionPage.tsx` | Usar `ProveedorSelector` para facturas sin OC |
| Todas las vistas de listado | Mostrar `proveedorRef.razonSocial` en lugar de `proveedor` |

---

## 4. Consideraciones de Migración

### 4.1 Datos Existentes
- Script para extraer proveedores únicos de OCs existentes
- Crear registros en tabla `Proveedor`
- Actualizar `proveedorId` en OCs
- Mantener campos `proveedor`/`ruc` como deprecated (no eliminar)

### 4.2 Compatibilidad
- Mantener campos legacy en schema
- API acepta ambos formatos durante transición
- Frontend muestra `proveedorRef.razonSocial` con fallback a `proveedor`

---

## 5. Archivos a Modificar

### Backend
1. `packages/db/schema.prisma` - Modelo Proveedor
2. `apps/api/src/masters.ts` - CRUD proveedores
3. `apps/api/src/oc.ts` - Aceptar proveedorId
4. `apps/api/src/invoices.ts` - Aceptar proveedorId

### Frontend
1. `apps/web/src/components/ProveedorSelector.tsx` - **NUEVO**
2. `apps/web/src/pages/SettingsPage.tsx` - Sección proveedores
3. `apps/web/src/pages/purchase-orders/OcSolicitudPage.tsx`
4. `apps/web/src/pages/purchase-orders/OcGestionPage.tsx`
5. `apps/web/src/pages/invoices/InvoiceGestionPage.tsx`
6. Vistas de listado (actualizaciones menores de display)

---

## 6. Orden de Implementación

1. ✅ Análisis completado
2. ⏳ Modelo Proveedor en schema.prisma
3. ⏳ Endpoints API CRUD
4. ⏳ Sección en Catálogos
5. ⏳ Componente ProveedorSelector
6. ⏳ Integración en OcSolicitudPage
7. ⏳ Integración en OcGestionPage
8. ⏳ Integración en InvoiceGestionPage
9. ⏳ Actualización de vistas de listado
10. ⏳ Script de migración de datos (opcional)

---

## 7. Estado de Implementación (Actualizado)

### ✅ Completado

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| **Modelo Proveedor** | `schema.prisma` | Nueva entidad con razonSocial, ruc, active, índices |
| **Relación OC-Proveedor** | `schema.prisma` | Campo `proveedorId` y relación `proveedorRef` |
| **API CRUD Proveedores** | `masters.ts` | GET, POST, DELETE, toggle-active, find-or-create |
| **API OCs actualizada** | `oc.ts` | Acepta proveedorId, incluye proveedorRef en respuestas |
| **Catálogo Proveedores** | `SettingsPage.tsx` | Sección completa con formulario y tabla |
| **Componente Selector** | `ProveedorSelector.tsx` | Búsqueda, selección, crear inline |
| **OcSolicitudPage** | `OcSolicitudPage.tsx` | Integrado con ProveedorSelector |
| **Script Migración** | `scripts/migrate-proveedores.ts` | Migrar datos legacy a nueva entidad |

### ✅ Completado Adicional

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| **OcGestionPage** | `OcGestionPage.tsx` | Integrado con ProveedorSelector |
| **OcListadoPage** | `OcListadoPage.tsx` | Muestra proveedorRef con fallback |
| **AprobacionVPOCsPage** | `AprobacionVPOCsPage.tsx` | Actualizado para proveedorRef |
| **InvoiceListadoPage** | `InvoiceListadoPage.tsx` | Muestra proveedorRef de OC |
| **InvoiceGestionPage** | `InvoiceGestionPage.tsx` | Muestra proveedorRef en selector de OCs |

---

## 8. Pasos para Activar

1. **Generar cliente Prisma:**
   ```bash
   cd packages/db
   npx prisma generate
   ```

2. **Crear migración:**
   ```bash
   npx prisma migrate dev --name add_proveedor_entity
   ```

3. **Ejecutar script de migración de datos:**
   ```bash
   npx ts-node scripts/migrate-proveedores.ts --migrate
   ```

4. **Reiniciar servidor:**
   ```bash
   cd apps/api && pnpm dev
   ```

---

## 9. Notas de Compatibilidad

- Los campos `proveedor` y `ruc` en OC ahora son **opcionales** (nullable)
- Las OCs nuevas usan `proveedorId`; las existentes mantienen campos legacy
- Las vistas muestran `proveedorRef.razonSocial` con fallback a `proveedor`
- La API acepta ambos formatos durante la transición

---

*Documento generado: Diciembre 2024*
*Última actualización: Diciembre 2024*
