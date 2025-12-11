-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "module" TEXT,
ADD COLUMN     "parentKey" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ix_permission_module" ON "Permission"("module");

-- CreateIndex
CREATE INDEX "ix_permission_parent" ON "Permission"("parentKey");

-- RenameIndex
ALTER INDEX "ux_alloc_version_period_support_ceco_type" RENAME TO "BudgetAllocation_versionId_periodId_supportId_costCenterId__key";
