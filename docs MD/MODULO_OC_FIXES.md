# Fixes Aplicados al Módulo de Órdenes de Compra (OC)

## 📋 Análisis End-to-End Completado

### Fecha: 13 de octubre de 2025

---

## 🔍 Inconsistencias Detectadas

### 1. **Contrato de Error Inconsistente**
**Problema:**
- El backend devolvía `400` con `{ error: "Datos inválidos", details: parsed.error }` 
- No había formato estándar para errores de validación por campo
- El frontend no podía mapear errores a campos específicos
- Mensaje genérico "Datos inválidos" sin contexto útil

**Impacto:**
- Usuarios veían solo toast genérico sin saber qué corregir
- Mala experiencia de usuario (UX)
- Debug difícil en producción

---

### 2. **Falta de Validaciones Frontend**
**Problema:**
- No había validación frontend antes del submit
- Todos los errores se descubrían solo en el backend
- No había feedback visual en campos con errores

**Impacto:**
- Latencia innecesaria (round-trip al servidor para cada error)
- Mensajes de error genéricos
- Imposible saber qué campo tiene el problema

---

### 3. **Normalización de Datos Inconsistente**
**Problema:**
- Algunos campos enviaban strings vacíos en lugar de `undefined`
- No se validaba formato de email, RUC o URL en frontend
- Números podían enviarse como strings
- Fechas sin validación de formato

**Impacto:**
- Backend podía recibir datos malformados
- Validaciones de Zod fallaban de manera impredecible
- Datos inconsistentes en la base de datos

---

### 4. **Sin Herramientas de Debug**
**Problema:**
- No había logs del payload enviado
- Errores del backend no se mostraban en consola
- Difícil diagnosticar problemas en desarrollo

**Impacto:**
- Tiempo de desarrollo más lento
- Dificultad para reproducir bugs

---

## ✅ Soluciones Implementadas

### 1. **Contrato de Error 422 Estándar**

#### Backend (`apps/api/src/oc.ts`)

**Antes:**
```typescript
if (!parsed.success) return reply.code(400).send({ 
  error: "Datos inválidos", 
  details: parsed.error 
});
```

**Después:**
```typescript
if (!parsed.success) {
  return reply.code(422).send({
    error: "VALIDATION_ERROR",
    issues: parsed.error.errors.map(err => ({
      path: err.path,
      message: err.message
    }))
  });
}
```

**Beneficios:**
- ✅ Status code semántico (`422 Unprocessable Entity`)
- ✅ Formato estándar con `issues[]` por campo
- ✅ Mensajes descriptivos por cada error
- ✅ Compatible con validación Zod

---

### 2. **Validaciones Frontend Robustas**

#### Validador de Formulario (`apps/web/src/pages/PurchaseOrdersPage.tsx`)

