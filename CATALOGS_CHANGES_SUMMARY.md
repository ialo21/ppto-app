# Resumen de Cambios - Catálogos sin Código e IDs Ocultos

**Fecha:** 13 de octubre de 2025  
**Estado:** ✅ COMPLETADO

---

## 🎯 Objetivos Cumplidos

✅ **Gerencias & Áreas:** Campo "código" eliminado del UI y modelo (ahora nullable)  
✅ **Sustentos:** Formulario usa `managementId`/`areaId` (IDs) en lugar de strings legacy  
✅ **Backend:** Validaciones de unicidad case-insensitive con errores 422 por campo  
✅ **IDs Ocultos:** Columnas ID removidas de todas las tablas de catálogos y OCs  
✅ **Documentación:** README completo de reglas de negocio

---

## 📦 Cambios por Módulo

### 1. **Base de Datos**

#### Migración: `20251013000000_catalogs_unique_names`

```sql
-- Campo code nullable en Management y Area
ALTER TABLE "Management" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "Area" ALTER COLUMN "code" DROP NOT NULL;

-- Índices únicos case-insensitive
CREATE UNIQUE INDEX "Management_name_unique_lower" ON "Management"(LOWER("name"));
CREATE UNIQUE INDEX "Area_name_unique_lower" ON "Area"(LOWER("name"));
CREATE UNIQUE INDEX "CostCenter_name_unique_lower" ON "CostCenter"(LOWER("name"));
CREATE UNIQUE INDEX "Articulo_name_unique_lower" ON "Articulo"(LOWER("name"));
CREATE UNIQUE INDEX "Support_name_unique_lower" ON "Support"(LOWER("name"));
```

**Archivo:** `packages/db/migrations/20251013000000_catalogs_unique_names/migration.sql`

---

### 2. **Schema Prisma**

**Archivo:** `packages/db/schema.prisma`

```prisma
model Management {
  id       Int       @id @default(autoincrement())
  code     String?   // DEPRECATED: usar name directamente
  name     String    // Unicidad case-insensitive via índice
  active   Boolean   @default(true)
  supports Support[]
  areas    Area[]
}

model Area {
  id           Int         @id @default(autoincrement())
  code         String?     // DEPRECATED: usar name directamente
  name         String      // Unicidad case-insensitive via índice
  managementId Int
  management   Management  @relation(...)
  active       Boolean     @default(true)
  supports     Support[]
}
```

---

### 3. **Backend - API**

#### `apps/api/src/masters.ts`

**Cambios:**
- ✅ Schemas Zod: `code` opcional para Management y Area
- ✅ Validación de unicidad case-insensitive
- ✅ Respuestas 422 con `issues[]` por campo
- ✅ Ordenamiento por `name` en lugar de `code`

```typescript
// Validación de unicidad
const existing = await prisma.management.findFirst({
  where: {
    name: { equals: name, mode: "insensitive" },
    ...(id ? { id: { not: id } } : {})
  }
});

if (existing) {
  return reply.code(422).send({
    error: "VALIDATION_ERROR",
    issues: [{ path: ["name"], message: "El nombre ya existe" }]
  });
}
```

#### `apps/api/src/supports.ts`

**Cambios:**
- ✅ Schema Zod actualizado con `managementId` y `areaId` (opcionales)
- ✅ Campos legacy `management`/`area` (strings) deprecados pero soportados
- ✅ Priorización de IDs sobre strings
- ✅ Validación de FKs con errores 422
- ✅ Include de relaciones: `managementRef` y `areaRef`

```typescript
const upsertSupportSchema = z.object({
  // NUEVO: usar IDs
  managementId: z.number().int().positive().nullable().optional(),
  areaId: z.number().int().positive().nullable().optional(),
  // DEPRECATED: compatibilidad legacy
  management: z.string().trim().nullable().optional(),
  area: z.string().trim().nullable().optional(),
  // ...resto de campos
});
```

---

### 4. **Frontend**

#### `apps/web/src/pages/SettingsPage.tsx`

**Tipos TypeScript:**

```typescript
type Management = { 
  id: number; 
  code?: string | null; 
  name: string; 
  active: boolean; 
  areas: Area[] 
};

type Area = { 
  id: number; 
  code?: string | null; 
  name: string; 
  managementId: number; 
  active: boolean; 
};

type Support = {
  id: number;
  code: string | null;
  name: string;
  managementId?: number | null;
  areaId?: number | null;
  managementRef?: Management | null;
  areaRef?: Area | null;
  management: string | null;  // DEPRECATED
  area: string | null;  // DEPRECATED
  // ...resto de campos
};
```

