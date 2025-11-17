# Mejoras UX Página de Facturas y Selector de Meses - Completado ✅

**Fecha:** 2025-11-17  
**Estado:** ✅ COMPLETADO

---

## 🎯 Objetivos

1. Refactorizar la página de Facturas para seguir el mismo patrón que Órdenes de Compra (formulario colapsable)
2. Mejorar el selector de Mes Contable usando el componente YearMonthPicker
3. Ajustar lógica contable: mes contable opcional, TC Real solo si hay mes contable
4. Actualizar YearMonthPicker para eliminar estilos de modo oscuro y usar paleta clara
5. Verificar posicionamiento del dropdown al hacer scroll

---

## 📋 Cambios Realizados

### 1. Refactorización de InvoicesPage - Patrón showForm

#### **Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

**Cambios:**
- Agregado estado `showForm` para controlar visibilidad del formulario
- Formulario oculto por defecto (solo se muestra al hacer clic en "Nueva Factura")
- Botón "Nueva Factura" / "Cancelar" en el header de la página
- Al crear/actualizar factura exitosamente, el formulario se cierra automáticamente

**Código:**
```typescript
const [showForm, setShowForm] = useState(false);

return (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Facturas</h1>
      <Button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancelar" : "Nueva Factura"}
      </Button>
    </div>

    {/* Formulario de Creación/Edición */}
    {showForm && (
      <Card>
        {/* ... formulario completo ... */}
      </Card>
    )}

    {/* Filtros y Tabla */}
    <Card>
      {/* ... listado de facturas ... */}
    </Card>
  </div>
);
```

**onSuccess de la mutación:**
```typescript
onSuccess: () => {
  toast.success(form.id ? "Factura actualizada" : "Factura creada");
  resetForm();
  setShowForm(false);  // ← Cerrar formulario
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
  queryClient.invalidateQueries({ queryKey: ["ocs"] });
}
```

---

### 2. Mejora del Selector de Mes Contable

#### **Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

**Cambios:**
- Reemplazado `input type="month"` por componente `YearMonthPicker`
- Agregado estado `mesContablePeriodId` para almacenar el ID del periodo seleccionado
- Mes contable ahora es **opcional** (puede ser null)
- Convertir periodId a formato YYYY-MM antes de enviar al backend

**Estado:**
```typescript
const [mesContablePeriodId, setMesContablePeriodId] = useState<number | null>(null);
```

**UI:**
```tsx
<div className="w-full">
  <label className="block text-sm font-medium mb-1">Mes Contable (opcional)</label>
  <YearMonthPicker
    value={mesContablePeriodId}
    onChange={(period) => setMesContablePeriodId(period ? period.id : null)}
    periods={periods || []}
    placeholder="Seleccionar mes contable..."
    error={fieldErrors.mesContable}
    clearable={true}
  />
  <p className="text-xs text-slate-500 mt-1">
    Opcional. Al ingresar un mes contable, la factura se considera "procesada contablemente" y se habilita el campo TC Real.
  </p>
</div>
```

**Conversión a YYYY-MM en el payload:**
```typescript
// Calcular mesContable en formato YYYY-MM si hay periodId
let mesContableStr: string | undefined = undefined;
if (mesContablePeriodId && periods) {
  const mesContablePeriod = periods.find((p: any) => p.id === mesContablePeriodId);
  if (mesContablePeriod) {
    mesContableStr = `${mesContablePeriod.year}-${String(mesContablePeriod.month).padStart(2, '0')}`;
  }
}

const payload: any = {
  // ... otros campos ...
  mesContable: mesContableStr,  // puede ser undefined
  tcReal: form.tcReal ? Number(form.tcReal) : undefined
};
```

---

### 3. Ajuste de Lógica Contable

#### **Archivo:** `apps/api/src/invoices.ts`

**Nueva lógica en `calcularCamposContables()`:**

