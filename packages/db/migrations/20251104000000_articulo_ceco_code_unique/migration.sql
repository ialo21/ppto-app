-- Migration: Eliminar unicidad de name y establecer unicidad de code en CostCenter y Articulo
-- Permitir nombres duplicados, usar código como clave única

-- 1. Eliminar índices únicos de name (case-insensitive) en CostCenter y Articulo
DROP INDEX IF EXISTS "CostCenter_name_unique_lower";
DROP INDEX IF EXISTS "Articulo_name_unique_lower";

-- 2. Crear índices únicos case-insensitive en code (si no existen)
-- CostCenter ya tiene @unique en code desde el schema original, pero agregamos case-insensitive
DROP INDEX IF EXISTS "CostCenter_code_key";
CREATE UNIQUE INDEX "CostCenter_code_unique_lower" ON "CostCenter"(LOWER("code"));

-- Articulo ya tiene @unique en code desde el schema original, pero agregamos case-insensitive
DROP INDEX IF EXISTS "Articulo_code_key";
CREATE UNIQUE INDEX "Articulo_code_unique_lower" ON "Articulo"(LOWER("code"));

-- Nota: Los nombres ahora pueden duplicarse. El código es la clave única.

