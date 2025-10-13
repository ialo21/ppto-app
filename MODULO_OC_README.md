# Módulo de Órdenes de Compra (OC)

## Resumen de Implementación

Se ha implementado un módulo completo de **Órdenes de Compra (OC)** para el sistema de presupuesto, siguiendo los patrones y arquitectura existentes del proyecto.

## 🎯 Componentes Creados

### 1. Base de Datos (Prisma Schema)

#### Nuevos Modelos:

**`Articulo`** - Catálogo de artículos para las OCs
```prisma
model Articulo {
  id   Int    @id @default(autoincrement())
  code String @unique
  name String
  ocs  OC[]
}
```

**`OC`** - Modelo principal de Órdenes de Compra
```prisma
model OC {
  id                     Int       @id @default(autoincrement())
  budgetPeriodFromId     Int       // FK a Period
  budgetPeriodToId       Int       // FK a Period
  incidenteOc            String?
  solicitudOc            String?
  fechaRegistro          DateTime  @default(now())
  supportId              Int       // FK a Support
  periodoEnFechasText    String?
  descripcion            String?
  nombreSolicitante      String
  correoSolicitante      String    // email
  proveedor              String
  ruc                    String    // 11 dígitos
  moneda                 String    // PEN | USD
  importeSinIgv          Decimal
  estado                 OcStatus  @default(PENDIENTE)
  numeroOc               String?   @unique
  comentario             String?
  articuloId             Int?      // FK a Articulo
  cecoId                 Int?      // FK a CostCenter
  linkCotizacion         String?   // URL
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
}
```

**`OcStatus`** - Enum de estados
```prisma
enum OcStatus {
  PENDIENTE
  PROCESAR
  PROCESADO
  APROBACION_VP
  ANULAR
  ANULADO
  ATENDER_COMPRAS
  ATENDIDO
}
```

#### Migración:
- **Archivo**: `packages/db/migrations/20251011000000_add_oc_and_articulo/migration.sql`
- **Estado**: ✅ Aplicada exitosamente

### 2. Backend (API)

#### `apps/api/src/oc.ts` - Rutas de OCs

**Endpoints implementados:**

- `GET /ocs` - Listar OCs con filtros avanzados
  - Filtros: proveedor, numeroOc, moneda, estado, supportId, periodos, fechas, búsqueda libre
  - Incluye relaciones: support, budgetPeriodFrom, budgetPeriodTo, articulo, ceco

- `GET /ocs/:id` - Obtener OC por ID con todas las relaciones

- `POST /ocs` - Crear nueva OC
  - Validaciones con Zod:
    - Email válido para correoSolicitante
    - RUC de 11 dígitos
    - Importe >= 0
    - Referencias válidas a Support, Period, Articulo, CECO

- `PATCH /ocs/:id` - Actualizar OC existente

- `DELETE /ocs/:id` - Eliminar OC

- `GET /ocs/export/csv` - Exportar OCs a CSV con filtros

#### `apps/api/src/masters.ts` - Catálogo de Artículos

Agregados endpoints para gestión de artículos:
- `GET /articulos` - Listar artículos
- `POST /articulos` - Crear/actualizar artículo
- `DELETE /articulos/:id` - Eliminar artículo

#### `apps/api/src/index.ts`

- Importada y registrada la ruta `registerOcRoutes(app)`

### 3. Frontend (React)

#### `apps/web/src/pages/PurchaseOrdersPage.tsx`

Página completa de gestión de OCs con:

**Características:**
- ✅ Tabla de OCs con filtros múltiples
- ✅ Formulario crear/editar con validaciones
- ✅ Autocomplete de Supports
- ✅ Selección de Periodos PPTO (desde/hasta)
- ✅ Selección de Artículos
- ✅ Selección de CECOs
- ✅ Validación de RUC (11 dígitos)
- ✅ Validación de email
- ✅ Validación de importe (>= 0)
- ✅ Selector de moneda (PEN/USD)
- ✅ Selector de estado con todos los valores del enum
- ✅ Exportar a CSV
- ✅ Búsqueda de texto libre
- ✅ Toasts para feedback de operaciones
- ✅ Look & feel consistente con la página de Invoices

**Filtros disponibles:**
- Búsqueda libre (proveedor, número, RUC, descripción)
- Proveedor
- Número de OC
- Moneda
- Estado

#### `apps/web/src/pages/SettingsPage.tsx`

Agregada sección de **Artículos** en el catálogo:
- ✅ CRUD completo de artículos
- ✅ Validaciones de código único
- ✅ Interfaz consistente con otras secciones

#### `apps/web/src/main.tsx`

- ✅ Agregada ruta `/purchase-orders` 
- ✅ Agregado link "Órdenes de Compra" en el menú lateral con ícono ShoppingCart
- ✅ Posicionado entre "Líneas" y "Facturas"

### 4. Seed Data

**`packages/db/seed.ts`** actualizado con:
- 3 artículos de ejemplo
- 2 órdenes de compra de ejemplo vinculadas a los datos existentes

## 📋 Validaciones Implementadas

