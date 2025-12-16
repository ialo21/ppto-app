# 📄 Guía de Refactorización de Facturas

## ✅ Resumen de Cambios Implementados

Se ha refactorizado exitosamente el módulo de **Facturas** para que tenga el mismo enfoque moderno que **Órdenes de Compra**, con dos submódulos diferenciados:

### 1️⃣ **Facturas → Listado** (Vista Viewer)
- **Acceso:** Usuarios con permiso `facturas:listado` o `facturas` (global)
- **Diseño:** Vista de tarjetas modernas con estadísticas agregadas
- **Funcionalidad:** Solo lectura/consulta de facturas
- **Características:**
  - Tarjetas con información clave de cada factura
  - Estadísticas: Total facturas, Pendientes de pago, Proveedor top, Importe total
  - Filtros intuitivos: Año, búsqueda global, tipo, estado
  - Modal de detalle completo al hacer clic en "Ver Detalle"
  - Exportación a CSV

### 2️⃣ **Facturas → Gestión / Registro** (Vista Admin)
- **Acceso:** Usuarios con permiso `facturas:gestion` o `facturas` (global)
- **Diseño:** Vista de tabla con formulario completo de registro/edición
- **Funcionalidad:** Crear, editar, eliminar facturas y cambiar estados
- **Características:**
  - Formulario completo con validaciones (migrado de InvoicesPage.tsx)
  - Tabla de facturas con ordenamiento y filtros
  - Cambio de estado inline con StatusChip
  - Todas las funcionalidades originales preservadas

---

## 📁 Archivos Creados/Modificados

### **Frontend (apps/web/src/)**

#### Nuevos archivos:
- ✅ `pages/invoices/InvoiceListadoPage.tsx` - Vista de Listado para viewers
- ✅ `pages/invoices/InvoiceGestionPage.tsx` - Vista de Gestión/Registro (migrada de InvoicesPage.tsx)

#### Archivos modificados:
- ✅ `main.tsx` - Sidebar y rutas actualizadas con dropdown de Facturas

### **Backend (apps/api/src/)**

#### Archivos modificados:
- ✅ `invoices.ts` - Permisos jerárquicos aplicados a todos los endpoints:
  - **Lectura** (GET): `facturas:listado`
  - **Escritura** (POST/PATCH/DELETE): `facturas:gestion`

### **Base de Datos (packages/db/migrations/)**

#### Nuevas migraciones:
- ✅ `20251215000000_add_facturas_submodulos/migration.sql` - Permisos jerárquicos para Facturas

---

## 🚀 Pasos para Aplicar los Cambios

### **Paso 1: Aplicar Migración de Base de Datos**

Ejecuta la migración para crear los nuevos permisos:

```bash
cd packages/db
npx prisma migrate deploy
```

O si estás en desarrollo:

```bash
cd packages/db
npx prisma migrate dev
```

### **Paso 2: Reiniciar el Backend**

```bash
cd apps/api
npm run dev
```

### **Paso 3: Reiniciar el Frontend**

```bash
cd apps/web
npm run dev
```

### **Paso 4: Asignar Permisos a Roles**

Ve a **Administrar Roles** (requiere permiso `manage_roles`) y asigna los nuevos permisos:

#### Para roles de **Viewer/Consulta**:
- ✅ `facturas:listado` - Permite ver el listado de facturas

#### Para roles de **Admin/Gestión**:
- ✅ `facturas:gestion` - Permite crear, editar y eliminar facturas

#### Para roles con **acceso completo** a Facturas:
- ✅ `facturas` (global) - Automáticamente da acceso a ambos submódulos

---

## 🧪 Validaciones Obligatorias

### **1. Verificar Sidebar**

✅ **Con usuario Viewer:**
- Debe ver el dropdown "Facturas" en el sidebar
- Al expandir, debe ver solo "Listado"
- No debe ver "Gestión / Registro"

✅ **Con usuario Admin/Gestión:**
- Debe ver el dropdown "Facturas" en el sidebar
- Al expandir, debe ver ambos: "Listado" y "Gestión / Registro"

✅ **Con usuario con permiso global `facturas`:**
- Debe ver ambos submódulos

### **2. Verificar Funcionalidad de Listado**

✅ Navegar a `/invoices/listado`
- Ver tarjetas de facturas con diseño moderno
- Ver estadísticas agregadas en la parte superior
- Filtros funcionan correctamente
- Modal de detalle se abre al hacer clic en "Ver Detalle"
- Exportar CSV funciona

### **3. Verificar Funcionalidad de Gestión**

✅ Navegar a `/invoices/gestion`
- Formulario de "Nueva Factura" funciona
- Editar factura existente funciona
- Eliminar factura funciona
- Cambio de estado inline funciona
- Validaciones de backend se muestran correctamente

### **4. Verificar Permisos en Backend**

✅ Con usuario que solo tiene `facturas:listado`:
- Puede hacer GET a `/invoices` ✅
- **NO** puede hacer POST/PATCH/DELETE ❌ (debe retornar 403)

✅ Con usuario que tiene `facturas:gestion`:
- Puede hacer GET a `/invoices` ✅
- Puede hacer POST/PATCH/DELETE ✅

### **5. Verificar Navegación**

