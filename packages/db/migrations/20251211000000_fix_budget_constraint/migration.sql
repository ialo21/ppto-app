-- Migración para corregir el constraint único de BudgetAllocation
-- Asegura que el constraint incluya budgetType para soportar PPTO y RPPTO

-- Paso 1: Verificar y agregar campo budgetType si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'BudgetAllocation' AND column_name = 'budgetType'
    ) THEN
        ALTER TABLE "BudgetAllocation" ADD COLUMN "budgetType" TEXT NOT NULL DEFAULT 'PPTO';
    END IF;
END $$;

-- Paso 2: Eliminar constraints/índices anteriores que puedan existir
DROP INDEX IF EXISTS "ux_alloc_version_period_support_ceco";
DROP INDEX IF EXISTS "ux_alloc_version_period_support_ceco_type";

-- Paso 3: Crear el índice único correcto con budgetType
CREATE UNIQUE INDEX "ux_alloc_version_period_support_ceco_type" 
ON "BudgetAllocation"("versionId", "periodId", "supportId", "costCenterId", "budgetType");

-- Paso 4: Crear índice de performance para budgetType si no existe
CREATE INDEX IF NOT EXISTS "ix_alloc_budget_type" ON "BudgetAllocation"("budgetType");

-- Paso 5: Crear índice de performance para period/ceco si no existe
CREATE INDEX IF NOT EXISTS "ix_alloc_period_ceco" ON "BudgetAllocation"("periodId", "costCenterId");
