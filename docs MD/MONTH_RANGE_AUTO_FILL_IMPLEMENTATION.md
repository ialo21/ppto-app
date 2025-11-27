# 📋 Implementación: Auto-rellenado Inteligente de "Mes Hasta"

## 🎯 Objetivo

Mejorar la UX de los selectores de rango de meses ("Mes Desde" / "Mes Hasta") en toda la aplicación, implementando un comportamiento inteligente que copia automáticamente el valor de "Mes Desde" a "Mes Hasta" cuando este último está vacío.

---

## 📐 Regla de Negocio Implementada

### Comportamiento Principal

Cuando el usuario selecciona un **"Mes Desde"**:

1. ✅ **Si "Mes Hasta" está vacío (null/undefined):**
   - → Copiar automáticamente el mismo mes a "Mes Hasta"
   - → Esto facilita la selección de un solo mes (caso común)

2. ✅ **Si "Mes Hasta" YA tiene un valor específico:**
   - → NO sobrescribirlo
   - → Respetar la selección del usuario

### Diferenciación de Cambios

La lógica **solo se aplica en cambios manuales** del usuario:

- ✅ **Cambios manuales:** Usuario selecciona directamente del `YearMonthPicker`
- ❌ **Cambios programáticos:** Seteo automático por código (ej. selección de trimestre Q1-Q4, carga de OC)

Para esto se usa un `useRef` que marca cuándo el cambio es programático.

---

## 🛠️ Implementación Técnica

### Patrón Común Aplicado

```tsx
// 1. Importar useRef
import React, { useState, useRef } from "react";

// 2. Crear ref para rastrear cambios programáticos
const isProgrammaticChangeRef = useRef(false);

// 3. En el handler de "Mes Desde"
<YearMonthPicker
  value={periodFromId}
  onChange={(period) => {
    const newFromId = period?.id || null;
    setPeriodFromId(newFromId);
    
    // Lógica: Si es cambio manual Y periodToId está vacío → copiar
    if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
      setPeriodToId(newFromId);
    }
  }}
  periods={periods}
  maxId={periodToId || undefined}
  placeholder="Todos los meses"
  clearable={true}
/>

// 4. Marcar cambios programáticos (ej. en selección de trimestre)
const handleQuarterSelect = (quarter: number) => {
  isProgrammaticChangeRef.current = true;
  
  // ... lógica de seteo de periodos ...
  setPeriodFromId(fromPeriod.id);
  setPeriodToId(toPeriod.id);
  
  isProgrammaticChangeRef.current = false;
};
```

---

## 📂 Archivos Modificados

### 1. **Dashboard.tsx** ✅

**Ubicación:** `c:\programas\ppto-app\apps\web\src\pages\Dashboard.tsx`

**Cambios:**
- Línea 1: Agregado `useRef` al import
- Línea 356: Agregado `isProgrammaticChangeRef = useRef(false)`
- Líneas 455-487: Modificado `handleQuarterSelect` para marcar cambios programáticos
- Líneas 712-720: Modificado handler de "Mes Desde" con la lógica de auto-rellenado

**Contexto especial:**
- Dashboard tiene selección de trimestres (Q1-Q4) que setea ambos meses programáticamente
- La lógica distingue entre cambios del trimestre vs cambios manuales del usuario

---

### 2. **ReportsPage.tsx** ✅

**Ubicación:** `c:\programas\ppto-app\apps\web\src\pages\ReportsPage.tsx`

**Cambios:**
- Línea 1: Agregado `useRef` al import
- Línea 135: Agregado `isProgrammaticChangeRef = useRef(false)`
- Líneas 697-705: Modificado handler de "Período Desde / Mes Contable Desde" con la lógica

**Contexto especial:**
- ReportsPage tiene diferentes modos (Presupuestal/Contable/Mixto)
- Los labels cambian según el modo pero la lógica es la misma
- Actualmente no tiene selección de trimestre, pero el ref está preparado para futuras funcionalidades

---

