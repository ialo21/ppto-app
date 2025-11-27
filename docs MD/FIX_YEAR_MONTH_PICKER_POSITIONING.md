# Fix: Posicionamiento del Selector de Periodos (YearMonthPicker)

**Fecha**: 27 de noviembre de 2025  
**Archivo modificado**: `apps/web/src/components/YearMonthPicker.tsx`

## Problema

Los selectores de periodo/mes contable aparecían desplazados o pegados en la parte inferior de la página. El dropdown no se posicionaba correctamente bajo el input y se movía incorrectamente al hacer scroll.

**Componentes afectados:**
- ✅ Mes Contable en Facturas
- ✅ Periodo Desde/Hasta en Facturas
- ✅ Periodos en Órdenes de Compra
- ✅ Cualquier uso de `YearMonthPicker` en la aplicación

## Causa Raíz

**Líneas 140-143 (antes del fix):**
```typescript
const updateDropdownPosition = () => {
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,  // ❌ INCORRECTO
      left: rect.left + window.scrollX,        // ❌ INCORRECTO
      width: Math.max(rect.width, 320)
    });
  }
};
```

**Línea 278:**
```typescript
<div
  className="fixed z-50 bg-white..."  // position: fixed
  style={{
    top: `${dropdownPosition.top}px`,
    left: `${dropdownPosition.left}px`,
    width: `${dropdownPosition.width}px`
  }}
>
```

### Por qué estaba mal

1. **`position: fixed`** posiciona elementos **relativos al viewport** (ventana visible), NO al documento
2. **`getBoundingClientRect()`** ya devuelve coordenadas **relativas al viewport**
3. **Sumar `window.scrollY/X`** duplicaba el desplazamiento:
   - Si el scroll es 500px hacia abajo
   - `rect.bottom` ya es relativo al viewport (ej: 200px desde arriba de la ventana)
   - Sumar `window.scrollY` (500px) daba 700px → se iba muy abajo

## Solución Implementada

**Líneas 139-147 (después del fix):**
```typescript
// Calcular posición del dropdown
// IMPORTANTE: Con position: fixed, usamos coordenadas relativas al viewport (sin scroll)
// getBoundingClientRect() ya devuelve posición relativa al viewport
const updateDropdownPosition = () => {
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,  // ✅ Solo viewport (sin window.scrollY)
      left: rect.left,       // ✅ Solo viewport (sin window.scrollX)
      width: Math.max(rect.width, 320)
    });
  }
};
```

### Explicación Técnica

#### Position Fixed vs Absolute

| Propiedad | `position: fixed` | `position: absolute` |
|-----------|-------------------|----------------------|
| Relativo a | Viewport (ventana) | Elemento padre posicionado |
| Scroll | Se mantiene fijo en viewport | Se mueve con el contenido |
| Coordenadas | `getBoundingClientRect()` directas | Necesita cálculos adicionales |

#### getBoundingClientRect()

Siempre devuelve coordenadas **relativas al viewport actual**:

```typescript
const rect = element.getBoundingClientRect();
// rect.top: Distancia desde el borde superior del viewport
// rect.left: Distancia desde el borde izquierdo del viewport
// rect.bottom: rect.top + altura del elemento
```

**Con `position: fixed`:**
```typescript
// ✅ CORRECTO
top: rect.bottom + gap

// ❌ INCORRECTO (duplica el scroll)
top: rect.bottom + window.scrollY + gap
```

**Con `position: absolute` (si el padre es el body):**
```typescript
// ✅ CORRECTO
top: rect.bottom + window.scrollY + gap

// ❌ INCORRECTO (ignora el scroll)
top: rect.bottom + gap
```

## Comportamiento Actual

### ✅ Funciona Correctamente

1. **Al abrir el picker**: Se posiciona justo debajo del input (4px de gap)
2. **Al hacer scroll**: Se actualiza automáticamente gracias al listener (línea 166)
3. **Al redimensionar ventana**: Se recalcula la posición
4. **En cualquier parte de la página**: Funciona igual (arriba, medio, abajo)

### Listener de Scroll

El componente ya tenía correctamente implementado el listener de scroll:

```typescript
useEffect(() => {
  if (isOpen) {
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);  // ✅
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }
}, [isOpen]);
```

El parámetro `true` (capture phase) asegura que capture el scroll de cualquier contenedor, no solo el body.

## Estilos Verificados

### ✅ Tema Claro Consistente

El componente usa correctamente la paleta del theme:

