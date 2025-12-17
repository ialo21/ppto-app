# A) Generar backup en prod (VM)

Genera un backup de la base de datos PostgreSQL con encoding UTF-8 correcto.

## Comando para generar backup

```bash
# Generar backup con encoding UTF-8 correcto
docker exec ppto-app-db-1 pg_dump \
  -U ppto \
  -d ppto \
  --encoding=UTF8 \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  > backup-ppto-$(date +%Y-%m-%d).sql
```

**Resultado:** Se creará un archivo `backup-ppto-YYYY-MM-DD.sql` en el directorio actual.

**Nota:** Este comando preserva correctamente los caracteres con tildes (á, é, í, ó, ú, ñ) gracias al flag `--encoding=UTF8`.

---

# B) Restaurar backup en prod (VM)

**Advertencia:** esto borra todo el schema `public`. Hazlo solo cuando estés seguro.

## 1) Parar la app

Parar API/worker que accede a la DB (igual que en el checklist).

## 2) (Opcional pero recomendado) Reiniciar Postgres si vienes de cambios “raros”

Si hiciste cambios que requirieron reiniciar DB (config/volúmenes/locks):

```bash
docker restart ppto-app-db-1
```

## 3) Limpiar schema y restaurar el dump

```bash
# (1) DROP/CREATE schema (borra todo)
docker exec ppto-app-db-1 psql -U ppto -d ppto -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# (2) restaurar: manda el .sql por stdin a psql dentro del contenedor
docker exec -i ppto-app-db-1 psql -U ppto -d ppto < ./backup-ppto-YYYY-MM-DD.sql
```

## 4) Aplicar migraciones (importante)

Desde la raíz del repo en la VM:

```bash
pnpm run db:migrate
```

Esto corre `prisma migrate deploy`. Evita usar `migrate dev` en prod.

## 5) Ejecutar seed (permisos/catálogos)

```bash
pnpm run db:seed
```