### 3. **InvoicesPage.tsx** ✅

**Ubicación:** `c:\programas\ppto-app\apps\web\src\pages\InvoicesPage.tsx`

**Cambios:**
- Línea 1: Agregado `useRef` al import
- Línea 156: Agregado `isProgrammaticChangeRef = useRef(false)`
- Líneas 628-631: Modificado auto-carga de periodos al seleccionar OC para marcar como programático
- Líneas 910-918: Modificado handler de "Periodo Desde" con la lógica

**Contexto especial:**
- Al seleccionar una Orden de Compra (OC), se auto-cargan los periodos de la OC
- Ese auto-carga es programática, NO debe disparar el auto-rellenado
- El ref previene ese comportamiento

---

### 4. **PurchaseOrdersPage.tsx** ✅

**Ubicación:** `c:\programas\ppto-app\apps\web\src\pages\PurchaseOrdersPage.tsx`

**Cambios:**
- Línea 1: Agregado `useRef` al import
- Línea 175: Agregado `isProgrammaticChangeRef = useRef(false)`
- Líneas 529-536: Modificado handler de "Periodo PPTO Desde" con la lógica

**Contexto especial:**
- El formulario usa strings para los IDs (`budgetPeriodFromId: ""`)
- La lógica compara con string vacío `""` en lugar de `null`
- Consistente con el resto del formulario

---

## 🧪 Casos de Prueba

### Caso 1: Ambos en Default

**Setup:**
- Mes Desde: (vacío/null)
- Mes Hasta: (vacío/null)

**Acción:**
Usuario selecciona **2025-10** en "Mes Desde"

**Resultado esperado:** ✅
- Mes Desde: 2025-10
- Mes Hasta: 2025-10 (copiado automáticamente)

---

### Caso 2: "Mes Hasta" Ya Tiene Valor

**Setup:**
- Mes Desde: (vacío/null)
- Mes Hasta: 2025-12

**Acción:**
Usuario selecciona **2025-10** en "Mes Desde"

**Resultado esperado:** ✅
- Mes Desde: 2025-10
- Mes Hasta: 2025-12 (NO se sobrescribe, se respeta)

---

### Caso 3: Selección de Trimestre (Dashboard)

**Setup:**
- Mes Desde: (vacío/null)
- Mes Hasta: (vacío/null)

**Acción:**
Usuario hace clic en botón **Q4**

**Resultado esperado:** ✅
- Mes Desde: 2025-10 (Oct)
- Mes Hasta: 2025-12 (Dic)
- **NO se dispara la lógica de auto-rellenado** porque es cambio programático
- El comportamiento del trimestre se mantiene intacto

---

### Caso 4: Selección de OC (Facturas)

**Setup:**
- Creando nueva factura
- Mes Desde: (vacío/null)
- Mes Hasta: (vacío/null)

**Acción:**
Usuario selecciona una OC con periodos 2025-01 → 2025-03

**Resultado esperado:** ✅
- Mes Desde: 2025-01
- Mes Hasta: 2025-03
- **NO se dispara la lógica de auto-rellenado** porque es carga automática de OC

---

### Caso 5: Cambio Manual Después de Trimestre

**Setup (después de seleccionar Q4):**
- Mes Desde: 2025-10
- Mes Hasta: 2025-12

**Acción:**
Usuario limpia "Mes Hasta" (pone vacío) y luego cambia "Mes Desde" a 2025-11

**Resultado esperado:** ✅
- Mes Desde: 2025-11
- Mes Hasta: 2025-11 (auto-rellenado porque Mes Hasta estaba vacío)

---

## ⚠️ Consideraciones Importantes

### 1. No Afecta Consultas al Backend

- La lógica es **puramente UI/UX**
- No cambia cómo se consultan los datos
- Los endpoints siguen recibiendo los mismos parámetros

### 2. Compatible con Atajos Existentes

- Selección de trimestres (Q1-Q4)
- Auto-carga de periodos al seleccionar OC
- Cualquier otro seteo programático

