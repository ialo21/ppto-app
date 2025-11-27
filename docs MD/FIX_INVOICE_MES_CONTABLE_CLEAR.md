# Fix: Permitir borrar Mes Contable en Facturas

**Fecha**: 27 de noviembre de 2025  
**Archivos modificados**: 
- `apps/web/src/pages/InvoicesPage.tsx`
- `apps/api/src/invoices.ts`

## Problema

Al editar una factura que ya tiene un mes contable asignado, no era posible borrarlo. Cuando el usuario limpiaba el campo y guardaba:
- El frontend no enviaba `null` explícitamente
- El backend no aceptaba `null` en el schema Zod
- La factura mantenía el mes contable anterior

## Causa Raíz

### 1. Frontend (InvoicesPage.tsx)
**Línea ~470**: La variable `mesContableStr` se inicializaba como `undefined`:
```typescript
let mesContableStr: string | undefined = undefined;  // ❌ PROBLEMA
```

JavaScript omite propiedades `undefined` al serializar JSON, por lo que el backend nunca recibía la instrucción de borrar el campo.

### 2. Backend (invoices.ts)
**Líneas 29-30 y 46-48**: Los schemas Zod solo aceptaban `string | undefined`, no `null`:
```typescript
mesContable: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // ❌ No acepta null
tcReal: z.number().positive().optional()
```

**Líneas 732-734**: La lógica de actualización no distinguía correctamente entre "no enviar el campo" vs "enviar null para borrarlo":
```typescript
data.mesContable ?? existing.mesContable ?? undefined  // ❌ null ?? existing da existing
```

## Solución Implementada

### 1. Frontend: Enviar null explícitamente

**apps/web/src/pages/InvoicesPage.tsx - Líneas 470-479**
```typescript
// Calcular mesContable en formato YYYY-MM si hay periodId
// IMPORTANTE: Si el usuario borra el mes contable, debemos enviar null explícitamente
// para que la factura deje de estar procesada contablemente en el backend.
let mesContableStr: string | null = null;  // ✅ null, no undefined
if (mesContablePeriodId && periods) {
  const mesContablePeriod = periods.find((p: any) => p.id === mesContablePeriodId);
  if (mesContablePeriod) {
    mesContableStr = `${mesContablePeriod.year}-${String(mesContablePeriod.month).padStart(2, '0')}`;
  }
}
```

**Líneas 395-407**: Mapeo correcto al editar factura (limpiar estado si mesContable es null):
```typescript
// Cargar mes contable si existe, o limpiarlo si es null/vacío
// IMPORTANTE: Al editar, si mesContable es null, debemos limpiar el estado
if (invoice.mesContable && periods) {
  const [year, month] = invoice.mesContable.split('-').map(Number);
  const mesContablePeriod = periods.find((p: any) => p.year === year && p.month === month);
  if (mesContablePeriod) {
    setMesContablePeriodId(mesContablePeriod.id);
  } else {
    setMesContablePeriodId(null);
  }
} else {
  setMesContablePeriodId(null);  // ✅ Limpiar si es null
}
```

### 2. Backend: Aceptar null en schemas

**apps/api/src/invoices.ts - Líneas 29-30 (createSchema)**
```typescript
mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),  // ✅ Acepta null/undefined
tcReal: z.number().positive().nullish()
```

**Líneas 47-48 (updateSchema)**
```typescript
// IMPORTANTE: .nullish() permite null y undefined, necesario para que el usuario pueda borrar el mes contable
mesContable: z.string().regex(/^\d{4}-\d{2}$/).nullish(),
tcReal: z.number().positive().nullish()
```

### 3. Backend: Lógica de actualización correcta

**Líneas 729-741**
```typescript
// IMPORTANTE: Si mesContable o tcReal vienen en el request (incluso como null para borrar),
// deben tener prioridad sobre los valores existentes. El operador ?? no funciona para este caso
// porque null ?? existing daría existing (no es lo que queremos).
const finalMesContable = 'mesContable' in data ? data.mesContable : existing.mesContable;
const finalTcReal = 'tcReal' in data ? data.tcReal : (existing.tcReal ? Number(existing.tcReal) : undefined);

camposContables = await calcularCamposContables(
  finalCurrency,
  finalMonto,
  finalPeriodIds,
  finalMesContable ?? undefined,  // ✅ Convertir null a undefined para la función
  finalTcReal ?? undefined
);
```

