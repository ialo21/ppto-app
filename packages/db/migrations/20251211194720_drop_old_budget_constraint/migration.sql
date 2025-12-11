-- DropIndex: Eliminar el constraint único antiguo de 4 campos
-- Este constraint auto-generado por Prisma causa conflictos al intentar
-- insertar PPTO y RPPTO para el mismo período/sustento/ceco
DROP INDEX "BudgetAllocation_versionId_periodId_supportId_costCenterId_key";

-- El constraint correcto "ux_alloc_version_period_support_ceco_type" con 5 campos
-- (incluyendo budgetType) ya existe y no debe ser modificado
