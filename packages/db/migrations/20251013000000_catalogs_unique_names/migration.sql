-- Migration: Hacer nombres únicos y code opcional en Gerencias y Áreas

-- 1. Hacer 'code' nullable en Management y Area
ALTER TABLE "Management" ALTER COLUMN "code" DROP NOT NULL;
ALTER TABLE "Area" ALTER COLUMN "code" DROP NOT NULL;

-- 2. Crear índices únicos case-insensitive en 'name'
-- PostgreSQL: usar expresión LOWER(name) para unicidad case-insensitive

-- Drop índice único de code si existe conflicto
ALTER TABLE "Management" DROP CONSTRAINT IF EXISTS "Management_code_key";
ALTER TABLE "Area" DROP CONSTRAINT IF EXISTS "Area_code_key";

-- Crear índices únicos en name (case-insensitive)
CREATE UNIQUE INDEX "Management_name_unique_lower" ON "Management"(LOWER("name"));
CREATE UNIQUE INDEX "Area_name_unique_lower" ON "Area"(LOWER("name"));

-- 3. Agregar índices únicos case-insensitive en otros catálogos para consistencia
CREATE UNIQUE INDEX IF NOT EXISTS "CostCenter_name_unique_lower" ON "CostCenter"(LOWER("name"));
CREATE UNIQUE INDEX IF NOT EXISTS "Articulo_name_unique_lower" ON "Articulo"(LOWER("name"));
CREATE UNIQUE INDEX IF NOT EXISTS "ExpensePackage_name_unique_lower" ON "ExpensePackage"(LOWER("name"));

-- Nota: ExpenseConcept ya tiene combinación package+name única por lógica de negocio
-- pero agregaremos índice para performance
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseConcept_packageId_name_unique_lower" 
  ON "ExpenseConcept"("packageId", LOWER("name"));

-- 4. Support name único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS "Support_name_unique_lower" ON "Support"(LOWER("name"));

