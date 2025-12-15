# Guía de Manejo de Encoding UTF-8 en PPTO App

## 🚨 Problema Identificado

Al restaurar backups de la base de datos usando `type | docker exec`, los caracteres con tildes (á, é, í, ó, ú, ñ) se corrompen y aparecen como `??`.

**Ejemplo:**
- ❌ Incorrecto: `Suscripci??n`, `Gesti??n`, `Auditor??a`
- ✅ Correcto: `Suscripción`, `Gestión`, `Auditoría`

### Causa Raíz

**PowerShell `type` no maneja UTF-8 correctamente por defecto.** Cuando se usa:

```powershell
type backup.sql | docker exec -i ppto-app-db-1 psql -U ppto -d ppto
```

PowerShell lee el archivo como **Latin-1/Windows-1252** en lugar de UTF-8, causando que los bytes UTF-8 multi-byte (como ó = `0xC3 0xB3`) se interpreten incorrectamente, resultando en `??`.

### Configuración Actual

- **PostgreSQL**: UTF-8 (correcto) ✅
- **Prisma Client**: UTF-8 (correcto) ✅
- **Problema**: Scripts de backup/restore previos no especificaban encoding explícito ❌

---

## ✅ Solución Implementada

### 1. Scripts de Backup y Restore Corregidos

#### Generar Backup

```powershell
.\scripts\backup-database.ps1
```

Este script:
- Genera el backup dentro del contenedor Docker con `--encoding=UTF8`
- Copia el archivo manteniendo la codificación UTF-8
- Crea archivo: `backup-ppto-YYYY-MM-DD.sql`

#### Restaurar Backup

```powershell
.\scripts\restore-database.ps1 backup-ppto-YYYY-MM-DD.sql
```

Este script:
- Usa `Get-Content -Encoding UTF8` para leer el archivo correctamente
- Limpia el esquema actual (`DROP SCHEMA public CASCADE`)
- Restaura los datos preservando caracteres UTF-8
- Aplica migraciones de Prisma
- Ejecuta el seed para actualizar permisos

⚠️ **IMPORTANTE**: Estos scripts reemplazan el método manual anterior y previenen la corrupción de caracteres.

---

### 2. Script de Reparación para Datos Ya Corruptos

Si ya restauraste un backup con el método incorrecto y tienes caracteres `??`, usa:

```bash
# Ver qué se reparará (sin aplicar cambios)
cd packages/db
npx tsx scripts/fix-encoding.ts --dry-run

# Aplicar las correcciones
npx tsx scripts/fix-encoding.ts
```

Este script:
- Repara registros conocidos en tablas `Support` y `Area`
- Identifica otros registros con `??` no contemplados
- Es seguro: verifica los datos antes de modificarlos

**Registros reparados automáticamente:**
- Support (7 registros): Ingeniería, Suscripción, Gestión, etc.
- Area (1 registro): Auditoría

---

### 3. Script de Análisis

Para identificar problemas de encoding en la base de datos:

```bash
cd packages/db
npx tsx scripts/analyze-encoding.ts
```

Reporta:
- Configuración de encoding del servidor y cliente
- Registros con caracteres potencialmente corruptos (`??`, `Ã±`, etc.)
- Conteo de registros con caracteres acentuados por tabla

---

## 📋 Procedimiento Correcto para Backup y Restore

### Generar Backup

```powershell
# Desde la raíz del proyecto
.\scripts\backup-database.ps1
```

### Restaurar Backup

```powershell
# 1. Detener el servidor API (Ctrl+C en la terminal donde corre)

# 2. Restaurar
.\scripts\restore-database.ps1 backup-ppto-2024-12-11.sql

# 3. Reiniciar servidor
pnpm run dev
```

---

## 🛠️ Mantenimiento

### Si Encuentras Nuevos Registros Corruptos

1. Identifica el texto correcto en el archivo de backup original:
   ```bash
   grep -n "texto_corrupto" backup-ppto-YYYY-MM-DD.sql
   ```

2. Agrega la corrección al script `packages/db/scripts/fix-encoding.ts`:
   ```typescript
   const SUPPORT_FIXES = [
     // ... registros existentes
     { id: XXX, from: "Texto??Corrupto", to: "TextoCorrecto" },
   ];
   ```

3. Ejecuta el script de reparación:
   ```bash
   npx tsx scripts/fix-encoding.ts
   ```

### Verificar Encoding en la BD

```bash
docker exec ppto-app-db-1 psql -U ppto -d ppto -c "SHOW SERVER_ENCODING; SHOW CLIENT_ENCODING;"
```

Debe mostrar `UTF8` en ambos.

---

## 🚫 Qué NO Hacer

❌ **NO usar `type | docker exec`**
```powershell
# INCORRECTO - Corrompe caracteres UTF-8
type backup.sql | docker exec -i ppto-app-db-1 psql -U ppto -d ppto
```

❌ **NO ejecutar `psql` directamente en PowerShell sin encoding**
```powershell
# INCORRECTO
docker exec -i ppto-app-db-1 psql -U ppto -d ppto < backup.sql
```

✅ **SÍ usar los scripts proporcionados**
```powershell
# CORRECTO
.\scripts\restore-database.ps1 backup.sql
```

---

## 📊 Tablas Afectadas (Historial)

Según el análisis del backup del 2024-12-11, las tablas con registros corruptos fueron:

| Tabla | Registros Afectados | Campos |
|-------|---------------------|--------|
| `Support` | 7 | `name` |
| `Area` | 1 | `name` |
| `ExpenseConcept` | 0 | - |
| `ExpensePackage` | 0 | - |
| `Management` | 0 | - |

Todos los registros identificados han sido reparados usando `fix-encoding.ts`.

---

## 🔗 Referencias

- [PostgreSQL Character Set Support](https://www.postgresql.org/docs/current/multibyte.html)
- [PowerShell Encoding Issues](https://learn.microsoft.com/en-us/powershell/scripting/dev-cross-plat/vscode/understanding-file-encoding)
- [Prisma Database Encoding](https://www.prisma.io/docs/concepts/database-connectors/postgresql#character-set-and-collation)

---

## 📝 Changelog

- **2024-12-11**: Problema identificado y solucionado
  - Creados scripts de backup/restore con encoding correcto
  - Script de reparación para datos corruptos
  - Documentación completa del proceso
