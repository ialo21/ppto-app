# Implementación: Relación M:N entre Sustentos y CECOs

## 📋 Resumen Ejecutivo

Se implementó exitosamente la relación **muchos-a-muchos** (M:N) entre **Support** (Sustento) y **CostCenter** (CECO), permitiendo que un sustento pueda asociarse a múltiples centros de costo y viceversa.

### Características principales
- ✅ **Base de datos**: Tabla puente `SupportCostCenter` con unique constraint en el par `(supportId, costCenterId)`
- ✅ **API**: Endpoint `/supports` acepta array `costCenterIds` para crear/actualizar asociaciones
- ✅ **UI**: Selector múltiple de CECOs con búsqueda, chips y validación de duplicados
- ✅ **Bulk CSV**: Columna `costCenterCodes` con separador `;` para importar múltiples CECOs
- ✅ **Migración de datos**: Los CECOs existentes (relación 1:N legacy) se migraron automáticamente

---

## 🗄️ Base de Datos

### Cambios en `schema.prisma`

#### 1. Nuevo modelo `SupportCostCenter` (tabla puente)

```prisma
model SupportCostCenter {
  id           Int        @id @default(autoincrement())
  supportId    Int
  support      Support    @relation(fields: [supportId], references: [id], onDelete: Cascade)
  costCenterId Int
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())

  @@unique([supportId, costCenterId], name: "ux_support_costcenter_pair")
  @@index([supportId], name: "ix_supportcostcenter_support")
  @@index([costCenterId], name: "ix_supportcostcenter_costcenter")
}
```

#### 2. Actualización del modelo `Support`

```prisma
model Support {
  // ... campos existentes ...
  
  costCenterId     Int?  // DEPRECATED: usar costCenters (M:N)
  costCenter       CostCenter?  @relation("LegacySupportCostCenter", fields: [costCenterId], references: [id])
  
  // Nueva relación M:N
  costCenters      SupportCostCenter[]  // M:N con CostCenter
}
```

#### 3. Actualización del modelo `CostCenter`

```prisma
model CostCenter {
  // ... campos existentes ...
  
  supports     Support[] @relation("LegacySupportCostCenter")  // DEPRECATED
  supportLinks SupportCostCenter[]  // M:N con Support
}
```

### Migración: `20251104030000_support_costcenter_many_to_many`

- Crea tabla `SupportCostCenter`
- Agrega índice único en `(supportId, costCenterId)`
- Migra datos existentes de `Support.costCenterId` a la tabla puente
- Mantiene `Support.costCenterId` por compatibilidad legacy

**Comando de aplicación:**
```bash
cd packages/db
pnpm prisma migrate deploy
```

---

## 🔌 API

### Endpoint: `POST /supports`

#### Request body (extendido)

```typescript
{
  id?: number,
  name: string,
  code?: string,
  // ... otros campos ...
  costCenterId?: number,  // DEPRECATED
  costCenterIds?: number[],  // M:N: array de IDs de CECOs
  // ... otros campos ...
}
```

#### Validaciones

- **`costCenterIds`**: Array opcional de IDs de CECOs
- Se valida que todos los CECOs existan
- Se de-duplican IDs repetidos automáticamente
- Si un par `(supportId, costCenterId)` ya existe, se omite (skipDuplicates)

#### Comportamiento

**Crear:**
1. Crea el sustento
2. Crea asociaciones en `SupportCostCenter` para cada CECO en `costCenterIds`

**Actualizar:**
1. Actualiza el sustento
2. Si se especifica `costCenterIds`:
   - Elimina todas las asociaciones actuales del sustento
   - Crea nuevas asociaciones según el array

#### Response

```typescript
{
  id: number,
  name: string,
  // ... otros campos ...
  costCenter: CostCenter | null,  // DEPRECATED
  costCenters: Array<{
    id: number,
    costCenter: CostCenter
  }>
}
```

### Endpoint: `GET /supports`

Incluye ambas relaciones:
- `costCenter` (1:N legacy)
- `costCenters` (M:N nueva)

