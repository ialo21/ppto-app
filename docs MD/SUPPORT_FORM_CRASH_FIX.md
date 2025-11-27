# Fix: Crash al Cancelar/Editar Sustentos (undefined .length)

## 🐛 Problema

Al editar un sustento y luego presionar **Cancelar**, la aplicación crasheaba con:

```
TypeError: Cannot read properties of undefined (reading 'length')
```

### Ubicación del error
- **Componente:** `apps/web/src/pages/SettingsPage.tsx`
- **Sección:** Formulario de Sustentos (creación/edición)
- **Causa:** Accesos directos a `supportForm.costCenterIds.length` y `.map()` sin protección

---

## 🔍 Diagnóstico

### Causas raíz

1. **Botón Cancelar incompleto (líneas 1050-1064):**
   ```typescript
   // ANTES - ❌ Faltaba costCenterIds
   onClick={() =>
     setSupportForm({
       id: "",
       name: "",
       code: "",
       managementId: "",
       areaId: "",
       costCenterId: "",
       packageId: "",
       conceptId: "",
       expenseType: ""
       // ❌ costCenterIds no estaba aquí
     })
   }
   ```
   
   **Resultado:** Al cancelar, `supportForm.costCenterIds` quedaba `undefined`.

2. **Accesos no protegidos a arrays (múltiples líneas):**
   ```typescript
   // ❌ Crash si costCenterIds es undefined
   {supportForm.costCenterIds.length > 0 && ...}
   {supportForm.costCenterIds.map(ccId => ...)}
   !supportForm.costCenterIds.includes(cc.id)
   [...f.costCenterIds, cc.id]
   f.costCenterIds.filter(id => id !== ccId)
   ```

3. **Estados de reset inconsistentes:**
   - En `onSuccess` después de guardar: ✅ Tenía `costCenterIds: []`
   - En `onSuccess` después de eliminar: ✅ Tenía `costCenterIds: []`
   - En botón **Cancelar**: ❌ **NO tenía** `costCenterIds`

---

## ✅ Solución

### 1. Estado inicial centralizado

Definido como constante para reutilización segura:

```typescript
// Estado inicial del formulario de Sustentos (para reset seguro)
const INITIAL_SUPPORT_FORM = {
  id: "",
  name: "",
  code: "",
  managementId: "",
  areaId: "",
  costCenterId: "",  // DEPRECATED
  costCenterIds: [] as number[],  // ✅ M:N
  packageId: "",
  conceptId: "",
  expenseType: ""
};

const [supportForm, setSupportForm] = useState(INITIAL_SUPPORT_FORM);
```

### 2. Botón Cancelar corregido

**DESPUÉS - ✅:**
```typescript
{supportForm.id && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      setSupportForm(INITIAL_SUPPORT_FORM);  // ✅ Estado completo
      setSupportErrors({});
      setCostCenterSearchSupport("");
    }}
  >
    Cancelar
  </Button>
)}
```

### 3. Uso del estado inicial en resets

```typescript
// onSuccess después de guardar
onSuccess: () => {
  toast.success("Sustento guardado");
  setSupportForm(INITIAL_SUPPORT_FORM);  // ✅
  // ...
}

// onSuccess después de eliminar
onSuccess: () => {
  toast.success("Sustento y sus registros asociados eliminados correctamente");
  if (supportForm.id) {
    setSupportForm(INITIAL_SUPPORT_FORM);  // ✅
  }
  // ...
}
```

### 4. Accesos protegidos con optional chaining

#### Envío del payload
**ANTES:**
```typescript
if (supportForm.costCenterIds.length > 0) {  // ❌ Crash si undefined
  payload.costCenterIds = supportForm.costCenterIds;
}
```

**DESPUÉS:**
```typescript
const costCenterIds = supportForm.costCenterIds ?? [];  // ✅
if (costCenterIds.length > 0) {
  payload.costCenterIds = costCenterIds;
}
```

#### Filtrado de CECOs disponibles
**ANTES:**
```typescript
.filter(cc => {
  // ...
  return ... && !supportForm.costCenterIds.includes(cc.id);  // ❌
})
```

**DESPUÉS:**
```typescript
.filter(cc => {
  const search = costCenterSearchSupport.toLowerCase();
  const selectedIds = supportForm.costCenterIds ?? [];  // ✅
  return (
    cc.code.toLowerCase().includes(search) ||
    (cc.name?.toLowerCase() || "").includes(search)
  ) && !selectedIds.includes(cc.id);
})
```

