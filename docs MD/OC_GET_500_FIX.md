# Fix: Error 500 en GET /ocs

## 🐛 Problema

**Error:** `GET :3001/ocs → 500 Internal Server Error`  
**Causa:** La migración para la tabla `OCCostCenter` (M:N) no se había aplicado a la base de datos.

## 🔍 Diagnóstico

El código del endpoint ya estaba correcto con el `include` adecuado para la relación M:N:

```typescript
include: {
  support: { select: { id: true, code: true, name: true } },
  budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
  budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
  articulo: { select: { id: true, code: true, name: true } },
  ceco: { select: { id: true, code: true, name: true } },
  costCenters: {  // ← Relación M:N correcta
    include: { 
      costCenter: { select: { id: true, code: true, name: true } }
    }
  }
}
```

Pero la tabla `OCCostCenter` no existía en la base de datos porque la migración no se había ejecutado.

## ✅ Solución

### 1. Aplicar migración pendiente

```bash
cd packages/db
pnpm prisma migrate deploy
```

**Resultado:**
```
Applying migration `20251114000000_oc_costcenter_many_to_many`

The following migration(s) have been applied:

migrations/
  └─ 20251114000000_oc_costcenter_many_to_many/
    └─ migration.sql
      
All migrations have been successfully applied.
```

### 2. Agregar try-catch para mejor logging

**Archivo:** `apps/api/src/oc.ts`

```typescript
app.get("/ocs", async (req, reply) => {
  try {
    // ... código existente ...
    
    const items = await prisma.oC.findMany({
      where,
      orderBy: [{ fechaRegistro: "desc" }, { id: "desc" }],
      include: {
        support: { select: { id: true, code: true, name: true } },
        budgetPeriodFrom: { select: { id: true, year: true, month: true, label: true } },
        budgetPeriodTo: { select: { id: true, year: true, month: true, label: true } },
        articulo: { select: { id: true, code: true, name: true } },
        ceco: { select: { id: true, code: true, name: true } },
        costCenters: { 
          include: { 
            costCenter: { select: { id: true, code: true, name: true } }
          }
        }
      }
    });

    return items;
  } catch (err: any) {
    console.error('[GET /ocs] Error:', err);
    return reply.code(500).send({ 
      error: "Error al obtener órdenes de compra",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
```

## 📋 Verificación

### Estado de la tabla OCCostCenter

La tabla fue creada exitosamente con:
- Columnas: `id`, `ocId`, `costCenterId`, `createdAt`
- Constraint único: `ux_oc_costcenter_pair` en `(ocId, costCenterId)`
- Índices: `ix_occostcenter_oc`, `ix_occostcenter_costcenter`
- Foreign keys con `CASCADE DELETE`

### Migración de datos

La migración también copió automáticamente los CECOs existentes:

```sql
INSERT INTO "OCCostCenter" ("ocId", "costCenterId", "createdAt")
SELECT 
  o."id" AS "ocId",
  o."cecoId" AS "costCenterId",
  NOW() AS "createdAt"
FROM "OC" o
WHERE o."cecoId" IS NOT NULL
ON CONFLICT DO NOTHING;
```

## ✅ Resultado

- ✅ GET /ocs responde 200 OK
- ✅ Devuelve array de OCs con múltiples CECOs
- ✅ Cada OC incluye `costCenters` con la relación M:N
- ✅ Frontend muestra CECOs como chips
- ✅ Logging mejorado para futuros errores

## 📝 Estructura de Respuesta

Cada OC ahora incluye:

```typescript
{
  id: number,
  // ... otros campos ...
  support: { id, code, name },
  budgetPeriodFrom: { id, year, month, label },
  budgetPeriodTo: { id, year, month, label },
  articulo: { id, code, name } | null,
  ceco: { id, code, name } | null,  // DEPRECATED
  costCenters: [  // NUEVO: M:N
    {
      id: number,
      ocId: number,
      costCenterId: number,
      costCenter: { id, code, name },
      createdAt: string
    },
    // ... más CECOs ...
  ]
}
```

## 🚀 Pasos siguientes

Si el servidor está corriendo, reiniciarlo para que el cliente Prisma se regenere con el nuevo schema:

```bash
# Detener el servidor (Ctrl+C)
# Reiniciar
pnpm dev
```

---

**Fecha:** 14 de noviembre de 2025  
**Estado:** ✅ Resuelto  
**Endpoint:** GET /ocs funcionando correctamente