---

## 🎨 UI (`apps/web/src/pages/SettingsPage.tsx`)

### Formulario de Sustentos

#### Selector múltiple de CECOs

**Características:**
- Input de búsqueda con filtrado en tiempo real (case-insensitive)
- Filtra por `code` y `name` de CECO
- Dropdown con resultados filtrados (solo muestra CECOs no seleccionados)
- Chips visuales para CECOs seleccionados con botón de eliminación

**Código:**

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-700">
    Centros de costo (múltiples)
  </label>
  
  {/* Input de búsqueda */}
  <Input
    placeholder="Buscar CECO por código o nombre..."
    value={costCenterSearchSupport}
    onChange={e => setCostCenterSearchSupport(e.target.value)}
  />
  
  {/* Dropdown con resultados filtrados */}
  {costCenterSearchSupport.trim() && (
    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
      {filteredCostCenters.map(cc => (
        <button onClick={() => addCostCenter(cc.id)}>
          {cc.code} — {cc.name || "—"}
        </button>
      ))}
    </div>
  )}
  
  {/* Chips de CECOs seleccionados */}
  {supportForm.costCenterIds.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {supportForm.costCenterIds.map(ccId => (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
          {getCostCenterCode(ccId)} — {getCostCenterName(ccId)}
          <button onClick={() => removeCostCenter(ccId)}>×</button>
        </span>
      ))}
    </div>
  )}
</div>
```

### Listado de Sustentos

**Columna "Centro de costo":**

- Si tiene CECOs M:N: muestra chips con los códigos (hover para ver nombre completo)
- Si solo tiene CECO legacy (1:N): muestra formato clásico `CC-001 — Nombre`

```tsx
<Td>
  {support.costCenters && support.costCenters.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {support.costCenters.map(link => (
        <span 
          className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs"
          title={`${link.costCenter.code} — ${link.costCenter.name || "—"}`}
        >
          {link.costCenter.code}
        </span>
      ))}
    </div>
  ) : (
    support.costCenter ? `${support.costCenter.code} — ${support.costCenter.name || "—"}` : "—"
  )}
</Td>
```

---

## 📄 Bulk CSV (`apps/api/src/bulk.ts`)

### Nueva columna: `costCenterCodes`

**Formato:** Códigos de CECO separados por `;`

**Ejemplo:**
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,costCenterCodes,expenseType,active
Support,Soporte TI,SUP-001,Gerencia TI,Desarrollo,Hardware,Laptops,,CC-001;CC-003,ADMINISTRATIVO,true
```

### Procesamiento

**Validación:**
1. Split por `;` y trim de espacios
2. De-duplicar códigos
3. Validar que cada código exista en BD (case-insensitive)
4. Si algún código no existe → error 422 con `issues`

**Upsert:**
- Si el sustento existe (por `name`):
  - Actualiza datos
  - Elimina asociaciones actuales con CECOs
  - Crea nuevas asociaciones según `costCenterCodes`
- Si no existe:
  - Crea sustento
  - Crea asociaciones con CECOs

### Plantilla CSV generada

```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,costCenterCodes,expenseType,active
Support,Soporte TI - Hardware,SUP-001,Gerencia de Tecnología,Desarrollo,Hardware,Laptops,,CC-001;CC-003,ADMINISTRATIVO,true
Support,Soporte Ventas - Software,SUP-002,Gerencia Comercial,Ventas,Software,Licencias Microsoft,,CC-002;CC-001,PRODUCTO,true
Support,Soporte Infraestructura,SUP-003,Gerencia de Tecnología,Infraestructura,Hardware,Servidores,,CC-001;CC-002;CC-003,DISTRIBUIBLE,true
```

---

## 📚 Documentación

### `apps/web/src/pages/catalogs/BULK_CSV_README.md`

**Actualizado:**