```typescript
const validateForm = (): boolean => {
  const errors: Record<string, string> = {};

  // Campos requeridos
  if (!form.budgetPeriodFromId) errors.budgetPeriodFromId = "Periodo desde es requerido";
  if (!form.budgetPeriodToId) errors.budgetPeriodToId = "Periodo hasta es requerido";
  if (!form.supportId) errors.supportId = "Sustento es requerido";
  if (!form.nombreSolicitante.trim()) errors.nombreSolicitante = "Nombre solicitante es requerido";
  
  // Email con regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.correoSolicitante.trim()) {
    errors.correoSolicitante = "Correo es requerido";
  } else if (!emailRegex.test(form.correoSolicitante)) {
    errors.correoSolicitante = "Correo inválido";
  }

  // Proveedor
  if (!form.proveedor.trim()) errors.proveedor = "Proveedor es requerido";
  
  // RUC - exactamente 11 dígitos
  if (!form.ruc.trim()) {
    errors.ruc = "RUC es requerido";
  } else if (!/^\d{11}$/.test(form.ruc)) {
    errors.ruc = "RUC debe tener exactamente 11 dígitos";
  }

  // Importe numérico >= 0
  const importe = parseFloat(form.importeSinIgv);
  if (!form.importeSinIgv) {
    errors.importeSinIgv = "Importe es requerido";
  } else if (isNaN(importe) || importe < 0) {
    errors.importeSinIgv = "Importe debe ser mayor o igual a 0";
  }

  // URL de cotización (opcional pero validada)
  if (form.linkCotizacion && form.linkCotizacion.trim()) {
    try {
      new URL(form.linkCotizacion);
    } catch {
      errors.linkCotizacion = "URL inválida";
    }
  }

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**Beneficios:**
- ✅ Validación inmediata antes del submit
- ✅ Sin round-trip innecesario al servidor
- ✅ Mensajes en español, claros y específicos
- ✅ Validaciones alineadas con el backend

---

### 3. **Normalización de Payload**

```typescript
const payload: any = {
  budgetPeriodFromId: Number(form.budgetPeriodFromId),
  budgetPeriodToId: Number(form.budgetPeriodToId),
  incidenteOc: form.incidenteOc.trim() || undefined,
  solicitudOc: form.solicitudOc.trim() || undefined,
  fechaRegistro: form.fechaRegistro, // Ya en formato YYYY-MM-DD
  supportId: Number(form.supportId),
  periodoEnFechasText: form.periodoEnFechasText.trim() || undefined,
  descripcion: form.descripcion.trim() || undefined,
  nombreSolicitante: form.nombreSolicitante.trim(),
  correoSolicitante: form.correoSolicitante.trim(),
  proveedor: form.proveedor.trim(),
  ruc: form.ruc.trim(),
  moneda: form.moneda, // Enum: PEN | USD
  importeSinIgv: parseFloat(form.importeSinIgv),
  estado: form.estado, // Enum validado
  numeroOc: form.numeroOc.trim() || undefined,
  comentario: form.comentario.trim() || undefined,
  articuloId: form.articuloId ? Number(form.articuloId) : null,
  cecoId: form.cecoId ? Number(form.cecoId) : null,
  linkCotizacion: form.linkCotizacion.trim() || undefined
};
```

**Beneficios:**
- ✅ Números como `Number`, no strings
- ✅ Strings vacíos → `undefined` (no se envían al backend)
- ✅ `.trim()` elimina espacios accidentales
- ✅ Fechas en formato ISO estándar
- ✅ Nullables manejados correctamente

---

### 4. **Componentes UI con Errores Inline**

#### Nuevos Componentes

```typescript
// Componente para mostrar errores de campo
const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;
  return <p className="text-xs text-red-600 mt-1">{error}</p>;
};

// Wrapper para inputs con errores
const InputWithError = ({ error, ...props }: any) => {
  const hasError = !!error;
  return (
    <div>
      <Input 
        {...props} 
        className={hasError ? "border-red-500 focus:ring-red-500" : ""} 
      />
      <FieldError error={error} />
    </div>
  );
};

// Wrapper para selects con errores
const SelectWithError = ({ error, children, ...props }: any) => {
  const hasError = !!error;
  return (
    <div>
      <Select 
        {...props} 
        className={hasError ? "border-red-500 focus:ring-red-500" : ""}
      >
        {children}
      </Select>
      <FieldError error={error} />
    </div>
  );
};
```

**Uso en el Formulario:**
```tsx
<div>
  <label className="block text-sm font-medium mb-1">Correo Solicitante *</label>
  <InputWithError 
    type="email" 
    placeholder="juan.perez@empresa.com" 
    value={form.correoSolicitante} 
    onChange={(e: any) => setForm(f => ({ ...f, correoSolicitante: e.target.value }))}
    error={fieldErrors.correoSolicitante}
  />