### 3. No Rompe Flujos Existentes

- Si el usuario ya tiene un rango seleccionado, **se respeta**
- Solo ayuda cuando "Mes Hasta" está vacío
- No hay cambios forzados ni sobrescrituras inesperadas

### 4. Consistencia Global

- **Mismo comportamiento** en todas las páginas:
  - Dashboard
  - Reportes
  - Facturas
  - Órdenes de Compra
- Usuarios tendrán una experiencia **predecible y uniforme**

---

## 🎨 Beneficios UX

### Antes de la Implementación ❌

Usuario quería ver datos de **un solo mes** (ej. 2025-10):

1. Selecciona "Mes Desde": 2025-10
2. **Tiene que** seleccionar "Mes Hasta": 2025-10 manualmente
3. 2 clics necesarios

### Después de la Implementación ✅

Usuario quiere ver datos de **un solo mes** (ej. 2025-10):

1. Selecciona "Mes Desde": 2025-10
2. "Mes Hasta" se rellena automáticamente con 2025-10
3. **Solo 1 clic necesario** 🎉

Si el usuario quiere un rango diferente:
1. Cambia "Mes Hasta" al mes deseado
2. El valor NO se sobrescribe
3. Flujo tradicional se mantiene

---

## 🔧 Mantenimiento Futuro

### Para Agregar Nuevas Páginas con Selectores de Mes

Si en el futuro se crean nuevas páginas con selectores "Mes Desde / Mes Hasta":

1. Importar `useRef`:
   ```tsx
   import React, { useState, useRef } from "react";
   ```

2. Crear el ref:
   ```tsx
   const isProgrammaticChangeRef = useRef(false);
   ```

3. Aplicar el patrón en el handler de "Mes Desde":
   ```tsx
   onChange={(period) => {
     const newFromId = period?.id || null;
     setPeriodFromId(newFromId);
     
     if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
       setPeriodToId(newFromId);
     }
   }}
   ```

4. Marcar cambios programáticos donde corresponda:
   ```tsx
   isProgrammaticChangeRef.current = true;
   // ... código que setea periodos ...
   isProgrammaticChangeRef.current = false;
   ```

### Ejemplo: Nueva Página con Trimestres

```tsx
function NuevaPagina() {
  const [periodFromId, setPeriodFromId] = useState<number | null>(null);
  const [periodToId, setPeriodToId] = useState<number | null>(null);
  const isProgrammaticChangeRef = useRef(false);

  const handleQuarterSelect = (quarter: number) => {
    isProgrammaticChangeRef.current = true;
    
    // Lógica de Q...
    setPeriodFromId(fromId);
    setPeriodToId(toId);
    
    isProgrammaticChangeRef.current = false;
  };

  return (
    <YearMonthPicker
      value={periodFromId}
      onChange={(period) => {
        const newFromId = period?.id || null;
        setPeriodFromId(newFromId);
        
        if (!isProgrammaticChangeRef.current && newFromId !== null && periodToId === null) {
          setPeriodToId(newFromId);
        }
      }}
      // ...
    />
  );
}
```

---

## ✅ Estado de Implementación

| Componente | Estado | Notas |
|------------|--------|-------|
| Dashboard.tsx | ✅ Implementado | Con soporte de trimestres |
| ReportsPage.tsx | ✅ Implementado | Preparado para futuras funcionalidades |
| InvoicesPage.tsx | ✅ Implementado | Con soporte de OC |
| PurchaseOrdersPage.tsx | ✅ Implementado | Usa strings en lugar de numbers |

---

## 📝 Notas Finales

- **No se requieren cambios en el backend**
- **No se modifican endpoints ni contratos API**
- **Backwards compatible:** No rompe funcionalidad existente
- **Progressive enhancement:** Mejora la UX sin cambiar flujos existentes
- **Fácil de mantener:** Patrón consistente y documentado

---

**Fecha de Implementación:** Noviembre 27, 2025  
**Autor:** AI Assistant  
**Versión del Documento:** 1.0
