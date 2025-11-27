# Correcciones - Módulo de Facturas

**Fecha:** 13 de octubre de 2025  
**Estado:** ✅ COMPLETADO

---

## 🎯 Problemas Resueltos

### 1. ✅ Panel "Información de la OC" - Contraste Corregido

**Problema:** Color de texto = color de fondo (texto no visible)

**Solución:**
```tsx
// ❌ ANTES
<div className="mt-4 p-4 bg-slate-50 rounded-lg">
  <h3 className="font-medium text-sm text-slate-700">...</h3>
  <span className="text-slate-600">Proveedor:</span>
  <p className="font-medium">{proveedor}</p>  {/* Color por defecto = bg */}
</div>

// ✅ DESPUÉS
<div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
  <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">...</h3>
  <span className="text-slate-600 dark:text-slate-400">Proveedor:</span>
  <p className="font-medium text-slate-900 dark:text-slate-100">{proveedor}</p>
</div>
```

**Mejoras:**
- ✅ Fondo más oscuro con contraste suficiente
- ✅ Texto explícito con `text-slate-900` / `dark:text-slate-100`
- ✅ Soporte para modo dark
- ✅ Borde visible para delimitar el panel
- ✅ Colores de saldo: `text-red-600 dark:text-red-400` / `text-green-600 dark:text-green-400`

---

### 2. ✅ Inputs que Pierden Foco - Problema de Re-renders

**Problema:** Al tipear en `numberNorm`, `montoSinIgv`, `ultimusIncident`, `detalle`, el input pierde foco

**Causa Raíz:**
- Componentes wrapper `InputWithError` y `SelectWithError` se re-creaban en cada render
- Keys inestables o funciones inline en `onChange`
- Dependencia de `fieldErrors` que cambiaba en cada tecla

**Solución:**

```tsx
// ❌ ANTES
const InputWithError = ({ error, ...props }: any) => {
  return (
    <div className="w-full">
      <Input {...props} className={...} />  {/* Se re-crea en cada render */}
    </div>
  );
};

<InputWithError
  value={form.numberNorm}
  onChange={(e: any) => setForm(f => ({ ...f, numberNorm: e.target.value }))}
  error={fieldErrors.numberNorm}
/>

// ✅ DESPUÉS
const handleFormChange = useCallback((field: string, value: string) => {
  setForm(prev => ({ ...prev, [field]: value }));
  // Limpiar error del campo al cambiar
  if (fieldErrors[field]) {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
}, [fieldErrors]);

<div className="w-full">
  <Input
    value={form.numberNorm}
    onChange={(e) => handleFormChange("numberNorm", e.target.value)}
    className={fieldErrors.numberNorm ? "border-red-500 focus:ring-red-500" : ""}
  />
  {fieldErrors.numberNorm && <p className="text-xs text-red-600 mt-1">{fieldErrors.numberNorm}</p>}
</div>
```

**Mejoras:**
- ✅ Handlers estables con `useCallback`
- ✅ Sin componentes wrapper que se re-crean
- ✅ DOM estable: no se desmonta/monta en cada tecla
- ✅ Limpieza automática de errores al editar el campo

---

### 3. ✅ Internal Server Error al Crear Factura

**Problema:** Error 500 al crear factura, sin mensajes claros

**Solución:**

#### Backend (`apps/api/src/invoices.ts`):

```typescript
// ✅ Logs en desarrollo
if (process.env.NODE_ENV === "development") {
  console.log("📥 POST /invoices - Payload recibido:", JSON.stringify(req.body, null, 2));
}

// ✅ Validación Zod con logs
const parsed = createInvoiceSchema.safeParse(req.body);
if (!parsed.success) {
  if (process.env.NODE_ENV === "development") {
    console.error("❌ Validación Zod fallida:", parsed.error.errors);
  }
  return reply.code(422).send({
    error: "VALIDATION_ERROR",
    issues: parsed.error.errors.map(err => ({
      path: err.path,
      message: err.message
    }))
  });
}

// ✅ Catch en operaciones DB
const oc = await prisma.oC.findUnique({ where: { id: data.ocId } })
  .catch(err => {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Error al buscar OC:", err);
    }
    throw err;
  });

// ✅ Log de éxito
if (process.env.NODE_ENV === "development") {
  console.log("✅ Factura creada exitosamente:", created.id);
}
```

**Mejoras:**
- ✅ Logs detallados en modo desarrollo (sin exponer en producción)
- ✅ Errores 422 con `issues[]` por campo
- ✅ Catches para aislar errores de DB vs validación
- ✅ Trazabilidad completa del flujo de creación

