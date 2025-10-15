# Catálogos - Reglas de Negocio

## 📋 Descripción General

Los catálogos son entidades maestras que se utilizan en todo el sistema para normalizar y estandarizar datos. Este módulo gestiona:

- **Paquetes & Conceptos**: Paquetes de gasto y sus conceptos asociados
- **Centros de Costo (CECO)**: Centros de costo disponibles para los sustentos
- **Artículos**: Catálogo de artículos para órdenes de compra
- **Gerencias & Áreas**: Estructura organizacional jerárquica
- **Sustentos**: Catálogo completo de sustentos con todas sus relaciones

---

## 🔒 Unicidad de Nombres

**Regla principal:** Todos los catálogos usan **nombre único (case-insensitive)**.

### Catálogos con Unicidad Global

- ✅ **Gerencias**: El nombre debe ser único en todo el sistema (case-insensitive)
- ✅ **Áreas**: El nombre debe ser único en todo el sistema (case-insensitive)
- ✅ **Paquetes**: El nombre debe ser único
- ✅ **Centros de Costo**: El nombre debe ser único
- ✅ **Artículos**: El nombre debe ser único
- ✅ **Sustentos**: El nombre debe ser único

### Catálogos con Unicidad Compuesta

- ✅ **Conceptos**: El nombre debe ser único **dentro de su paquete**  
  (Dos paquetes diferentes pueden tener conceptos con el mismo nombre)

---

## ⚠️ Manejo de Errores

Cuando se intenta crear/editar un registro con un nombre duplicado, el backend devuelve:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": "VALIDATION_ERROR",
  "issues": [
    {
      "path": ["name"],
      "message": "El nombre ya existe"
    }
  ]
}
```

### En el Frontend

El error se mapea automáticamente al campo correspondiente:

```typescript
// El error aparece debajo del input "Nombre"
<Input
  value={form.name}
  className={errors.name ? "border-red-500" : ""}