### Backend (Zod Schemas)
```typescript
- budgetPeriodFromId: número positivo requerido
- budgetPeriodToId: número positivo requerido
- supportId: número positivo requerido
- nombreSolicitante: string no vacío
- correoSolicitante: email válido
- proveedor: string no vacío
- ruc: regex /^\d{11}$/ (exactamente 11 dígitos)
- moneda: enum ["PEN", "USD"]
- importeSinIgv: número >= 0
- estado: enum con 8 valores posibles
- linkCotizacion: URL válida (opcional)
```

### Frontend
- Campos requeridos marcados con asterisco (*)
- Input type="email" para correo
- Input maxLength={11} y regex para RUC
- Input type="number" step="0.01" min="0" para importe
- Select con opciones controladas para enums
- Mensajes de error con toast

## 🎨 Diseño y UX

El módulo sigue exactamente el **look & feel** de la página de Invoices:

- ✅ Mismos componentes UI reutilizables (Card, Button, Input, Select, Table)
- ✅ Mismo esquema de colores y estilos
- ✅ Misma estructura de layout
- ✅ Toasts de Sonner para feedback
- ✅ Filtros con la misma disposición visual
- ✅ Botón de exportar CSV con mismo estilo
- ✅ Tabla responsive con scroll horizontal

## 🔄 Arquitectura y Patrones

Se mantuvieron los patrones del proyecto:

1. **Stack**: React + TypeScript + TanStack Query + Fastify + Prisma
2. **Validación**: Zod en backend, validaciones nativas en frontend
3. **Estilos**: Tailwind CSS con dark mode
4. **Routing**: React Router con layout compartido
5. **State Management**: TanStack Query (react-query)
6. **API**: REST con Fastify, JSON responses
7. **ORM**: Prisma con PostgreSQL

## 📊 Relaciones del Modelo

```
OC
├── budgetPeriodFrom → Period (required)
├── budgetPeriodTo → Period (required)
├── support → Support (required)
├── articulo → Articulo (optional)
└── ceco → CostCenter (optional)
```

**Nota importante**: Como solicitado, **NO se creó relación** entre `Invoice` y `OC` en esta fase. El modelo está preparado para que en el futuro `Invoice` tenga un campo `ocId` (FK) para `hasMany` invoices por OC.

## ✅ Criterios de Aceptación Cumplidos

- ✅ CRUD de OCs funcional y persistente
- ✅ Búsqueda/filtrado operativo con patrón visual de invoices
- ✅ Export CSV funcional
- ✅ Selección de Support desde catálogo con autocomplete
- ✅ Selección de Artículo desde catálogo
- ✅ Selección de CECO desde catálogo existente
- ✅ Periodo PPTO (from/to) usando meses seed
- ✅ Validaciones: email, RUC 11 dígitos, importe ≥ 0, moneda y estado requeridos
- ✅ Sin dependencia ni relación con invoices (solo estilo heredado)
- ✅ UI consistente con el resto del proyecto
- ✅ No rompe funcionalidad existente
- ✅ Tipado estricto TypeScript

## 🚀 Cómo Probar

1. **Base de datos**:
   ```bash
   pnpm db:up          # Levantar PostgreSQL
   pnpm db:seed        # Cargar datos de ejemplo
   ```

2. **Backend**:
   ```bash
   pnpm -C apps/api dev
   # Servidor en http://localhost:3001
   ```

3. **Frontend**:
   ```bash
   pnpm -C apps/web dev
   # App en http://localhost:5173
   ```

4. **Navegar a**: http://localhost:5173/purchase-orders

## 📝 Datos de Ejemplo

El seed incluye:
- **3 Artículos**: Servicios Profesionales, Licencias de Software, Hardware y Equipos
- **2 OCs**:
  - OC-2026-0001: Servicios QA (PENDIENTE, PEN)
  - OC-2026-0002: Servicios Cloud AWS (PROCESADO, USD)

## 🔮 Preparación Futura

El modelo está preparado para:
1. Agregar campo `ocId` en `Invoice` (FK opcional a `OC`)
2. Relación `hasMany` de OC → Invoice
3. NO requiere cambios en el modelo OC actual

## 📦 Archivos Modificados/Creados

### Creados:
- `packages/db/migrations/20251011000000_add_oc_and_articulo/migration.sql`
- `apps/api/src/oc.ts`
- `apps/web/src/pages/PurchaseOrdersPage.tsx`
- `MODULO_OC_README.md`

### Modificados:
- `packages/db/schema.prisma` (agregados Articulo, OC, OcStatus)
- `packages/db/seed.ts` (agregados artículos y OCs de ejemplo)
- `apps/api/src/masters.ts` (agregados endpoints de artículos)
- `apps/api/src/index.ts` (registrada ruta de OCs)
- `apps/web/src/pages/SettingsPage.tsx` (agregada sección artículos)
- `apps/web/src/main.tsx` (agregada ruta y menú de OCs)

## ✨ Características Adicionales Implementadas

- **Autocompletado inteligente**: Los selects de Support, Artículo y CECO muestran código + nombre
- **Formato de fechas**: Display en formato local legible
- **Estados visuales**: Badges para mostrar el estado de cada OC
- **Responsive design**: Tabla con scroll horizontal en móviles
- **Dark mode**: Totalmente compatible
- **Validación en tiempo real**: Feedback inmediato en formularios
- **Manejo de errores**: Mensajes claros con toast notifications

---

**Estado del módulo**: ✅ **Completamente funcional y listo para producción**