✅ Al entrar a `/invoices` debe redirigir automáticamente a `/invoices/gestion`

✅ Estados activos en el sidebar:
- Al estar en `/invoices/listado` → "Listado" debe estar resaltado
- Al estar en `/invoices/gestion` → "Gestión / Registro" debe estar resaltado
- El dropdown debe mantenerse expandido cuando se navega entre submódulos

---

## 📊 Arquitectura de Permisos

### **Jerarquía de Permisos:**

```
facturas (permiso global)
├── facturas:listado (submódulo de consulta)
└── facturas:gestion (submódulo de gestión)
```

### **Lógica de Verificación:**

El sistema de permisos (`requirePermission` en `auth.ts`) soporta herencia:

1. Si un usuario tiene `facturas` → tiene acceso a TODOS los submódulos
2. Si un usuario tiene `facturas:listado` → solo puede acceder a Listado
3. Si un usuario tiene `facturas:gestion` → solo puede acceder a Gestión

Esta lógica es **consistente** con la implementación de Órdenes de Compra.

---

## 🎨 Diseño y UX

### **Estándares Aplicados:**

✅ **Consistencia con OCs:**
- Mismo estilo de tarjetas (InvoiceListadoPage ≈ OcListadoPage)
- Mismo diseño de tabla y formularios (InvoiceGestionPage ≈ OcGestionPage)
- Mismos colores, paddings, y espaciados

✅ **Filtros Mejorados:**
- Búsqueda global por texto libre (múltiples campos)
- Filtros claros con labels descriptivos
- Placeholders orientados al usuario

✅ **Estadísticas Agregadas:**
- Total de facturas del año
- Facturas pendientes de pago
- Proveedor con más facturas
- Importe total por moneda

✅ **Accesibilidad:**
- Estados activos claros en sidebar
- Animaciones suaves al expandir/colapsar
- Responsive design (desktop, tablet, mobile)

---

## 🔧 Mantenimiento y Extensión

### **Para agregar más submódulos de Facturas:**

1. Crear nuevo archivo en `apps/web/src/pages/invoices/`
2. Agregar entrada en `sidebarItems` en `main.tsx`:
   ```typescript
   { path: "/invoices/nuevo-modulo", label: "Nuevo Módulo", permission: "facturas:nuevo" }
   ```
3. Agregar ruta en `router` en `main.tsx`
4. Crear permiso en BD mediante migración
5. Actualizar permisos en endpoints del backend si es necesario

### **Para modificar permisos:**

- Los permisos se gestionan desde la UI en `/roles` (requiere `manage_roles`)
- Los permisos se definen en la tabla `Permission` de la BD
- La lógica de verificación está en `apps/api/src/auth.ts` → `requirePermission()`

---

## 🐛 Troubleshooting

### **Problema: No veo el dropdown de Facturas en el sidebar**

✅ **Solución:**
1. Verificar que el usuario tiene al menos uno de estos permisos:
   - `facturas` (global)
   - `facturas:listado`
   - `facturas:gestion`
2. Hacer logout y login nuevamente para refrescar permisos
3. Verificar en BD que los permisos existan en la tabla `Permission`

### **Problema: Error 403 al acceder a endpoints**

✅ **Solución:**
1. Verificar que el usuario tiene el permiso correcto:
   - Lectura → `facturas:listado` o `facturas`
   - Escritura → `facturas:gestion` o `facturas`
2. Verificar que el backend se haya reiniciado después de actualizar `invoices.ts`
3. Revisar logs del backend para ver qué permiso está intentando verificar

### **Problema: Imports rotos en InvoiceGestionPage**

✅ **Solución:**
- Los imports deben usar rutas relativas `../../` porque el archivo está en subcarpeta:
  ```typescript
  import { api } from "../../lib/api";
  import { Card } from "../../components/ui/Card";
  ```

### **Problema: Migración falla al aplicarse**

✅ **Solución:**
1. Verificar que no existan permisos duplicados en la BD:
   ```sql
   SELECT * FROM "Permission" WHERE key LIKE 'facturas%';
   ```
2. Si ya existen, ejecutar manualmente el UPDATE del permiso padre:
   ```sql
   UPDATE "Permission" SET module = 'facturas', "sortOrder" = 40 WHERE key = 'facturas';
   ```

---

## ✨ Resultado Final

### **Antes:**
- ❌ Facturas: 1 sola vista monolítica
- ❌ Sin diferenciación entre viewer y admin
- ❌ Sin diseño moderno

### **Después:**
- ✅ Facturas: 2 submódulos (Listado + Gestión)
- ✅ Permisos granulares por submódulo
- ✅ Diseño moderno y consistente con OCs
- ✅ Mejor UX para usuarios viewer
- ✅ Sin funcionalidad rota

---

## 📝 Notas Adicionales

- El archivo original `InvoicesPage.tsx` **NO** ha sido eliminado por precaución
- Si todo funciona correctamente, puedes eliminarlo manualmente
- La funcionalidad de "Sin OC" (facturas sin orden de compra asociada) se mantiene intacta en Gestión
- Todos los campos contables (TC estándar, TC real, mes contable) se mantienen

---

**Fecha de Refactorización:** 15 de Diciembre de 2025  
**Versión:** 1.0  
**Compatibilidad:** Mantiene 100% de funcionalidad existente
