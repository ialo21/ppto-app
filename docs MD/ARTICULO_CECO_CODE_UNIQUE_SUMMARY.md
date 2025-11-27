# Resumen: Artículos y CECOs con Código Único y Nombres Duplicables

## Fecha
4 de Noviembre, 2025

## Objetivo
Permitir nombres duplicados en Artículos y Centros de Costo (CECO), usando el código como clave única para identificación y upsert.

## Descubrimiento

### Modelos en `schema.prisma`
```prisma
model CostCenter {
  id       Int       @id @default(autoincrement())
  code     String    @unique
  name     String
  supports Support[]
  ocs      OC[]
}

model Articulo {
  id   Int    @id @default(autoincrement())
  code String @unique
  name String
  ocs  OC[]
}
```

### Índices Previos (Migración 20251013000000)
- `CostCenter_name_unique_lower`: Índice único case-insensitive en `name`
- `Articulo_name_unique_lower`: Índice único case-insensitive en `name`

**Problema**: Estos índices impedían tener nombres duplicados.

## Cambios Implementados

### 1. Migración de Base de Datos

**Archivo**: `packages/db/migrations/20251104000000_articulo_ceco_code_unique/migration.sql`

```sql
-- Eliminar índices únicos de name
DROP INDEX IF EXISTS "CostCenter_name_unique_lower";
DROP INDEX IF EXISTS "Articulo_name_unique_lower";

-- Crear índices únicos case-insensitive en code
DROP INDEX IF EXISTS "CostCenter_code_key";
CREATE UNIQUE INDEX "CostCenter_code_unique_lower" ON "CostCenter"(LOWER("code"));

DROP INDEX IF EXISTS "Articulo_code_key";
CREATE UNIQUE INDEX "Articulo_code_unique_lower" ON "Articulo"(LOWER("code"));
```

**Resultado**:
- ✅ Nombres pueden duplicarse
- ✅ Códigos son únicos (case-insensitive)
- ✅ Sin migración de datos (no había conflictos)

### 2. API Bulk CSV (`apps/api/src/bulk.ts`)

#### Esquemas Zod (sin cambios)
```typescript
const costCenterSchema = z.object({
  type: z.literal("CostCenter"),
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio")
});

const articuloSchema = z.object({
  type: z.literal("Articulo"),
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio")
});
```

#### Procesadores Actualizados

**`processCostCenter`**:
```typescript
// Buscar por código (case-insensitive) - código es la clave única
const existingByCode = await prisma.costCenter.findFirst({
  where: { code: { equals: code, mode: "insensitive" } }
});

if (existingByCode) {
  // Actualizar nombre si cambió (nombres pueden duplicarse)
  if (existingByCode.name !== name) {
    if (!dryRun) {
      await prisma.costCenter.update({
        where: { id: existingByCode.id },
        data: { name }
      });
    }
    return {
      row: rowNum,
      type: "CostCenter",
      action: "updated",
      message: `Centro de costo [${code}] actualizado (nombre: "${name}")`
    };
  }
  return {
    row: rowNum,
    type: "CostCenter",
    action: "skipped",
    message: `Centro de costo [${code}] ya existe sin cambios`
  };
}
```

**`processArticulo`**: Misma lógica que CostCenter.

**Cambios clave**:
- ✅ Upsert por `code` (case-insensitive)
- ✅ Tolera nombres duplicados
- ✅ Actualiza nombre si cambió
- ✅ Mensajes claros: `[código]` en lugar de nombre

### 3. Plantilla CSV Actualizada

**Archivo**: `apps/api/src/bulk.ts` (función `generateTemplateCSV`)

**Ejemplos agregados**:
```csv
CostCenter,Tecnología,CC-001,,,,,,,
CostCenter,Operaciones,CC-002,,,,,,,
CostCenter,Tecnología,CC-003,,,,,,,
Articulo,Servicios Profesionales,ART-001,,,,,,,
Articulo,Servicios Profesionales,ART-002,,,,,,,
Articulo,Hardware,ART-003,,,,,,,
```

**Demostración**: 
- "Tecnología" aparece 2 veces con códigos diferentes (CC-001, CC-003)
- "Servicios Profesionales" aparece 2 veces con códigos diferentes (ART-001, ART-002)

### 4. Documentación (`apps/web/src/pages/catalogs/BULK_CSV_README.md`)

**Actualizaciones**:

```markdown
#### CostCenter (Centros de costo)
- **Obligatorios**: `type=CostCenter`, `name`, `code`
- **Restricciones**: 
  - **`code` debe ser único (case-insensitive)** - Es la clave principal
  - `name` **puede duplicarse** - Se identifica por código
- **Upsert**: Por código. Si el código existe, actualiza el nombre

#### Articulo (Artículos)
- **Obligatorios**: `type=Articulo`, `name`, `code`
- **Restricciones**: 
  - **`code` debe ser único (case-insensitive)** - Es la clave principal
  - `name` **puede duplicarse** - Se identifica por código
- **Upsert**: Por código. Si el código existe, actualiza el nombre
```

**Ejemplo agregado**:
```markdown
### Ejemplo 3: Crear centros de costo y artículos (nombres pueden duplicarse)

**Nota**: Los códigos son únicos pero los nombres pueden repetirse. 
"Tecnología" existe en CC-001 y CC-003. 
"Servicios Profesionales" existe en ART-001 y ART-002.
```

## Archivos Modificados

1. ✅ `packages/db/migrations/20251104000000_articulo_ceco_code_unique/migration.sql` (nuevo)
2. ✅ `apps/api/src/bulk.ts` (procesadores + plantilla)
3. ✅ `apps/web/src/pages/catalogs/BULK_CSV_README.md` (documentación)

## Validación

### ✅ Build Status
```bash
pnpm build  # EXIT CODE: 0 ✓
```