- Agregada columna `costCenterCodes` en cabeceras obligatorias
- Descripción de `costCenterCodes`: "Códigos de CECOs separados por `;` (M:N)"
- Marcado `costCenterCode` como DEPRECATED
- Sección de "Support (Sustentos)" con reglas M:N:
  - Ejemplo: `costCenterCodes=CC-001;CC-002;CC-003`
  - Códigos se validan y de-duplican automáticamente
  - Si el sustento existe, las asociaciones se actualizan (elimina anteriores, crea nuevas)
- Nuevo ejemplo completo de CSV con múltiples CECOs

---

## 🧪 Testing

### Build y migración

✅ **Ejecutados exitosamente:**

```bash
cd packages/db
pnpm prisma migrate deploy
# ✅ Migración 20251104030000 aplicada

cd ../..
pnpm run build
# ✅ Build completado sin errores
```

### Casos de prueba manuales

#### 1. UI - Crear sustento con múltiples CECOs
**Pasos:**
1. Ir a Catálogos → Sustentos
2. Crear nuevo sustento "Test M:N"
3. Buscar CECO "CC-001" y agregar
4. Buscar CECO "CC-002" y agregar
5. Guardar

**Esperado:**
- ✅ Se crean 2 filas en `SupportCostCenter`
- ✅ En el listado, aparecen 2 chips con "CC-001" y "CC-002"

#### 2. UI - Editar sustento: cambiar CECOs
**Pasos:**
1. Editar el sustento "Test M:N"
2. Eliminar chip de "CC-001"
3. Buscar y agregar "CC-003"
4. Guardar

**Esperado:**
- ✅ Se eliminan asociaciones anteriores
- ✅ Se crean nuevas: "CC-002" y "CC-003"

#### 3. Bulk CSV - Importar con múltiples CECOs
**Archivo:**
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,costCenterCodes,expenseType,active
Support,Sustento CSV Test,SUP-CSV,,,,,,"CC-001;CC-002;CC-003",ADMINISTRATIVO,true
```

**Esperado:**
- ✅ Se crea el sustento
- ✅ Se crean 3 asociaciones en `SupportCostCenter`
- ✅ Mensaje: "Sustento creado con 3 CECO(s)"

#### 4. Validación de duplicados
**Caso A - Mismo par:**
Intentar asociar el mismo CECO dos veces al mismo sustento.
**Esperado:** ✅ Se omite (skipDuplicates)

**Caso B - Código inválido:**
CSV con `costCenterCodes=CC-001;CC-999` (CC-999 no existe)
**Esperado:** ✅ Error 422 con `issues: [{ path: ["costCenterCodes"], message: "CECO 'CC-999' no existe" }]`

---

## 📦 Archivos modificados

### Base de datos (3 archivos)
1. **`packages/db/schema.prisma`**
   - Modelo `SupportCostCenter` (nuevo)
   - Relación M:N en `Support` y `CostCenter`
   - Deprecación de relación 1:N

2. **`packages/db/migrations/20251104030000_support_costcenter_many_to_many/migration.sql`** (nuevo)
   - Crea tabla puente con unique constraint e índices
   - Migra datos legacy

### API (2 archivos)
3. **`apps/api/src/supports.ts`**
   - Schema Zod: `costCenterIds: z.array(z.number())`
   - POST: Validación y creación/actualización de asociaciones M:N
   - GET: Include `costCenters` en respuesta

4. **`apps/api/src/bulk.ts`**
   - Parseo de `costCenterCodes` (split por `;`)
   - Validación de CECOs existentes
   - Upsert con gestión de asociaciones M:N
   - Plantilla CSV actualizada con ejemplos

### Frontend (1 archivo)
5. **`apps/web/src/pages/SettingsPage.tsx`**
   - Tipo `Support`: agregado `costCenters` array
   - Estado: `costCenterIds: number[]`
   - Selector múltiple con búsqueda y chips
   - Listado: Muestra múltiples CECOs como chips

### Documentación (2 archivos)
6. **`apps/web/src/pages/catalogs/BULK_CSV_README.md`**
   - Documentación de columna `costCenterCodes`
   - Ejemplos de CSV con M:N

7. **`SUPPORT_COSTCENTER_MN_IMPLEMENTATION.md`** (este archivo)
   - Resumen completo de implementación

---

## 🎯 Criterios de aceptación cumplidos

✅ **Crear/editar sustento en UI asignando múltiples CECOs**
- Selector múltiple funcional con búsqueda y chips

✅ **Evitar duplicados del mismo par (Sustento, CECO)**
- Unique constraint en tabla puente
- skipDuplicates en `createMany`
- Validación en UI (no permite agregar CECO ya seleccionado)

✅ **Carga masiva con múltiples CECOs separados por `;`**
- Parser implementado con validación y de-duplicación
- Plantilla CSV actualizada con ejemplos

✅ **Pares duplicados reportados correctamente (no error fatal)**
- En DB: `skipDuplicates: true`
- En bulk: Mensajes de "actualizado" o "omitido"

✅ **No se rompen relaciones actuales del Sustento**
- Compatibilidad legacy mantenida (`costCenterId`)
- Otras relaciones (managementId, areaId, packageId, etc.) intactas

---

## 🚀 Comandos de deploy

```bash
# 1. Generar cliente Prisma
cd packages/db
pnpm prisma generate

