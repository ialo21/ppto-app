# Persistencia de Datos en Desarrollo - Fix Completado

**Fecha:** 15 de Octubre de 2025  
**Estado:** ✅ COMPLETADO

## 🎯 Problema Resuelto

Los datos de desarrollo se borraban al parar/arrancar la base de datos porque:
- `db:down` usaba `-v` (borraba volúmenes)
- `seed.ts` era destructivo (`deleteMany()` en todas las tablas)

## 🔧 Cambios Realizados

### 1. Scripts de package.json

**Antes:**
```json
{
  "db:up": "docker compose up -d",
  "db:down": "docker compose down -v",  // ❌ Borra volúmenes
  "db:seed": "pnpm -C packages/db seed"
}
```

**Después:**
```json
{
  "db:up": "docker compose up -d db",
  "db:stop": "docker compose stop db",          // ✅ Nuevo: para sin borrar
  "db:down": "docker compose down",              // ✅ Sin -v: preserva datos
  "db:reset": "docker compose down -v && ...",   // ✅ Nuevo: reset completo
  "migrate:deploy": "cd packages/db && pnpm prisma migrate deploy",
  "seed:bootstrap": "cd packages/db && pnpm seed"
}
```

### 2. docker-compose.yml

**Estado:** ✅ Ya tenía volumen con nombre (sin cambios necesarios)

```yaml
volumes:
  - db_data:/var/lib/postgresql/data  # ✅ Volumen con nombre
volumes:
  db_data:  # ✅ Declarado
```

### 3. seed.ts - Idempotente

**Antes:**
```typescript
// ❌ Destructivo
await prisma.invoiceStatusHistory.deleteMany();
await prisma.invoice.deleteMany();
await prisma.controlLine.deleteMany();
// ... borra TODO
```

**Después:**
```typescript
/**
 * Bootstrap seed - Idempotente
 * Crea datos mínimos necesarios sin destruir datos existentes.
 * Seguro ejecutar múltiples veces.
 */

// ✅ Upsert por claves únicas
await prisma.period.upsert({
  where: { id: existingId || 0 },
  update: {},
  create: { year: 2026, month: m, label: "..." }
});

// ✅ Verificar antes de crear
const fxCount = await prisma.fxReference.count();
if (fxCount === 0) {
  await prisma.fxReference.createMany({ ... });
}

// ✅ findFirst antes de create
let version = await prisma.budgetVersion.findFirst({ ... });
if (!version) {
  version = await prisma.budgetVersion.create({ ... });
}
```

## 📁 Archivos Modificados

1. ✅ `package.json` - Scripts actualizados
2. ✅ `packages/db/seed.ts` - Convertido a idempotente
3. ✅ `docker-compose.yml` - Sin cambios (ya correcto)

## 🚀 Flujo Recomendado

### Desarrollo Normal (Preserva Datos)

```bash
# Levantar DB
pnpm run db:up

# Aplicar migraciones
pnpm run migrate:deploy

# Seed inicial (solo si DB vacía)
pnpm run seed:bootstrap

# Desarrollo
pnpm run dev

# Parar DB sin perder datos
pnpm run db:stop

# Bajar DB sin perder datos
pnpm run db:down
```

### Reset Completo (Borra TODO)

```bash
# Reset total (borra volúmenes)
pnpm run db:reset

# Luego aplicar migraciones y seed
pnpm run migrate:deploy
pnpm run seed:bootstrap
```

## ✅ Validación

```bash
✅ pnpm prisma migrate status
# Database schema is up to date!

✅ pnpm run migrate:deploy
# No pending migrations to apply.

✅ docker compose down
# No borra volúmenes

✅ docker compose up -d db
# Datos preservados
```

## 📊 Comparación

| Acción | Antes | Después |
|--------|-------|---------|
| `db:stop` | No existía | ✅ Para sin borrar |
| `db:down` | Borraba volúmenes (-v) | ✅ Preserva datos |
| `db:reset` | No existía | ✅ Limpieza total |
| `seed` | Destructivo (deleteMany) | ✅ Idempotente (upsert) |
| Volumen DB | Con nombre ✅ | Sin cambios |

## 🎯 Criterios de Aceptación

- [x] Parar/arrancar con `db:stop`/`db:up` NO borra datos
- [x] `db:down` NO borra datos (sin `-v`)
- [x] `db:reset` SÍ limpia todo (incluye `-v`)
- [x] `seed:bootstrap` es idempotente
- [x] `migrate:deploy` funciona correctamente

## 🔍 Detalles Técnicos

### Seeds Idempotentes

**Periodos:** Usa `upsert` con fallback a `findFirst`
```typescript
await prisma.period.upsert({
  where: { id: (await prisma.period.findFirst({ ... }))?.id || 0 },
  update: {},
  create: { ... }
});
```

**Cost Centers:** Usa `upsert` por `code` único
```typescript
await prisma.costCenter.upsert({
  where: { code: "CC-TI" },
  update: {},
  create: { ... }
});
```

**Supports:** Usa `upsert` por `name` único
```typescript
await prisma.support.upsert({
  where: { name: "Servicios Externos QA" },
  update: {},
  create: { ... }
});
```

**OCs de ejemplo:** Solo crea si `count() === 0`
```typescript
const ocCount = await prisma.oC.count();
if (ocCount === 0) {
  await prisma.oC.createMany({ ... });
}
```

## 🛡️ Seguridad

- ✅ Volúmenes persistentes en desarrollo
- ✅ Seeds no destructivos
- ✅ Opción de reset explícita (`db:reset`)
- ✅ Logs claros en seed (`🌱 Iniciando...`, `✅ Completado`)

## 📝 Notas

- Docker Compose ya usaba volumen con nombre `db_data`
- Solo se modificaron scripts y seed.ts
- Mantiene compatibilidad con CI/CD
- Safe para ejecutar seed múltiples veces

---

**Resultado:** Desarrollo sin pérdida de datos 🎉