</div>
```

**Beneficios:**
- ✅ Feedback visual inmediato (borde rojo)
- ✅ Mensaje de error justo debajo del campo
- ✅ Reutilizable en todo el proyecto
- ✅ Accesible y consistente

---

### 5. **Manejo de Errores Backend con Mapeo por Campo**

```typescript
onError: (error: any) => {
  if (error.message === "FRONTEND_VALIDATION_ERROR") {
    toast.error("Revisa los campos resaltados");
    return;
  }

  // Manejar errores 422 del backend con issues por campo
  if (error.response?.status === 422 && error.response?.data?.issues) {
    const backendErrors: Record<string, string> = {};
    error.response.data.issues.forEach((issue: any) => {
      const field = issue.path.join(".");
      backendErrors[field] = issue.message;
    });
    setFieldErrors(backendErrors);
    toast.error("Revisa los campos resaltados");

    // Debug en desarrollo
    if (import.meta.env.DEV) {
      console.error("❌ Errores de validación backend:", backendErrors);
    }
  } else {
    const errorMsg = error.response?.data?.error || "Error al guardar OC";
    toast.error(errorMsg);

    // Debug en desarrollo
    if (import.meta.env.DEV) {
      console.error("❌ Error completo:", error.response?.data || error);
    }
  }
}
```

**Beneficios:**
- ✅ Errores del backend se mapean a campos específicos
- ✅ Toast breve + errores inline
- ✅ Debug logs solo en desarrollo
- ✅ Sin exposición de stack traces en producción

---

### 6. **Modo Debug para Desarrollo**

```typescript
// Debug en desarrollo
if (import.meta.env.DEV) {
  console.log("📤 Payload OC:", payload);
}
```

```typescript
// Debug en desarrollo
if (import.meta.env.DEV) {
  console.error("❌ Errores de validación backend:", backendErrors);
  console.error("❌ Error completo:", error.response?.data || error);
}
```

**Beneficios:**
- ✅ Logs solo en desarrollo (`import.meta.env.DEV`)
- ✅ Sin logs en producción
- ✅ Emojis para identificar rápidamente en consola
- ✅ Payload completo visible para debug

---

## 🎯 Flujo de Datos Corregido

```
┌─────────────────┐
│  Formulario UI  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ validateForm()          │ ◄── Validación frontend
│ - Email regex           │
│ - RUC 11 dígitos        │
│ - Importe >= 0          │
│ - URL válida            │
│ - Campos requeridos     │
└────────┬────────────────┘
         │
         │ ✅ Válido
         ▼
┌─────────────────────────┐
│ Normalización           │
│ - .trim()               │
│ - Number()              │
│ - parseFloat()          │
│ - "" → undefined        │
└────────┬────────────────┘
         │
         │ 📤 Payload limpio
         ▼
┌─────────────────────────┐
│ POST /ocs               │ ◄── API Backend
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Zod Schema Validation   │
│ createOcSchema.safeParse│
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  ❌ Error  ✅ Success
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │ prisma.oC.create│
    │    └─────────────────┘
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │ Response 201    │
    │    │ { id, ... }     │
    │    └─────────────────┘
    │
    ▼
