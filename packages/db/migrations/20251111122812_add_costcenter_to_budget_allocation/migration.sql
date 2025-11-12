-- AlterTable
ALTER TABLE "BudgetAllocation" ADD COLUMN "costCenterId" INTEGER;

-- DropIndex (old unique constraint)
DROP INDEX IF EXISTS "ux_alloc_version_period_support";

-- CreateIndex (new unique constraint with costCenterId)
CREATE UNIQUE INDEX "ux_alloc_version_period_support_ceco" ON "BudgetAllocation"("versionId", "periodId", "supportId", "costCenterId");

-- CreateIndex (new index for performance)
CREATE INDEX "ix_alloc_period_ceco" ON "BudgetAllocation"("periodId", "costCenterId");

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