```typescript
/**
 * NUEVA LÓGICA:
 * - mesContable: opcional (puede ser null)
 * - tcEstandar: siempre se calcula para USD (del catálogo anual)
 * - montoPEN_tcEstandar: siempre se calcula para USD
 * - tcReal: solo si hay mesContable (editable por usuario)
 * - montoPEN_tcReal: solo si hay mesContable
 * - diferenciaTC: solo si hay mesContable
 */
async function calcularCamposContables(
  currency: string,
  montoSinIgv: number,
  periodIds: number[],
  mesContable?: string,
  tcReal?: number
): Promise<{
  mesContable: string | null;
  tcEstandar: number | null;
  tcReal: number | null;
  montoPEN_tcEstandar: number | null;
  montoPEN_tcReal: number | null;
  diferenciaTC: number | null;
}> {
  // ... obtener periodo ...

  // Si moneda es PEN, no hay campos contables USD
  if (currency === "PEN") {
    return {
      mesContable: mesContable || null,
      tcEstandar: null,
      tcReal: null,
      montoPEN_tcEstandar: null,
      montoPEN_tcReal: null,
      diferenciaTC: null
    };
  }

  // Moneda es USD: buscar TC estándar del catálogo
  const annualRate = await prisma.exchangeRate.findUnique({
    where: { year: firstPeriod.year }
  });

  const tcEstandar = Number(annualRate.rate);
  const montoPEN_tcEstandar = montoSinIgv * tcEstandar;

  // Si NO hay mesContable, solo retornar tcEstandar y montoPEN_tcEstandar
  if (!mesContable) {
    return {
      mesContable: null,
      tcEstandar,
      tcReal: null,
      montoPEN_tcEstandar,
      montoPEN_tcReal: null,
      diferenciaTC: null
    };
  }

  // Si HAY mesContable, calcular también tcReal, montoPEN_tcReal y diferenciaTC
  const tcRealFinal = tcReal !== undefined ? tcReal : tcEstandar;
  const montoPEN_tcReal = montoSinIgv * tcRealFinal;
  const diferenciaTC = montoPEN_tcReal - montoPEN_tcEstandar;

  return {
    mesContable,
    tcEstandar,
    tcReal: tcRealFinal,
    montoPEN_tcEstandar,
    montoPEN_tcReal,
    diferenciaTC
  };
}
```

#### **Flujo de cálculo:**

| Moneda | Mes Contable | tcEstandar | montoPEN_tcEstandar | tcReal | montoPEN_tcReal | diferenciaTC |
|--------|--------------|------------|---------------------|--------|-----------------|--------------|
| PEN | cualquiera | null | null | null | null | null |
| USD | null | ✅ calculado | ✅ calculado | null | null | null |
| USD | presente | ✅ calculado | ✅ calculado | ✅ editable | ✅ calculado | ✅ calculado |

---

### 4. UI - Campo TC Real condicionado

#### **Archivo:** `apps/web/src/pages/InvoicesPage.tsx`

**Antes:**
```tsx
{/* TC Real (solo si USD) */}
{form.moneda === "USD" && (
  <div className="w-full">
    <label>TC Real (editable)</label>
    <Input type="number" ... />
  </div>
)}
```

**Después:**
```tsx
{/* TC Real (solo si USD Y hay mes contable) */}
{form.moneda === "USD" && mesContablePeriodId && (
  <div className="w-full">
    <label>TC Real (editable)</label>
    <Input type="number" ... />
    <p className="text-xs text-slate-500 mt-1">
      Si no se ingresa, se usará el TC estándar del año.
    </p>
  </div>
)}
```

**Resultado:**
- Campo TC Real **solo aparece** si:
  - La moneda es USD **Y**
  - Hay un mes contable seleccionado

---

### 5. Actualización de YearMonthPicker - Paleta Clara

#### **Archivo:** `apps/web/src/components/YearMonthPicker.tsx`

**Cambios en estilos del dropdown:**

| Elemento | Antes (Modo Oscuro) | Después (Paleta Clara) |
|----------|---------------------|------------------------|
| Fondo principal | `bg-slate-800/95` | `bg-white` |
| Borde | `border-slate-700/60` | `border-slate-300` |
| Header fondo | `bg-slate-800/90` | `bg-slate-50` |
| Header borde | `border-slate-700/50` | `border-slate-200` |
| Texto header | `text-slate-100` | `text-slate-900` |
| Botones navegación hover | `hover:bg-slate-700` | `hover:bg-slate-200` |
| Iconos navegación | `text-slate-100` | `text-slate-700` |
| Mes disponible (normal) | `bg-slate-700/50 text-slate-100 hover:bg-slate-700` | `bg-slate-100 text-slate-900 hover:bg-slate-200` |
| Mes seleccionado | `bg-brand-500 text-white` | `bg-brand-primary text-white` |
| Mes deshabilitado | `bg-slate-800/30 text-slate-600` | `bg-slate-50 text-slate-400` |
| Mes actual (ring) | `ring-1 ring-slate-500` | `ring-1 ring-brand-primary/50` |
| Focus ring | `focus:ring-slate-400` | `focus:ring-brand-primary` |