---

### 4. ✅ Listado de Facturas - Nuevas Columnas

**Problema:** Faltaban Paquete, Concepto, CECO, Incidente Ultimus en el listado

**Solución:**

#### Backend:

```typescript
// ✅ Include anidado para obtener datos relacionados
const items = await prisma.invoice.findMany({
  orderBy: [{ createdAt: "desc" }],
  include: {
    oc: {
      include: {
        support: {
          include: {
            expensePackage: true,
            expenseConcept: true,
            costCenter: true
          }
        },
        ceco: true  // CECO directo de OC (si existe)
      }
    },
    vendor: true  // Legacy
  }
});
```

**Ruta de datos:**
```
Invoice 
  → oc (OC)
    → support (Support)
      → expensePackage (ExpensePackage)
      → expenseConcept (ExpenseConcept)
      → costCenter (CostCenter)
    → ceco (CostCenter)  // CECO directo de OC
```

#### Frontend:

```tsx
// ✅ Nuevas columnas en tabla
<Th>Paquete</Th>
<Th>Concepto</Th>
<Th>CECO</Th>
<Th>Incidente</Th>

// ✅ Render de datos
<Td>{inv.oc?.support?.expensePackage?.name || "-"}</Td>
<Td>{inv.oc?.support?.expenseConcept?.name || "-"}</Td>
<Td>{(inv.oc?.ceco?.name || inv.oc?.support?.costCenter?.name) || "-"}</Td>
<Td className="text-xs">{inv.ultimusIncident || "-"}</Td>
```

**Prioridad CECO:**
1. `inv.oc.ceco.name` (CECO directo de la OC)
2. `inv.oc.support.costCenter.name` (CECO del Sustento)
3. `"-"` (si no existe)

---

### 5. ✅ Ordenamiento por Columnas con Click

**Problema:** No había forma de ordenar las facturas por diferentes criterios

**Solución:**

```tsx
// ✅ Estado de ordenamiento
const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({
  key: "createdAt",  // Default: más recientes primero
  direction: "desc"
});

// ✅ Handler de ordenamiento (ciclo: null → asc → desc → null)
const handleSort = useCallback((key: string) => {
  setSortConfig(prev => {
    if (prev.key === key) {
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: "createdAt", direction: "desc" }; // Reset a default
      return { key, direction: "asc" };
    } else {
      return { key, direction: "asc" };
    }
  });
}, []);

// ✅ Headers ordenables
<Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("numberNorm")}>
  Número {sortConfig.key === "numberNorm" && (sortConfig.direction === "asc" ? "↑" : "↓")}
</Th>
```

**Columnas ordenables:**
- ✅ Número
- ✅ Tipo
- ✅ OC
- ✅ Proveedor
- ✅ Moneda
- ✅ Monto sin IGV
- ✅ Paquete
- ✅ Concepto
- ✅ CECO
- ✅ Incidente
- ✅ Estado

**Comportamiento:**
1. **Click 1:** Orden ascendente (A→Z, 0→9) + icono ↑
2. **Click 2:** Orden descendente (Z→A, 9→0) + icono ↓
3. **Click 3:** Volver a orden por defecto (`createdAt desc`)
4. **Al cambiar filtros:** Reset automático a orden por defecto

---

## 📊 Tabla Completa de Facturas

### Columnas Visibles (sin IDs):

| Número | Tipo | OC | Proveedor | Moneda | Monto sin IGV | Paquete | Concepto | CECO | Incidente | Estado | Acciones |
|--------|------|----|-----------| -------|---------------|---------|----------|------|-----------|--------|----------|
| F-001 | FACTURA | OC-001 | Proveedor SAC | PEN | 5000.00 | Marketing | Publicidad Digital | CC-MKT-01 | INC-123 | INGRESADO | ... |
| NC-002 | NOTA_CREDITO | OC-001 | Proveedor SAC | PEN | 500.00 | Marketing | Publicidad Digital | CC-MKT-01 | INC-124 | PAGADO | ... |

---

## 🔄 Orden por Defecto

**Estado inicial:** `createdAt DESC` (más recientes primero)

**Reset automático:**
- Al cambiar filtro de Tipo
- Al cambiar filtro de Estado
- Al buscar por Número OC
- Al hacer click 3 veces en una columna (ciclo completo)

---

## 🎨 Mejoras de UX

### Contraste y Tema
- ✅ Soporte para modo dark en panel de OC
- ✅ Colores de badges con dark mode: `bg-blue-100 dark:bg-blue-900`
- ✅ Headers de tabla con hover: `hover:bg-slate-100 dark:hover:bg-slate-800`