**Estados de Formulario:**

```typescript
// Gerencias
const [managementForm, setManagementForm] = useState({ id: "", name: "" });
const [managementErrors, setManagementErrors] = useState<Record<string, string>>({});

// Áreas
const [areaForm, setAreaForm] = useState({ id: "", name: "", managementId: "" });
const [areaErrors, setAreaErrors] = useState<Record<string, string>>({});

// Sustentos
const [supportForm, setSupportForm] = useState({
  id: "",
  name: "",
  code: "",
  managementId: "",  // ✅ ID numérico
  areaId: "",  // ✅ ID numérico
  costCenterId: "",
  packageId: "",
  conceptId: "",
  expenseType: ""
});
const [supportErrors, setSupportErrors] = useState<Record<string, string>>({});
```

**Áreas Disponibles (Dependientes de Gerencia):**

```typescript
const availableAreas = useMemo(() => {
  if (supportForm.managementId) {
    const mgmt = (managementsQuery.data || []).find(
      m => m.id === Number(supportForm.managementId)
    );
    return mgmt?.areas || [];
  }
  return areasQuery.data || [];
}, [supportForm.managementId, managementsQuery.data, areasQuery.data]);
```

**Selects del Formulario de Sustentos:**

```tsx
<Select
  value={supportForm.managementId}
  onChange={e => setSupportForm(f => ({ 
    ...f, 
    managementId: e.target.value, 
    areaId: "" 
  }))}
>
  <option value="">Sin gerencia</option>
  {(managementsQuery.data || []).map(mgmt => (
    <option key={mgmt.id} value={mgmt.id}>{mgmt.name}</option>
  ))}
</Select>

<Select
  value={supportForm.areaId}
  onChange={e => setSupportForm(f => ({ ...f, areaId: e.target.value }))}
>
  <option value="">Sin área</option>
  {availableAreas.map(area => (
    <option key={area.id} value={area.id}>{area.name}</option>
  ))}
</Select>
```

**Manejo de Errores 422:**

```typescript
onError: (error: any) => {
  if (error.response?.status === 422 && error.response?.data?.issues) {
    const errors: Record<string, string> = {};
    error.response.data.issues.forEach((issue: any) => {
      const field = issue.path.join(".");
      errors[field] = issue.message;
    });
    setManagementErrors(errors);
    toast.error("Revisa los campos resaltados");
  } else {
    toast.error("No se pudo guardar");
  }
}
```

**Inputs con Errores Inline:**

```tsx
<div>
  <Input
    placeholder="Nombre"
    value={managementForm.name}
    onChange={e => setManagementForm(f => ({ ...f, name: e.target.value }))}
    className={managementErrors.name ? "border-red-500" : ""}
  />
  {managementErrors.name && (
    <p className="text-xs text-red-600 mt-1">{managementErrors.name}</p>
  )}
</div>
```

**Tablas sin Columna ID:**

```tsx
// ❌ ANTES
<thead>
  <tr>
    <Th>ID</Th>
    <Th>Código</Th>
    <Th>Nombre</Th>
  </tr>
</thead>
<tbody>
  {items.map(item => (
    <tr key={item.id}>
      <Td>{item.id}</Td>
      <Td>{item.code}</Td>
      <Td>{item.name}</Td>
    </tr>
  ))}
</tbody>

// ✅ DESPUÉS
<thead>
  <tr>
    <Th>Código</Th>
    <Th>Nombre</Th>
  </tr>
</thead>
<tbody>
  {items.map(item => (
    <tr key={item.id}>  {/* ID solo en key */}
      <Td>{item.code}</Td>
      <Td>{item.name}</Td>
    </tr>
  ))}
</tbody>
```

#### `apps/web/src/pages/PurchaseOrdersPage.tsx`

**Tabla sin Columna ID:**

```tsx
<thead>
  <tr>
    <Th>Número OC</Th>
    <Th>Proveedor</Th>
    <Th>Moneda</Th>
    {/* ...resto sin ID */}
  </tr>
</thead>
<tbody>
  {filteredOcs.map((oc: any) => (
    <tr key={oc.id}>  {/* ID solo en key */}
      <Td>{oc.numeroOc || "-"}</Td>
      {/* ...resto de datos */}
    </tr>
  ))}
</tbody>
```