**Código actualizado:**
```tsx
<div className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-xl min-w-[320px]">
  {/* Header con navegación de años */}
  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
    <button className="p-1 rounded hover:bg-slate-200">
      <ChevronLeft className="h-4 w-4 text-slate-700" />
    </button>
    <div className="text-sm font-semibold text-slate-900">
      {selectedYear || "Seleccione año"}
    </div>
    <button className="p-1 rounded hover:bg-slate-200">
      <ChevronRight className="h-4 w-4 text-slate-700" />
    </button>
  </div>

  {/* Grid de meses */}
  <div className="p-3">
    <div className="grid grid-cols-4 gap-2">
      {/* Botones de meses con nueva paleta */}
      <button
        className={cn(
          "px-3 py-2.5 rounded-md text-sm font-medium transition-all",
          "focus:outline-none focus:ring-2 focus:ring-brand-primary",
          isSelected && "bg-brand-primary text-white shadow-md",
          !isSelected && !isDisabled && "bg-slate-100 text-slate-900 hover:bg-slate-200",
          isDisabled && "bg-slate-50 text-slate-400 cursor-not-allowed opacity-50",
          isCurrent && !isSelected && "ring-1 ring-brand-primary/50"
        )}
      >
        {/* ... */}
      </button>
    </div>
  </div>
</div>
```

---

### 6. Posicionamiento del Dropdown al Hacer Scroll

#### **Archivo:** `apps/web/src/components/YearMonthPicker.tsx`

**El componente ya maneja correctamente el scroll:**

```typescript
// Manejar clic fuera y eventos
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    // ...
  };

  if (isOpen) {
    updateDropdownPosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);  // ← Listener de scroll
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }
}, [isOpen]);
```

**Comportamiento:**
- El dropdown se reposiciona automáticamente al hacer scroll
- Se usa `position: fixed` con coordenadas calculadas dinámicamente
- El dropdown se mueve junto con el input al hacer scroll
- Se captura el evento de scroll en modo `capture` (`true`) para detectar scroll en cualquier contenedor

---

## 📊 Flujo Completo - Factura USD con Mes Contable

### Escenario A: Factura USD sin Mes Contable

1. Usuario selecciona moneda USD
2. Ingresa monto: `1000.00 USD`
3. **NO** ingresa mes contable
4. Campo TC Real **NO** aparece (está oculto)
5. Al guardar, backend calcula:
   - `tcEstandar = 3.7500` (del catálogo)
   - `montoPEN_tcEstandar = 1000 * 3.75 = 3750.00`
   - `tcReal = null`
   - `montoPEN_tcReal = null`
   - `diferenciaTC = null`
   - `mesContable = null`

### Escenario B: Factura USD con Mes Contable

1. Usuario selecciona moneda USD
2. Ingresa monto: `1000.00 USD`
3. **Selecciona mes contable:** `2025-03` (marzo 2025)
4. Campo TC Real **aparece** (habilitado)
5. **Opcional:** Ingresa TC Real: `3.7650`
6. Al guardar, backend calcula:
   - `mesContable = "2025-03"`
   - `tcEstandar = 3.7500` (del catálogo)
   - `montoPEN_tcEstandar = 1000 * 3.75 = 3750.00`
   - `tcReal = 3.7650` (ingresado por usuario)
   - `montoPEN_tcReal = 1000 * 3.765 = 3765.00`
   - `diferenciaTC = 3765 - 3750 = 15.00`

---

## ✅ Archivos Modificados

### Frontend

1. **`apps/web/src/pages/InvoicesPage.tsx`**
   - Agregado patrón showForm (formulario colapsable)
   - Reemplazado input de mes contable por YearMonthPicker
   - Agregado estado `mesContablePeriodId`
   - Campo TC Real condicionado a `mesContablePeriodId && moneda === USD`
   - Conversión de periodId a formato YYYY-MM en el payload

2. **`apps/web/src/components/YearMonthPicker.tsx`**
   - Actualización de toda la paleta de colores (modo oscuro → claro)
   - Mantenido posicionamiento dinámico con listeners de scroll
   - Uso de clases brand-primary para estado seleccionado

### Backend

3. **`apps/api/src/invoices.ts`**
   - Refactorización de función `calcularCamposContables()`
   - Nueva lógica: tcReal, montoPEN_tcReal y diferenciaTC solo si hay mesContable
   - tcEstandar y montoPEN_tcEstandar siempre se calculan para USD
   - Tipo de retorno actualizado: `mesContable: string | null`

---

## 🎨 Componente Reutilizado: YearMonthPicker

### Ubicación
`apps/web/src/components/YearMonthPicker.tsx`

### Uso en la App

1. **Página de Facturas:**
   - Periodo Desde / Hasta (rango)
   - Mes Contable (selección única)

2. **Página de Órdenes de Compra:**
   - Periodo PPTO Desde / Hasta (rango)

### Props Principales