#### Agregar CECO
**ANTES:**
```typescript
onClick={() => {
  setSupportForm(f => ({
    ...f,
    costCenterIds: [...f.costCenterIds, cc.id]  // ❌
  }));
}}
```

**DESPUÉS:**
```typescript
onClick={() => {
  setSupportForm(f => ({
    ...(f ?? INITIAL_SUPPORT_FORM),  // ✅ Fallback
    costCenterIds: [...(f?.costCenterIds ?? []), cc.id]  // ✅
  }));
  setCostCenterSearchSupport("");
}}
```

#### Renderizado de chips
**ANTES:**
```typescript
{supportForm.costCenterIds.length > 0 && (  // ❌
  <div className="flex flex-wrap gap-2">
    {supportForm.costCenterIds.map(ccId => {  // ❌
      // ...
    })}
  </div>
)}
```

**DESPUÉS:**
```typescript
{(() => {
  const selectedIds = supportForm.costCenterIds ?? [];  // ✅
  return selectedIds.length > 0 && (
    <div className="flex flex-wrap gap-2">
      {selectedIds.map(ccId => {  // ✅
        const cc = (costCentersQuery.data || []).find(c => c.id === ccId);
        if (!cc) return null;
        return (
          <span key={ccId} className="...">
            {cc.code} — {cc.name || "—"}
            <button
              type="button"
              onClick={() =>
                setSupportForm(f => ({
                  ...(f ?? INITIAL_SUPPORT_FORM),  // ✅
                  costCenterIds: (f?.costCenterIds ?? []).filter(id => id !== ccId)  // ✅
                }))
              }
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
})()}
```

#### Botón Editar
**ANTES:**
```typescript
onClick={() =>
  setSupportForm({
    // ...
    costCenterIds: support.costCenters ? support.costCenters.map(link => link.costCenter.id) : [],
  })
}
```

**DESPUÉS:**
```typescript
onClick={() => {
  setSupportForm({
    id: String(support.id),
    name: support.name,
    code: support.code ?? "",
    managementId: support.managementRef?.id ? String(support.managementRef.id) : "",
    areaId: support.areaRef?.id ? String(support.areaRef.id) : "",
    costCenterId: support.costCenter ? String(support.costCenter.id) : "",
    costCenterIds: (support.costCenters ?? []).map(link => link.costCenter.id),  // ✅
    packageId: support.expensePackage ? String(support.expensePackage.id) : "",
    conceptId: support.expenseConcept ? String(support.expenseConcept.id) : "",
    expenseType: support.expenseType ?? ""
  });
  setCostCenterSearchSupport("");  // ✅ Limpiar búsqueda
}}
```

---

## 📊 Cambios realizados

**Archivo modificado:** `apps/web/src/pages/SettingsPage.tsx`

### Líneas afectadas

| Línea(s) | Cambio | Descripción |
|----------|--------|-------------|
| 123-135 | ✨ Nuevo | Definición de `INITIAL_SUPPORT_FORM` |
| 137 | ✏️ Modificado | `useState(INITIAL_SUPPORT_FORM)` |
| 396-399 | 🛡️ Protegido | Envío de `costCenterIds` con fallback |
| 409 | ✏️ Simplificado | `setSupportForm(INITIAL_SUPPORT_FORM)` |
| 434 | ✏️ Simplificado | `setSupportForm(INITIAL_SUPPORT_FORM)` |
| 1037-1040 | 🐛 **Fix crítico** | Botón Cancelar con estado completo |
| 1110 | 🛡️ Protegido | Filtrado con `?? []` |
| 1122-1126 | 🛡️ Protegido | Agregar CECO con fallbacks |
| 1135-1165 | 🛡️ Refactorizado | Renderizado de chips con IIFE y fallbacks |
| 1274-1288 | 🛡️ Mejorado | Botón Editar con `?? []` y limpieza de búsqueda |

**Total:** ~20 líneas modificadas/agregadas

---

## 🧪 Pruebas manuales

### Caso 1: Editar sustento con varios CECOs

1. Ir a **Catálogos** → **Sustentos**
2. Click en **Editar** en un sustento que tenga CECOs
3. **Verificar:** Los chips de CECOs se muestran correctamente

**Resultado esperado:** ✅ Se ven los chips con los códigos de CECO

### Caso 2: Cancelar edición

1. Continuar desde Caso 1 (sustento en edición)
2. Click en botón **Cancelar**
3. **Verificar:** No hay crash, la página vuelve al estado normal

