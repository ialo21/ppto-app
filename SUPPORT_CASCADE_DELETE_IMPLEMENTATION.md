# Implementación: Eliminación en Cascada de Sustentos

## 📋 Diagnóstico

### Problema identificado
Al intentar eliminar un Sustento desde la UI de Catálogos, el backend devolvía un error genérico debido a constraints de Foreign Key.

### Causa raíz
Las 3 tablas que referencian `Support` tenían constraints con `ON DELETE RESTRICT`:
- `BudgetAllocation.supportId` → Support
- `ControlLine.supportId` → Support
- `OC.supportId` → Support

### Error exacto
- **Código Prisma**: `P2003` (Foreign key constraint failed)
- **Comportamiento anterior**: El endpoint devolvía un 400 con mensaje "no se pudo eliminar (en uso?)" sin especificar el motivo real.

---

## ✅ Solución implementada

### Opción elegida: **Cascada a nivel DB (Opción A)**

Se modificó el esquema Prisma y la base de datos para que al eliminar un Sustento, se eliminen automáticamente todos los registros relacionados en:
- Asignaciones presupuestales (`BudgetAllocation`)
- Líneas de control (`ControlLine`)
- Órdenes de compra (`OC`)
  - Las facturas asociadas a estas OCs mantienen su referencia (ON DELETE SET NULL en Invoice.ocId)

---

## 📝 Archivos modificados

### 1. `packages/db/schema.prisma`
**Cambio**: Agregado `onDelete: Cascade` en las 3 relaciones que apuntan a Support.

```prisma
// BudgetAllocation
support Support @relation(fields: [supportId], references: [id], onDelete: Cascade)

// ControlLine
support Support @relation(fields: [supportId], references: [id], onDelete: Cascade)

// OC
support Support @relation(fields: [supportId], references: [id], onDelete: Cascade)
```

---

### 2. `packages/db/migrations/20251104020000_support_cascade_delete/migration.sql` (nuevo)
**Cambio**: Migración SQL para alterar los constraints existentes y habilitar ON DELETE CASCADE.

```sql
-- Elimina y recrea los 3 constraints con ON DELETE CASCADE:
-- 1. BudgetAllocation_supportId_fkey
-- 2. ControlLine_supportId_fkey
-- 3. OC_supportId_fkey
```

**Instrucciones para aplicar**:
```bash
cd packages/db
pnpm prisma migrate deploy
```

**Para revertir** (⚠️ NO recomendado en producción):
```sql
-- Revertir a ON DELETE RESTRICT manualmente
ALTER TABLE "BudgetAllocation" DROP CONSTRAINT "BudgetAllocation_supportId_fkey";
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_supportId_fkey" 
  FOREIGN KEY ("supportId") REFERENCES "Support"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- (Repetir para ControlLine y OC)
```

---

### 3. `apps/api/src/supports.ts`
**Cambio**: Mejorado el manejo de errores en el endpoint `DELETE /supports/:id`.

**Antes**:
```typescript
catch {
  return reply.code(400).send({ error: "no se pudo eliminar (en uso?)" });
}
```

**Después**:
```typescript
catch (err) {
  // P2003: FK constraint (ya no debería ocurrir con cascada DB)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
    return reply.code(409).send({ 
      error: "El sustento tiene registros asociados (OCs, líneas de control o asignaciones presupuestales). Elimínelos primero." 
    });
  }
  // P2025: Registro no encontrado
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return reply.code(404).send({ error: "Sustento no encontrado" });
  }
  // Otros errores
  console.error("Error al eliminar sustento:", err);
  return reply.code(500).send({ error: "Error interno al eliminar sustento" });
}
```

**Nota**: Con la cascada activada, el error P2003 ya no debería ocurrir, pero se mantuvo el manejo por si hay otros constraints no contemplados.

---

### 4. `apps/web/src/pages/SettingsPage.tsx`
**Cambios**:

#### a) Mejora en `deleteSupport.onError`
Ahora muestra el mensaje exacto del backend en lugar de un mensaje genérico.

**Antes**:
```typescript
onError: () => toast.error("No se pudo eliminar el sustento")
```

**Después**:
```typescript
onError: (error: any) => {
  const errorMsg = error.response?.data?.error || "No se pudo eliminar el sustento";
  toast.error(errorMsg);
}
```

#### b) Modal de confirmación fuerte
Agregado diálogo de confirmación explícito antes de eliminar.

**Antes**:
```typescript
<Button variant="ghost" size="sm" onClick={() => deleteSupport.mutate(support.id)}>
  Eliminar
</Button>
```

**Después**:
```typescript
<Button 
  variant="ghost" 
  size="sm" 
  onClick={() => {
    if (confirm(
      `⚠️ ELIMINAR SUSTENTO: "${support.name}"\n\n` +
      `Esta acción eliminará el sustento y TODOS los registros asociados:\n` +
      `• Órdenes de compra\n` +
      `• Líneas de control\n` +
      `• Asignaciones presupuestales\n\n` +
      `Esta operación NO se puede deshacer.\n\n` +
      `¿Deseas continuar?`
    )) {
      deleteSupport.mutate(support.id);
    }
  }}
>
  Eliminar
</Button>
```

#### c) Toast de éxito mejorado
```typescript
toast.success("Sustento y sus registros asociados eliminados correctamente");
```

---

## 🧪 Pruebas manuales

### Caso 1: Eliminar sustento sin dependencias
**Resultado esperado**: ✅ Se elimina correctamente con toast de éxito.

### Caso 2: Eliminar sustento con OCs y facturas
**Pasos**:
1. Crear una OC asociada a un sustento
2. Crear una factura asociada a esa OC
3. Intentar eliminar el sustento desde Catálogos

**Resultado esperado**: 
✅ Se elimina el sustento y la OC en cascada.
✅ La factura mantiene su registro con `ocId = NULL` (por el `onDelete: SetNull` en Invoice).

### Caso 3: Cancelar confirmación
**Resultado esperado**: ✅ No se elimina nada, no hay cambios en DB.

---

## ⚙️ Comandos de despliegue

```bash
# 1. Generar cliente Prisma actualizado
cd packages/db
pnpm prisma generate

# 2. Aplicar migración de cascada
pnpm prisma migrate deploy

# 3. Verificar build
cd ../..
pnpm run build
```

---

## 🎯 Criterios de aceptación cumplidos

✅ Puedo eliminar un sustento desde la UI viendo una confirmación fuerte.  
✅ Si confirmo, el sustento y sus asociaciones desaparecen (cascada por DB).  
✅ No aparece el error genérico; si hay bloqueo distinto a FK, el backend lo reporta con código y detalle útiles.  
✅ No se rompen otras páginas ni listados.  
✅ Facturas asociadas a OCs eliminadas mantienen su registro con `ocId = NULL`.

---

## 📊 Resumen de impacto

| Entidad | Comportamiento ante eliminación de Support |
|---------|-------------------------------------------|
| **BudgetAllocation** | Se elimina en cascada |
| **ControlLine** | Se elimina en cascada |
| **OC** | Se elimina en cascada |
| **Invoice** (de la OC eliminada) | Se mantiene con `ocId = NULL` |

---

## 🔒 Notas de seguridad

- ⚠️ La eliminación de un Sustento es **irreversible** y afecta múltiples registros.
- ✅ El modal de confirmación detalla explícitamente las consecuencias.
- ✅ Se recomienda tener backups regulares de la base de datos.
- 🔄 En el futuro, considerar agregar una opción de "desactivar" en lugar de eliminar para casos sensibles.

---

## 📅 Historial

- **2025-11-04**: Implementación inicial de eliminación en cascada
- **Migración**: `20251104020000_support_cascade_delete`
- **Build status**: ✅ Passed
- **Prisma Client**: ✅ Regenerado