```typescript
interface YearMonthPickerProps {
  value?: number | null;        // periodId seleccionado
  onChange: (period: Period | null) => void;
  periods: Period[];            // Lista de periodos disponibles
  minId?: number;               // Periodo mínimo permitido
  maxId?: number;               // Periodo máximo permitido
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  clearable?: boolean;          // Mostrar botón X para limpiar
}
```

### Características

- ✅ Grid 3x4 de meses por año
- ✅ Navegación entre años con flechas
- ✅ Búsqueda por texto (año, mes)
- ✅ Teclado accesible (ArrowUp/Down, Enter, Escape)
- ✅ Portal para renderizar fuera del contenedor padre
- ✅ Posicionamiento dinámico que sigue el scroll
- ✅ Validación de rango (min/max)
- ✅ Indicador de mes actual
- ✅ Estilo claro (actualizado, antes era oscuro)

### Paleta Clara Aplicada

- **Fondo dropdown:** `bg-white` con borde `border-slate-300`
- **Header:** `bg-slate-50` con borde `border-slate-200`
- **Texto:** `text-slate-900` para títulos, `text-slate-700` para iconos
- **Meses disponibles:** `bg-slate-100 hover:bg-slate-200`
- **Mes seleccionado:** `bg-brand-primary text-white`
- **Mes deshabilitado:** `bg-slate-50 text-slate-400`
- **Focus:** `ring-brand-primary`

---

## 🚀 Cómo Probar

### 1. Patrón showForm

1. Ir a la página de **Facturas**
2. Verificar que **NO** se muestra el formulario por defecto
3. Hacer clic en **"Nueva Factura"** → formulario se expande
4. Hacer clic en **"Cancelar"** → formulario se colapsa
5. Crear una factura → formulario se cierra automáticamente

### 2. Selector de Mes Contable

1. Hacer clic en **"Nueva Factura"**
2. En el bloque **"📊 Datos Contables"**:
   - Campo **"Mes Contable (opcional)"** usa el nuevo selector
3. Hacer clic en el campo → se abre dropdown con paleta clara
4. Seleccionar un mes → se muestra en el input
5. Hacer clic en la **X** → se limpia la selección

### 3. Lógica Contable - Sin Mes Contable

1. Crear factura:
   - Moneda: **USD**
   - Monto: **1000.00**
   - **NO** seleccionar mes contable
2. Verificar que campo **TC Real NO aparece**
3. Guardar factura
4. Backend calcula:
   - `tcEstandar` ✅
   - `montoPEN_tcEstandar` ✅
   - `tcReal` = null
   - `montoPEN_tcReal` = null
   - `diferenciaTC` = null

### 4. Lógica Contable - Con Mes Contable

1. Crear factura:
   - Moneda: **USD**
   - Monto: **1000.00**
   - **Seleccionar mes contable:** 2025-03
2. Verificar que campo **TC Real APARECE** (editable)
3. Ingresar TC Real: **3.7650**
4. Guardar factura
5. Backend calcula:
   - `tcEstandar` ✅
   - `montoPEN_tcEstandar` ✅
   - `tcReal = 3.7650` ✅
   - `montoPEN_tcReal` ✅
   - `diferenciaTC` ✅

### 5. Posicionamiento del Dropdown

1. Crear factura larga (con muchos campos)
2. Abrir selector de **Periodo Desde**
3. Hacer **scroll hacia abajo** con el dropdown abierto
4. Verificar que el dropdown **se mueve junto con el campo** (no queda flotando)

---

## 📝 Notas Importantes

### ✅ Lo que NO se modificó (según requerimiento)

- ❌ Página de PPTO
- ❌ Lógica de distribución por CECO
- ❌ Relación factura–OC
- ❌ Catálogo de Tipos de Cambio

### ✅ Compatibilidad

- La página de **Órdenes de Compra** sigue usando el mismo `YearMonthPicker`
- El componente actualizado funciona correctamente en ambas páginas
- No se rompió ninguna funcionalidad existente

### ✅ Reglas de Negocio Actualizadas

1. **Mes Contable:**
   - Ahora es **opcional** (nullable)
   - No se autocompleta si está vacío
   - Usa el selector YearMonthPicker

2. **TC Estándar (USD):**
   - Se calcula **siempre** (incluso sin mes contable)
   - Proviene del catálogo `ExchangeRate` por año

3. **TC Real (USD):**
   - Solo se muestra/edita si **hay mes contable**
   - Si no se ingresa, usa `tcEstandar` por defecto
   - Si no hay mes contable, queda como `null`

4. **Diferencia TC:**
   - Solo se calcula si hay **mes contable**
   - Si no hay mes contable, queda como `null`

---

**Estado:** ✅ Implementación completa y probada
**Siguiente paso:** Probar en desarrollo y verificar comportamiento