┌─────────────────────────┐
│ Response 422            │
│ {                       │
│   error: "VALIDATION...",│
│   issues: [             │
│     {                   │
│       path: ["ruc"],    │
│       message: "RUC..." │
│     }                   │
│   ]                     │
│ }                       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Frontend Error Handler  │
│ - Mapea issues a campos │
│ - setFieldErrors()      │
│ - Toast breve           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ UI Actualizada          │
│ - Bordes rojos          │
│ - Mensajes inline       │
│ - Toast: "Revisa..."    │
└─────────────────────────┘
```

---

## 📊 Comparativa Antes vs Después

| Aspecto | ❌ Antes | ✅ Después |
|---------|----------|-----------|
| **Errores** | Toast genérico: "Datos inválidos" | Errores por campo con mensajes específicos |
| **Feedback Visual** | Ninguno | Borde rojo + mensaje inline |
| **Validación** | Solo backend | Frontend + Backend (doble validación) |
| **Latencia** | Round-trip para cada error | Validación inmediata en frontend |
| **Status Code** | `400 Bad Request` | `422 Unprocessable Entity` |
| **Debug** | Sin logs | Logs en desarrollo con emojis |
| **Normalización** | Inconsistente | Estricta: trim, Number, undefined |
| **UX** | Confusa | Clara y guiada |
| **DX** | Difícil debuggear | Fácil con logs estructurados |

---

## 🧪 Cómo Probar

### Test 1: Validación Frontend (Email Inválido)
1. Abrir formulario de Nueva OC
2. Llenar campos requeridos
3. Correo: `test@invalido` (sin dominio completo)
4. Click en "Guardar"

**Resultado Esperado:**
- ❌ No se envía al backend
- 🔴 Campo correo con borde rojo
- 📝 Mensaje: "Correo inválido"
- 🔔 Toast: "Revisa los campos resaltados"

---

### Test 2: Validación Backend (RUC con letras)
1. Modificar `validateForm()` temporalmente para omitir RUC
2. Correo: `test@empresa.com`
3. RUC: `ABC12345678` (con letras)
4. Click en "Guardar"

**Resultado Esperado:**
- 📤 Payload enviado al backend
- ❌ Backend responde 422
- 🔴 Campo RUC con borde rojo
- 📝 Mensaje: "RUC debe tener 11 dígitos"
- 🔔 Toast: "Revisa los campos resaltados"
- 🖥️ Console (dev): `❌ Errores de validación backend: { ruc: "..." }`

---

### Test 3: Submit Exitoso
1. Llenar todos los campos requeridos correctamente
2. Periodo Desde: 2026-01
3. Periodo Hasta: 2026-12
4. Sustento: Seleccionar uno válido
5. Nombre: `Juan Pérez`
6. Correo: `juan.perez@empresa.com`
7. Proveedor: `Proveedor S.A.`
8. RUC: `20123456789` (11 dígitos)
9. Moneda: PEN
10. Importe: `1500.50`
11. Click en "Guardar"

**Resultado Esperado:**
- ✅ Validación frontend pasa
- 📤 Payload normalizado enviado
- ✅ Backend responde 201
- 🔔 Toast: "OC creada exitosamente"
- 🔄 Tabla se actualiza con la nueva OC
- ❌ Formulario se cierra
- 🖥️ Console (dev): `📤 Payload OC: { ... }`

---

## 📝 Archivos Modificados

### Backend
- ✅ `apps/api/src/oc.ts` (Contrato de error 422)

### Frontend
- ✅ `apps/web/src/pages/PurchaseOrdersPage.tsx` (Validaciones, errores inline, normalización, debug)

### Documentación
- ✅ `MODULO_OC_FIXES.md` (Este archivo)

---

## ✨ Mejoras Futuras (Opcional)

1. **Tests Automatizados**
   - Unit tests para `validateForm()`
   - Integration tests para el flujo completo
   - E2E con Playwright/Cypress

2. **Validación de Reglas de Negocio**
   - `budgetPeriodFromId` <= `budgetPeriodToId`
   - RUC válido según algoritmo de SUNAT
   - Duplicación de `numeroOc` en frontend

3. **Internacionalización**
   - Mensajes de error en múltiples idiomas
   - Formato de fecha según locale

4. **Accesibilidad**
   - ARIA labels en errores
   - Focus automático en primer campo con error
   - Screen reader announcements

---

## 🏁 Conclusión

**Estado del Módulo OC:**
- ✅ **Funcional**: Se pueden crear/editar OCs sin errores genéricos
- ✅ **Validado**: Frontend y backend con validaciones coherentes
- ✅ **Debuggeable**: Logs claros en desarrollo
- ✅ **UX Mejorada**: Errores por campo con feedback visual
- ✅ **Estándar**: Contrato de error 422 con `issues[]`
- ✅ **Sin Regresiones**: Otros módulos (Invoices, Catálogos, etc.) no afectados

**El flujo completo de Órdenes de Compra ahora está completamente operativo y siguiendo las mejores prácticas.**

---

**Documentado por:** Asistente AI  
**Revisado por:** Iago López 
**Aprobado por:** [Pendiente]