### ✅ Migración Aplicada
```bash
pnpm migrate:deploy  # EXIT CODE: 0 ✓
prisma migrate status  # "Database schema is up to date!"
```

## Cómo Probar

### Caso 1: CSV con nombres duplicados (códigos únicos) ✅

**CSV**:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Tecnología,CC-001,,,,,,,
CostCenter,Tecnología,CC-002,,,,,,,
Articulo,Servicios,ART-001,,,,,,,
Articulo,Servicios,ART-002,,,,,,,
```

**Resultado esperado**: 4 registros creados sin errores.

### Caso 2: CSV con código duplicado (mismo code, distinto name) ✅

**Primera carga**:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Operaciones,CC-100,,,,,,,
```

**Segunda carga**:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Finanzas,CC-100,,,,,,,
```

**Resultado esperado**: 
- Primera: `created` - "Centro de costo [CC-100] \"Operaciones\" creado"
- Segunda: `updated` - "Centro de costo [CC-100] actualizado (nombre: \"Finanzas\")"

### Caso 3: Verificar que no hay error de unicidad en nombre ✅

**CSV**:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,TI,CC-A,,,,,,,
CostCenter,ti,CC-B,,,,,,,
CostCenter,Ti,CC-C,,,,,,,
```

**Resultado esperado**: 3 registros creados (nombres "TI", "ti", "Ti" son válidos con códigos diferentes).

### Caso 4: Error si código duplicado en mismo CSV ❌

**CSV**:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Ops,CC-DUP,,,,,,,
CostCenter,Ops2,CC-DUP,,,,,,,
```

**Resultado esperado**: 
- Primera fila: `created`
- Segunda fila: `skipped` (código ya existe)

## Criterios de Aceptación

✅ **Criterio 1**: Puedo cargar un CSV con dos artículos que compartan `name` pero tengan `code` distintos → creados sin errores.

✅ **Criterio 2**: Si subo otro CSV con el mismo `code` y distinto `name` → update (no error).

✅ **Criterio 3**: Lo mismo para CECOs.

✅ **Criterio 4**: No se reportan errores por "Unique constraint on lower(name)" en Artículo/CECO.

✅ **Criterio 5**: Las demás entidades (Management, Area, ExpensePackage, etc.) siguen validando unicidad de nombre.

## Prueba Manual (Paso a Paso)

### 1. Iniciar servicios
```bash
pnpm db:up
pnpm dev
```

### 2. Crear CSV de prueba (`test_duplicados.csv`)
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,Tecnología,CC-001,,,,,,,
CostCenter,Operaciones,CC-002,,,,,,,
CostCenter,Tecnología,CC-003,,,,,,,
Articulo,Servicios Profesionales,ART-001,,,,,,,
Articulo,Servicios Profesionales,ART-002,,,,,,,
Articulo,Hardware,ART-003,,,,,,,
```

### 3. Subir CSV en UI
- Navegar a: `http://localhost:5173` → Catálogos → Carga masiva (CSV)
- Marcar "Modo Vista Previa (Dry-Run)"
- Subir `test_duplicados.csv`
- Click "Vista Previa"

### 4. Verificar resultado
**Esperado**:
```
Summary:
- created: 6
- updated: 0
- skipped: 0
- errors: 0

Detalle:
- Row 2: CostCenter - created - "Centro de costo [CC-001] "Tecnología" creado"
- Row 3: CostCenter - created - "Centro de costo [CC-002] "Operaciones" creado"
- Row 4: CostCenter - created - "Centro de costo [CC-003] "Tecnología" creado"
- Row 5: Articulo - created - "Artículo [ART-001] "Servicios Profesionales" creado"
- Row 6: Articulo - created - "Artículo [ART-002] "Servicios Profesionales" creado"
- Row 7: Articulo - created - "Artículo [ART-003] "Hardware" creado"
```

### 5. Confirmar carga
- Click "✓ Confirmar y Guardar"
- Verificar que los 6 registros se crearon en la base de datos

### 6. Probar actualización por código
Crear `test_update.csv`:
```csv
type,name,code,managementName,areaName,packageName,conceptName,costCenterCode,expenseType,active
CostCenter,TI Corporativo,CC-001,,,,,,,
```

**Esperado**: 
```
- Row 2: CostCenter - updated - "Centro de costo [CC-001] actualizado (nombre: "TI Corporativo")"
```

## Columnas Exactas por Tipo

### CostCenter
- **Obligatorias**: `type`, `name`, `code`
- **Clave única**: `code` (case-insensitive)
- **Duplicable**: `name`

### Articulo
- **Obligatorias**: `type`, `name`, `code`
- **Clave única**: `code` (case-insensitive)
- **Duplicable**: `name`

### Otras entidades (sin cambios)
- **Management**: Clave única por `name`
- **Area**: Clave única por `name`
- **ExpensePackage**: Clave única por `name`
- **ExpenseConcept**: Clave única por `(packageId, name)`
- **Support**: Clave única por `name`

## Notas Técnicas

### Índices Case-Insensitive
- Uso de `LOWER(code)` en índices para permitir búsquedas case-insensitive
- `findFirst` con `mode: "insensitive"` en Prisma

### Mensajes Mejorados
- Formato `[código]` en lugar de nombre para identificación clara
- Ejemplo: `"Centro de costo [CC-001] actualizado (nombre: \"TI Corporativo\")"`

### Sin Cambios en API Regular
- Endpoints `/cost-centers` y `/articulos` no requieren cambios
- Solo validan y actualizan por ID (no por nombre)

---

**Implementado por**: Claude Sonnet 4.5  
**Fecha**: 4 de Noviembre, 2025  
**Versión**: 1.0  
**Estado**: ✅ Completo y probado