**Dropdown:**
- `bg-white` - Fondo principal
- `border-slate-300` - Borde sutil
- `bg-slate-50` - Header con navegación de años
- `shadow-xl` - Sombra pronunciada

**Botones de Mes:**
- No seleccionado: `bg-slate-100 text-slate-900 hover:bg-slate-200`
- Seleccionado: `bg-brand-primary text-white shadow-md`
- Deshabilitado: `bg-slate-50 text-slate-400 opacity-50`
- Mes actual: `ring-1 ring-brand-primary/50`

**Input:**
- `bg-white border-slate-300` - Estado normal
- `border-red-500 ring-red-500` - Estado error
- `focus-within:ring-brand-500` - Estado focus

### ❌ Sin Modo Oscuro Hardcodeado

No se encontraron estilos de modo oscuro hardcodeados (como `bg-gray-900`, `text-white` forzados, etc.).

## Pruebas Realizadas

### Test 1: Posicionamiento Inicial
1. Abrir Facturas
2. Hacer clic en "Mes Contable"
3. ✅ Verificar: Dropdown aparece justo debajo del input

### Test 2: Con Scroll
1. Scrollear la página hacia abajo
2. Hacer clic en "Periodo Desde"
3. ✅ Verificar: Dropdown aparece en la posición correcta (no abajo de la página)

### Test 3: Múltiples Pickers
1. Abrir "Periodo Desde"
2. Cerrar y abrir "Periodo Hasta"
3. Cerrar y abrir "Mes Contable"
4. ✅ Verificar: Todos se posicionan correctamente

### Test 4: Órdenes de Compra
1. Ir a `/purchase-orders`
2. Nueva OC → Seleccionar "Periodo PPTO Desde"
3. ✅ Verificar: Funciona igual que en Facturas

### Test 5: Resize de Ventana
1. Abrir dropdown
2. Cambiar tamaño de ventana
3. ✅ Verificar: Se reposiciona correctamente

## Componentes que Usan YearMonthPicker

El fix se aplica automáticamente a todos los usos de `YearMonthPicker`:

**Facturas (`InvoicesPage.tsx`):**
- Mes Contable (línea ~826)
- Periodo Desde (línea ~888)
- Periodo Hasta (línea ~901)

**Órdenes de Compra (`PurchaseOrdersPage.tsx`):**
- Periodo PPTO Desde
- Periodo PPTO Hasta

**PPTO (`BudgetPage.tsx`):**
- Selector de Periodo (si existe)

**Cualquier uso futuro:** Heredará el fix automáticamente.

## Alternativas Consideradas (No Implementadas)

### Opción 1: Usar position: absolute con contenedor relative
```typescript
// Ventaja: No necesita portal
// Desventaja: Puede ser cortado por overflow: hidden en padres
<div className="relative">
  <input ... />
  <div className="absolute top-full left-0 z-50">
    {/* dropdown */}
  </div>
</div>
```

**No elegido porque**: El portal con `fixed` es más robusto y evita problemas de z-index/overflow.

### Opción 2: Usar Radix UI Popover / Headless UI
```typescript
// Ventaja: Librería probada, maneja casos edge
// Desventaja: Dependencia adicional, más complejo
import { Popover } from '@headlessui/react'
```

**No elegido porque**: El componente actual es suficiente y funciona bien con el fix.

### Opción 3: Calcular con position: absolute + document scroll
```typescript
top: rect.bottom + window.scrollY + 4
// Cambiar el dropdown a position: absolute
```

**No elegido porque**: `position: fixed` con portal es más limpio y evita issues con transform/perspective de padres.

## Notas Técnicas

### Portal con createPortal
```typescript
import { createPortal } from "react-dom";

return createPortal(
  <div className="fixed z-50">...</div>,
  document.body  // Se renderiza fuera del árbol DOM del componente
);
```

**Ventajas:**
- Evita problemas de `overflow: hidden` en contenedores padres
- Z-index más predecible (siempre en el body)
- Accesibilidad: aria-haspopup y role="listbox" funcionan correctamente

**Consideración:**
- Requiere cleanup al desmontar (se hace automáticamente con React)
- Eventos de click-outside necesitan lógica especial (ya implementado)

### Event Listener con Capture
```typescript
window.addEventListener("scroll", handler, true);  // capture phase
```

El `true` hace que el evento se capture en **todos los contenedores con scroll**, no solo el `window`. Útil para casos donde hay `overflow: auto` en divs padres.

---

**Estado**: ✅ Implementado y probado  
**Versión**: 1.0  
**Breaking Changes**: Ninguno (solo corrección de bug)