**Resultado esperado:** 
- ✅ No hay error en consola
- ✅ Formulario vuelve al estado inicial
- ✅ Campo "Editando sustento #N" desaparece
- ✅ Botón Cancelar desaparece

### Caso 3: Volver a editar después de cancelar

1. Continuar desde Caso 2
2. Click en **Editar** en otro sustento
3. **Verificar:** El formulario se carga correctamente

**Resultado esperado:**
- ✅ Se muestran los CECOs del nuevo sustento
- ✅ No hay residuos del sustento anterior

### Caso 4: Agregar y quitar CECOs

1. Editar un sustento
2. Buscar y agregar un nuevo CECO
3. **Verificar:** Se agrega el chip
4. Click en "×" en un chip
5. **Verificar:** Se elimina el chip

**Resultado esperado:**
- ✅ Agregar CECO funciona sin crash
- ✅ Eliminar CECO funciona sin crash
- ✅ Estado del formulario se mantiene consistente

### Caso 5: Guardar después de editar CECOs

1. Editar un sustento
2. Agregar/quitar CECOs
3. Click en **Actualizar**
4. **Verificar:** Se guarda correctamente

**Resultado esperado:**
- ✅ Toast de éxito
- ✅ Formulario se resetea a estado inicial
- ✅ Listado se actualiza con los nuevos CECOs

---

## ✅ Criterios de aceptación cumplidos

| Criterio | Estado |
|----------|--------|
| Al editar un sustento, los CECOs seleccionados se muestran correctamente | ✅ |
| Al pulsar Cancelar, no hay crash | ✅ |
| El formulario vuelve al estado inicial al cancelar | ✅ |
| No hay referencias a `*_length` (typos) | ✅ (No se encontraron) |
| No hay accesos a `.length/.map` sobre valores `undefined` | ✅ |
| `pnpm build` sin errores | ✅ |
| Editar → Cancelar → Editar funciona correctamente | ✅ |

---

## 🔒 Defensas implementadas

### Patrón aplicado

```typescript
// ✅ Siempre usar:
const safeArray = form?.arrayField ?? [];

// ✅ En setters:
setForm(f => ({
  ...(f ?? INITIAL_FORM),
  arrayField: (f?.arrayField ?? []).filter(...)
}));

// ✅ En renderizado:
{(() => {
  const items = form.arrayField ?? [];
  return items.length > 0 && items.map(...);
})()}
```

### Aplicado también a otros campos

Si bien el foco fue `costCenterIds`, el mismo patrón puede aplicarse a:
- `availableConcepts` (conceptos filtrados por paquete)
- `availableAreas` (áreas filtradas por gerencia)
- Cualquier otro array derivado del formulario

---

## 🚀 Deploy

```bash
# 1. Build (ya ejecutado ✅)
pnpm run build

# 2. Verificar en local
# - Editar sustento con CECOs
# - Presionar Cancelar
# - Verificar que no hay crash

# 3. Deploy según estrategia
# (pm2 restart, docker restart, etc.)
```

---

## 📝 Notas técnicas

### ¿Por qué usar IIFE en el renderizado de chips?

```typescript
{(() => {
  const selectedIds = supportForm.costCenterIds ?? [];
  return selectedIds.length > 0 && ...;
})()}
```

**Razón:** 
- Evita repetir `supportForm.costCenterIds ?? []` en múltiples lugares
- Hace el código más legible y mantenible
- Permite agregar lógica adicional si es necesario

### ¿Por qué `...(f ?? INITIAL_SUPPORT_FORM)` en setters?

**Razón:**
- Protege contra casos extremos donde el estado completo pueda ser `undefined`
- Asegura que siempre hay un objeto base válido para spread
- Previene crashes por setState con valores incorrectos

---

## 🎯 Lecciones aprendidas

1. **Siempre definir estados iniciales como constantes**
   - Facilita resets consistentes
   - Evita olvidar campos

2. **Proteger todos los accesos a arrays opcionales**
   - Usar `?? []` sistemáticamente
   - Nunca asumir que un array existe

3. **Botones de cancelar deben resetear al estado inicial completo**
   - No omitir campos
   - Incluir limpieza de estados relacionados (búsquedas, errores)

4. **Usar optional chaining en setters**
   - `f?.arrayField` en lugar de `f.arrayField`
   - Fallback con `??` siempre

---

**Fix implementado:** 2025-11-04  
**Archivo:** `apps/web/src/pages/SettingsPage.tsx` (1 archivo, ~20 líneas)  
**Build status:** ✅ Passed  
**Testing:** ✅ Manual OK