### Interactividad
- ✅ Cursor pointer en headers ordenables
- ✅ Indicadores visuales (↑ ↓) de dirección de ordenamiento
- ✅ Limpieza automática de errores al editar campos

### Información Contextual
- ✅ Panel de OC con saldo en tiempo real
- ✅ Colores semánticos: verde = saldo positivo, rojo = sobregiro
- ✅ "-" para campos vacíos (nunca `null` visible)

---

## 📦 Archivos Modificados

### Backend
- ✅ `apps/api/src/invoices.ts`
  - Include de Paquete, Concepto, CECO
  - Logs en desarrollo
  - Manejo de errores mejorado

### Frontend
- ✅ `apps/web/src/pages/InvoicesPage.tsx`
  - Contraste del panel de OC
  - Inputs sin pérdida de foco (`useCallback`)
  - Nuevas columnas en tabla
  - Ordenamiento por click
  - Tipos actualizados para incluir relaciones anidadas

### Documentación
- ✅ `INVOICES_FIXES_SUMMARY.md` (este archivo)

---

## ✅ Checklist de Validación

- [x] Panel de OC se lee correctamente (buen contraste)
- [x] Puedo tipear en inputs sin perder foco
- [x] Al crear factura, errores 422 se mapean a campos
- [x] Logs en desarrollo para diagnosticar errores
- [x] Listado muestra Paquete, Concepto, CECO, Incidente
- [x] Click en headers ordena la tabla
- [x] Orden por defecto: `createdAt DESC`
- [x] Cambiar filtros resetea el ordenamiento
- [x] No se muestran IDs en UI
- [x] Proveedor/Moneda derivados de OC
- [x] Build exitoso sin errores

---

## 🧪 Casos de Prueba

### Test 1: Contraste del Panel
1. Seleccionar una OC en el formulario
2. Verificar que el panel de información es legible
3. Cambiar a dark mode
4. Verificar que el contraste se mantiene

**✅ Resultado:** Texto visible en ambos modos

---

### Test 2: Tipear sin Perder Foco
1. Abrir formulario de nueva factura
2. Hacer click en "Número de Factura"
3. Escribir "F-001" carácter por carácter
4. Verificar que el cursor permanece en el input

**✅ Resultado:** Sin pérdida de foco

---

### Test 3: Ordenamiento por Columnas
1. Ir al listado de facturas
2. Click en header "Proveedor"
3. Verificar orden A→Z + icono ↑
4. Click nuevamente
5. Verificar orden Z→A + icono ↓
6. Click una vez más
7. Verificar que vuelve a `createdAt DESC`

**✅ Resultado:** Ciclo completo funcional

---

### Test 4: Nuevas Columnas Visibles
1. Listar facturas
2. Verificar columnas: Paquete, Concepto, CECO, Incidente
3. Verificar que muestran datos correctos o "-"

**✅ Resultado:** Datos correctos desde OC → Support

---

### Test 5: Reset de Ordenamiento al Filtrar
1. Ordenar por "Monto sin IGV" DESC
2. Cambiar filtro de Tipo a "FACTURA"
3. Verificar que el ordenamiento volvió a `createdAt DESC`

**✅ Resultado:** Reset automático

---

## 🛠️ Mantenimiento

### Agregar Nueva Columna Ordenable

```tsx
// 1. Agregar key en sortConfig switch
case "nuevoCampo":
  aValue = a.nuevoCampo;
  bValue = b.nuevoCampo;
  break;

// 2. Agregar header ordenable
<Th className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort("nuevoCampo")}>
  Nuevo Campo {sortConfig.key === "nuevoCampo" && (sortConfig.direction === "asc" ? "↑" : "↓")}
</Th>
```

### Cambiar Orden por Defecto

```tsx
const [sortConfig, setSortConfig] = useState({
  key: "numberNorm",  // Cambiar aquí
  direction: "asc"
});
```

---

## 📚 Referencias

- **Backend Logs:** Solo en `NODE_ENV === "development"`
- **Orden Default:** `createdAt DESC` (más recientes primero)
- **Relaciones:** `Invoice → OC → Support → ExpensePackage/ExpenseConcept/CostCenter`
- **Prioridad CECO:** `OC.ceco` > `Support.costCenter` > `"-"`

---

**Estado Final:** ✅ **TODOS LOS PROBLEMAS RESUELTOS**

**Build Status:** ✅ Compilación exitosa (backend + frontend)

**Linting:** ✅ Sin errores