**Líneas 461-467 (CREATE)**
```typescript
// Convertir null a undefined para la función (acepta string | undefined)
const camposContables = await calcularCamposContables(
  currency,
  data.montoSinIgv,
  data.periodIds,
  data.mesContable ?? undefined,  // ✅ Convertir null a undefined
  data.tcReal ?? undefined
);
```

## Flujo Completo

### Escenario: Usuario borra mes contable

1. **Usuario edita factura** con `mesContable = "2026-05"`
2. **Usuario limpia el campo** (clic en X del YearMonthPicker)
3. **Estado frontend**: `mesContablePeriodId` pasa a `null`
4. **Al guardar**: `mesContableStr` se calcula como `null` (no `undefined`)
5. **Payload enviado**: `{ mesContable: null, ... }`
6. **Backend Zod**: Valida OK (`.nullish()` acepta `null`)
7. **Lógica backend**: `'mesContable' in data` es `true`, usa `data.mesContable` (null)
8. **calcularCamposContables**: Recibe `undefined` (null ?? undefined)
9. **Base de datos**: Se actualiza `mesContable = null`
10. **Al volver a editar**: Frontend carga `null` y limpia el estado

## Diferencia Clave: `null` vs `undefined`

| Valor | JSON.stringify | Significado | Uso |
|-------|---------------|-------------|-----|
| `undefined` | ❌ Se omite | "No existe" | No enviar el campo |
| `null` | ✅ Se incluye | "Existe pero vacío" | Borrar el campo |

**Operador `??` (nullish coalescing)**:
```typescript
undefined ?? "default"  // → "default"
null ?? "default"       // → "default"
```

**Operador `in`**:
```typescript
const obj = { key: null };
'key' in obj            // → true
obj.key ?? "default"    // → "default"
```

**Solución**: Usar `in` para detectar si la propiedad existe, independientemente de su valor.

## Pruebas Recomendadas

### Test 1: Borrar mes contable
1. Editar factura con mes contable "2026-05"
2. Hacer clic en X para limpiar
3. Guardar
4. Volver a editar
5. ✅ Verificar que el campo aparece vacío

### Test 2: Cambiar mes contable
1. Editar factura con mes contable "2026-05"
2. Cambiar a "2026-06"
3. Guardar
4. ✅ Verificar que se actualizó a "2026-06"

### Test 3: Crear sin mes contable
1. Crear nueva factura
2. No seleccionar mes contable
3. Guardar
4. ✅ Verificar que se crea con `mesContable = null`

### Test 4: Campo TC Real
El campo `tcReal` sigue la misma lógica:
1. Solo visible si `currentCurrency === "USD"` Y hay `mesContable`
2. Si se borra el mes contable, el campo TC Real desaparece
3. ✅ El valor de TC Real se limpia automáticamente al borrar mes contable

## Archivos No Modificados

El componente `YearMonthPicker.tsx` ya soportaba correctamente la funcionalidad de limpiar:
- Prop `clearable={true}` por defecto
- Botón X visible cuando hay valor seleccionado
- `onChange(null)` cuando se limpia

No requirió cambios.

## Notas Técnicas

### TypeScript
El cambio de `.optional()` a `.nullish()` en Zod afecta los tipos:
- Antes: `string | undefined`
- Después: `string | null | undefined`

Se requiere conversión explícita `?? undefined` al llamar funciones que esperan `string | undefined`.

### Compatibilidad
Los cambios son **retrocompatibles**:
- Facturas existentes con `mesContable = null` → funcionan igual
- Facturas existentes con `mesContable = "2026-05"` → funcionan igual
- Frontend antiguo que no envía `mesContable` → sigue funcionando (usa valor existente)

---

**Estado**: ✅ Implementado y documentado  
**Versión**: 1.0