# 2. Aplicar migración
pnpm prisma migrate deploy

# 3. Build (ya ejecutado ✅)
cd ../..
pnpm run build

# 4. Reiniciar servicios
# (según tu estrategia de deploy)
```

---

## 🔄 Migración de datos existentes

Los sustentos que tenían `costCenterId` (relación 1:N) fueron migrados automáticamente:

```sql
INSERT INTO "SupportCostCenter" ("supportId", "costCenterId", "createdAt")
SELECT 
  s."id" AS "supportId",
  s."costCenterId" AS "costCenterId",
  NOW() AS "createdAt"
FROM "Support" s
WHERE s."costCenterId" IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Nota:** El campo `Support.costCenterId` se mantiene por compatibilidad pero queda DEPRECATED.

---

## 📊 Columnas CSV finales

| Columna | Uso por entidad | Descripción |
|---------|-----------------|-------------|
| `type` | Todas | Tipo de entidad (Management, Area, ExpensePackage, ExpenseConcept, CostCenter, Articulo, Support) |
| `name` | Todas | Nombre del ítem |
| `code` | CostCenter, Articulo, Support | Código único (requerido para CostCenter y Articulo) |
| `managementName` | Area, Support | Referencia a gerencia |
| `areaName` | Support | Referencia a área |
| `packageName` | ExpenseConcept, Support | Referencia a paquete |
| `conceptName` | Support | Referencia a concepto |
| `costCenterCode` | Support | **DEPRECATED** - Usar `costCenterCodes` |
| `costCenterCodes` | Support | **Códigos de CECOs separados por `;`** (Ej: `CC-001;CC-002;CC-003`) |
| `expenseType` | Support | ADMINISTRATIVO, PRODUCTO, DISTRIBUIBLE |
| `active` | Management, Area, Support | true/false |

---

## 🛡️ Notas de seguridad

- ✅ Unique constraint en `(supportId, costCenterId)` previene duplicados a nivel DB
- ✅ Validación de CECOs existentes antes de crear asociaciones
- ✅ Transacciones atómicas para crear/actualizar sustento + asociaciones
- ✅ Cascada en `onDelete` para eliminar asociaciones al eliminar sustento o CECO
- ✅ Normalización de códigos (trim, case-insensitive)

---

## 📝 Próximos pasos opcionales

1. **Estadísticas**: Dashboard mostrando "Top 5 CECOs más usados por sustentos"
2. **Reportes**: Exportar sustentos agrupados por CECO
3. **Filtros avanzados**: En listado de sustentos, filtrar por CECO específico
4. **Validación de negocio**: Alertar si un sustento tiene >5 CECOs (si aplica)
5. **Migración completa**: Eliminar `Support.costCenterId` tras verificar 100% de adopción M:N

---

**Implementación completada exitosamente el 2025-11-04**

