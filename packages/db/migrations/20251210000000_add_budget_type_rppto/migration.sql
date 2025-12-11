-- AlterTable: Agregar campo budgetType a BudgetAllocation para soportar RPPTO
-- Este campo permite distinguir entre presupuesto original (PPTO) y presupuesto revisado (RPPTO)

-- Paso 1: Agregar el nuevo campo con valor por defecto 'PPTO'
ALTER TABLE "BudgetAllocation" ADD COLUMN "budgetType" TEXT NOT NULL DEFAULT 'PPTO';

-- Paso 2: Crear índice para mejorar performance de consultas por tipo de presupuesto
CREATE INDEX "ix_alloc_budget_type" ON "BudgetAllocation"("budgetType");

-- Paso 3: Eliminar el UNIQUE INDEX anterior
DROP INDEX IF EXISTS "ux_alloc_version_period_support_ceco";

-- Paso 4: Crear el nuevo UNIQUE INDEX que incluye budgetType
-- Esto permite tener PPTO y RPPTO para el mismo período/sustento/ceco
CREATE UNIQUE INDEX "ux_alloc_version_period_support_ceco_type" ON "BudgetAllocation"("versionId", "periodId", "supportId", "costCenterId", "budgetType");

-- Comentario: 
-- Todos los registros existentes quedarán con budgetType='PPTO' (valor por defecto)
-- A partir de ahora se pueden insertar registros con budgetType='RPPTO' para el mismo período
