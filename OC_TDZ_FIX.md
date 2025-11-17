# Fix: Error TDZ en PurchaseOrdersPage

## 🐛 Problema

**Error:** `ReferenceError: Cannot access 'form' before initialization`  
**Ubicación:** `apps/web/src/pages/PurchaseOrdersPage.tsx:203`

La aplicación fallaba al abrir `/purchase-orders` debido a un error de Temporal Dead Zone (TDZ).

## 🔍 Causa Raíz

El `useMemo` de `availableCostCenters` estaba accediendo a `form.supportId` **antes** de que se declarara la variable `form`.

**Orden incorrecto (ANTES):**
```typescript
// Línea 172: useMemo intenta acceder a form
const availableCostCenters = React.useMemo(() => {
  if (!form.supportId || !supports || !costCenters) return costCenters || [];
  // ...
}, [form.supportId, supports, costCenters]);

// Línea 188: Estados intermedios
const [showForm, setShowForm] = useState(false);
const [editingId, setEditingId] = useState<number | null>(null);

// Línea 191: RECIÉN AQUÍ se declara form
const [form, setForm] = useState({
  budgetPeriodFromId: "",
  // ...
});
```

## ✅ Solución

Reordenar las declaraciones para que `form` se declare **antes** de cualquier hook que lo use.

**Orden correcto (DESPUÉS):**
```typescript
// Línea 171: Primero los estados que no dependen de form
const [showForm, setShowForm] = useState(false);
const [editingId, setEditingId] = useState<number | null>(null);

// Línea 174: Declarar form
const [form, setForm] = useState({
  budgetPeriodFromId: "",
  budgetPeriodToId: "",
  // ...
});

// Línea 197: Otros estados
const [filters, setFilters] = useState({ /* ... */ });
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

// Línea 207: AHORA sí puede acceder a form
const availableCostCenters = React.useMemo(() => {
  if (!form.supportId || !supports || !costCenters) return costCenters || [];
  // ...
}, [form.supportId, supports, costCenters]);

// Línea 224: useEffect que también usa form
useEffect(() => {
  if (form.supportId && form.cecoId && costCenters && supports) {
    // ...
  }
}, [form.supportId, form.cecoId, costCenters, supports]);
```

## 📁 Archivo Modificado

- `apps/web/src/pages/PurchaseOrdersPage.tsx`

## 🧪 Verificación

✅ No hay errores de linter  
✅ Build exitoso: `pnpm run build` completa sin errores  
✅ La ruta `/purchase-orders` ahora carga correctamente  
✅ El modal de nueva OC se puede abrir sin problemas  

## 📝 Orden Final de Declaraciones

1. **Queries** (useQuery para periods, supports, articulos, costCenters)
2. **Estados simples** (showForm, editingId)
3. **Estado form** (la declaración principal)
4. **Estados de filtros** (filters, fieldErrors)
5. **Memos computados** (availableCostCenters que usa form)
6. **Effects** (useEffect que usa form)

## 🔑 Lección Aprendida

En React, siempre declarar estados **antes** de usarlos en:
- `useMemo`
- `useEffect`
- `useCallback`
- Cualquier otro hook que dependa de ellos

De lo contrario, se produce un error de Temporal Dead Zone (TDZ) porque JavaScript intenta acceder a la variable antes de que se inicialice.

---

**Fecha:** 14 de noviembre de 2025  
**Estado:** ✅ Resuelto y verificado