/>
{errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
```

**Toast complementario:** "Revisa los campos resaltados"

---

## 🆔 Política de IDs

### ❌ NO MOSTRAR IDs en:

- Tablas/listados
- Formularios de creación/edición
- Exports CSV (por defecto)
- Vistas de usuario

### ✅ IDs solo para:

- Keys de React (`key={item.id}`)
- Payloads de API (internos)
- Relaciones entre entidades (FKs)

**Ejemplo de tabla correcta:**

```tsx
<thead>
  <tr>
    <Th>Nombre</Th>
    <Th>Descripción</Th>
    <Th>Acciones</Th>
  </tr>
</thead>
<tbody>
  {items.map(item => (
    <tr key={item.id}>  {/* ✅ ID solo en key */}
      <Td>{item.name}</Td>
      <Td>{item.description}</Td>
      <Td>...</Td>
    </tr>
  ))}
</tbody>
```

---

## 🏢 Gerencias & Áreas

### Características

- **Sin campo código**: Eliminado del modelo y UI
- **Nombre como identificador**: Único y case-insensitive
- **Jerarquía**: Áreas pertenecen a una Gerencia (relación obligatoria)
- **Cascade delete**: Al eliminar una Gerencia, se eliminan sus Áreas

### Modelo

```prisma
model Management {
  id       Int       @id @default(autoincrement())
  code     String?   // DEPRECATED: no usar
  name     String    // Unicidad via índice case-insensitive
  active   Boolean   @default(true)
  supports Support[]
  areas    Area[]
}

model Area {
  id           Int         @id @default(autoincrement())
  code         String?     // DEPRECATED: no usar
  name         String      // Unicidad via índice case-insensitive
  managementId Int
  management   Management  @relation(...)
  active       Boolean     @default(true)
  supports     Support[]
}
```

### Índices de Base de Datos

```sql
CREATE UNIQUE INDEX "Management_name_unique_lower" ON "Management"(LOWER("name"));
CREATE UNIQUE INDEX "Area_name_unique_lower" ON "Area"(LOWER("name"));
```

---

## 📦 Sustentos

### Relaciones

Los sustentos se relacionan con:

- **Gerencia** (managementId): Opcional, via ID
- **Área** (areaId): Opcional, via ID
- **Centro de Costo** (costCenterId): Opcional
- **Paquete de Gasto** (expensePackageId): Opcional
- **Concepto de Gasto** (expenseConceptId): Opcional
- **Tipo de Gasto**: ADMINISTRATIVO | PRODUCTO | DISTRIBUIBLE

### Campos Legacy

⚠️ **IMPORTANTE**: Los campos `management` y `area` (strings) están **DEPRECATED**.

- Se mantienen solo para compatibilidad con datos históricos
- Al crear/editar, usar **`managementId`** y **`areaId`** (números)
- El backend prioriza IDs sobre strings legacy

### Formulario de Sustentos

**Flujo de selección:**

1. Usuario selecciona **Gerencia** (select carga todas las gerencias)
2. Al seleccionar Gerencia, el select de **Área** se filtra automáticamente
3. Solo se muestran las Áreas que pertenecen a la Gerencia seleccionada

```typescript
const availableAreas = useMemo(() => {
  if (supportForm.managementId) {
    const mgmt = managements.find(m => m.id === Number(supportForm.managementId));
    return mgmt?.areas || [];
  }
  return allAreas;
}, [supportForm.managementId, managements, allAreas]);
```

### Payload de API

```typescript
// ✅ CORRECTO
{
  "name": "Sustento de ejemplo",
  "code": "S-0001",
  "managementId": 5,      // ✅ ID numérico
  "areaId": 12,           // ✅ ID numérico
  "costCenterId": 3,
  "expenseType": "ADMINISTRATIVO"
}

// ❌ INCORRECTO (legacy)
{
  "name": "Sustento viejo",
  "management": "Gerencia Finanzas",  // ❌ String deprecated
  "area": "Área Contabilidad"         // ❌ String deprecated
}
```

---

## 📤 Exports CSV

### Campos Incluidos

Los exports **NO** incluyen:

- ❌ IDs internos (id, costCenterId, managementId, etc.)

Los exports **SÍ** incluyen:

- ✅ Nombres legibles (nombre de gerencia, nombre de área, etc.)
- ✅ Códigos (si son relevantes para el usuario)
- ✅ Fechas, importes, estados

### Ejemplo OC CSV

```csv
NumeroOC,Estado,Proveedor,RUC,Moneda,ImporteSinIGV,Support,PeriodoDesde,PeriodoHasta,FechaRegistro,Solicitante,Correo,Articulo,CECO,Comentario
OC-2026-0001,PENDIENTE,Proveedor SAC,20123456789,PEN,1500.00,"Marketing Digital","Enero 2026","Diciembre 2026",2026-01-15,"Juan Pérez","juan@empresa.com","Servicios Profesionales","CC-MKT-01",""
```

---

## 🔄 Migraciones Aplicadas

### `20251013000000_catalogs_unique_names`

- ✅ Campo `code` en `Management` y `Area`: ahora es **nullable** (opcional)
- ✅ Índices únicos case-insensitive en:
  - `Management.name`
  - `Area.name`
  - `CostCenter.name`
  - `Articulo.name`
  - `ExpensePackage.name`
  - `Support.name`
  - `ExpenseConcept` (packageId + name)

---

## 🛠️ Desarrollo

### Agregar un Nuevo Catálogo

1. **Modelo Prisma** (`packages/db/schema.prisma`):
   ```prisma
   model NuevoCatalogo {
     id     Int     @id @default(autoincrement())
     name   String  // Unicidad via índice
     active Boolean @default(true)
   }
   ```

2. **Migración**:
   ```bash
   pnpm -C packages/db prisma migrate dev --name add_nuevo_catalogo
   ```

3. **Índice único** (en migration.sql):
   ```sql
   CREATE UNIQUE INDEX "NuevoCatalogo_name_unique_lower" 
     ON "NuevoCatalogo"(LOWER("name"));
   ```

4. **Backend** (`apps/api/src/masters.ts`):
   - Schema Zod con validación
   - Endpoints CRUD con error 422 para duplicados

5. **Frontend** (`apps/web/src/pages/SettingsPage.tsx`):
   - Query/mutation con React Query
   - Formulario con manejo de errores inline
   - Tabla **sin columna ID**

---

## ✅ Checklist de Calidad

Al trabajar con catálogos, verificar:

- [ ] Nombre único (case-insensitive)
- [ ] Validación frontend con mensaje inline
- [ ] Backend devuelve 422 con `issues[]` en caso de error
- [ ] No se muestra ID en tabla/formulario
- [ ] Toasts claros en español
- [ ] Export CSV sin IDs internos
- [ ] Soft delete o validación de relaciones al eliminar

---

## 📚 Referencias

- **API Endpoints**: `/cost-centers`, `/articulos`, `/managements`, `/areas`, `/supports`, `/expense-packages`
- **Validación Estándar**: Zod con mensajes en español
- **Error 422**: `{ error: "VALIDATION_ERROR", issues: [{ path, message }] }`
- **Prisma Client**: Regenerar después de cada migración (`pnpm -C packages/db prisma:generate`)

---

**Última actualización:** 13 de octubre de 2025  
**Mantenido por:** Equipo de Desarrollo

