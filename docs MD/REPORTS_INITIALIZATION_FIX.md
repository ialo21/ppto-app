# FIX: ReportsPage - "Cannot access 'year' before initialization"

**Fecha:** 19 de noviembre de 2025  
**Archivo:** `apps/web/src/pages/ReportsPage.tsx`  
**Estado:** ✅ Corregido

## Problema

Error de runtime al cargar la página de Reportes:

```
ReferenceError: Cannot access 'year' before initialization
```

## Causa

La variable `year` se estaba usando en un `useQuery` antes de ser declarada:

**Antes (orden incorrecto):**
```typescript
// Línea 117-124: useQuery usa 'year'
const { data: annualBudgetData = [] } = useQuery({
  queryKey: ["budgets-annual-report", year],  // ❌ 'year' aún no existe
  queryFn: async () => {
    const response = await api.get("/budgets/annual", { params: { year } });
    return response.data;
  },
  enabled: !!year
});

// Línea 128: Recién aquí se declara 'year'
const [year, setYear] = useState<number>(new Date().getFullYear());
```

En JavaScript/TypeScript, las variables deben declararse antes de ser usadas, incluso cuando se usan dentro de funciones callback que se ejecutarán más tarde.

## Solución

Se reordenaron las declaraciones para que todos los estados (`useState`) se declaren **antes** de las queries (`useQuery`) que los utilizan:

**Después (orden correcto):**
```typescript
// Estados de filtros
// NOTA: Se declaran antes de las queries que los utilizan para evitar "Cannot access before initialization"
const [mode, setMode] = useState<ReportMode>('presupuestal');
const [year, setYear] = useState<number>(new Date().getFullYear());  // ✅ Se declara primero
const [periodFromId, setPeriodFromId] = useState<number | null>(null);
// ... resto de estados ...

// Queries para datos de reportes
const { data: annualBudgetData = [] } = useQuery({
  queryKey: ["budgets-annual-report", year],  // ✅ Ahora 'year' ya existe
  queryFn: async () => {
    const response = await api.get("/budgets/annual", { params: { year } });
    return response.data;
  },
  enabled: !!year
});
```

## Cambios Realizados

1. Se movieron todas las declaraciones de estado (`useState`) desde la línea 126-137 a la línea 105-118 (antes de las queries).

2. Se agregó un comentario explicativo:
   ```typescript
   // NOTA: Se declaran antes de las queries que los utilizan para evitar "Cannot access before initialization"
   ```

3. No se modificó ninguna lógica, diseño ni interfaz de usuario, solo el orden de las declaraciones.

## Validación

✅ Sin errores de linting  
✅ Orden de declaración correcto  
✅ Todas las variables de estado declaradas antes de su uso  
✅ Sin cambios en funcionalidad ni diseño

## Archivo Modificado

- `apps/web/src/pages/ReportsPage.tsx` - Reordenamiento de declaraciones de estado

## Próximo Paso

Probar la página de Reportes para confirmar que el error ya no aparece:

```bash
# Terminal 1 (API)
cd apps/api
npm run dev

# Terminal 2 (Web)
cd apps/web
npm run dev
```

Luego ir a `http://localhost:5173/reports` y verificar que la página cargue sin errores.