---

### 5. **Documentación**

**Archivo:** `apps/web/src/pages/catalogs/README.md`

Incluye:
- ✅ Reglas de unicidad case-insensitive
- ✅ Política de IDs ocultos
- ✅ Modelo de Gerencias & Áreas
- ✅ Uso de `managementId`/`areaId` en Sustentos
- ✅ Formato de errores 422
- ✅ Ejemplos de código
- ✅ Checklist de calidad

---

## 🧪 Casos de Prueba

### Test 1: Crear Gerencia con Nombre Duplicado

**Steps:**
1. Crear gerencia "Gerencia Finanzas"
2. Intentar crear otra "gerencia finanzas" (case-insensitive)

**Resultado Esperado:**
- ❌ Backend responde 422
- 🔴 Campo nombre con borde rojo
- 📝 Mensaje: "El nombre ya existe"
- 🔔 Toast: "Revisa los campos resaltados"

---

### Test 2: Crear Sustento con Gerencia y Área

**Steps:**
1. Abrir formulario de Sustentos
2. Seleccionar Gerencia "Operaciones"
3. Ver que el select de Áreas se filtra automáticamente
4. Seleccionar Área "Logística"
5. Completar nombre y guardar

**Resultado Esperado:**
- ✅ Payload enviado con `managementId: 3, areaId: 8`
- ✅ Backend guarda correctamente
- ✅ Toast: "Sustento guardado"
- ✅ Tabla se actualiza mostrando "Operaciones / Logística"

---

### Test 3: Editar Sustento Existente

**Steps:**
1. Click en "Editar" de un sustento con Gerencia/Área
2. Ver que los selects se hidratan correctamente

**Resultado Esperado:**
- ✅ Select Gerencia muestra el nombre correcto
- ✅ Select Área muestra el nombre correcto
- ✅ Al guardar, mantiene los IDs

---

### Test 4: Tablas sin IDs

**Steps:**
1. Abrir Catálogos → Gerencias & Áreas
2. Abrir Catálogos → Sustentos
3. Abrir Órdenes de Compra

**Resultado Esperado:**
- ✅ Ninguna tabla muestra columna "ID"
- ✅ Columnas son legibles (Nombre, Código, etc.)

---

## 📊 Archivos Modificados

### Backend
- ✅ `packages/db/schema.prisma`
- ✅ `packages/db/migrations/20251013000000_catalogs_unique_names/migration.sql`
- ✅ `apps/api/src/masters.ts`
- ✅ `apps/api/src/supports.ts`

### Frontend
- ✅ `apps/web/src/pages/SettingsPage.tsx`
- ✅ `apps/web/src/pages/PurchaseOrdersPage.tsx`

### Documentación
- ✅ `apps/web/src/pages/catalogs/README.md` (nuevo)
- ✅ `CATALOGS_CHANGES_SUMMARY.md` (este archivo)

---

## ✅ Checklist de Validación

- [x] Migración aplicada sin errores
- [x] Backend compila sin errores TypeScript
- [x] Frontend compila sin errores
- [x] Campo `code` eliminado de formularios de Gerencias y Áreas
- [x] Formulario de Sustentos usa `managementId` y `areaId`
- [x] Áreas se filtran según Gerencia seleccionada
- [x] Errores 422 mapeados a campos inline
- [x] IDs ocultos en todas las tablas
- [x] Toasts en español
- [x] Compatibilidad con datos legacy (strings `management`/`area`)
- [x] Documentación completa

---

## 🚀 Próximos Pasos (Opcional)

1. **Tests Automatizados:**
   - Unit tests para validaciones
   - Integration tests para flujo completo de Sustentos

2. **Performance:**
   - Agregar índices adicionales si necesario
   - Cache de queries de catálogos

3. **UX Mejoradas:**
   - Autocomplete en lugar de selects simples
   - Búsqueda en tiempo real

4. **Migración de Datos Legacy:**
   - Script para convertir `management`/`area` (strings) → `managementId`/`areaId`

---

## 📞 Soporte

Para dudas o problemas, consultar:
- `apps/web/src/pages/catalogs/README.md`
- Este documento (`CATALOGS_CHANGES_SUMMARY.md`)

---

**Estado Final:** ✅ **TODOS LOS OBJETIVOS COMPLETADOS**

**Build Status:** ✅ Compilación exitosa (backend + frontend)

**Sin Regresiones:** ✅ Otros módulos (Invoices, OCs) no afectados

