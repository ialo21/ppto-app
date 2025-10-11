-- Rename existing categorization columns to reflect business meaning
ALTER TABLE "Support" RENAME COLUMN "category" TO "management";
ALTER TABLE "Support" RENAME COLUMN "subcategory" TO "area";

-- Core master data tables
CREATE TABLE "CostCenter" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

CREATE TABLE "ExpensePackage" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL
);

CREATE UNIQUE INDEX "ExpensePackage_name_key" ON "ExpensePackage"("name");

CREATE TABLE "ExpenseConcept" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL REFERENCES "ExpensePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ExpenseConcept_name_packageId_key" ON "ExpenseConcept"("name", "packageId");
CREATE INDEX "ExpenseConcept_packageId_idx" ON "ExpenseConcept"("packageId");

-- Support links
ALTER TABLE "Support" ADD COLUMN "expensePackageId" INTEGER;
ALTER TABLE "Support" ADD COLUMN "expenseConceptId" INTEGER;

ALTER TABLE "Support"
    ADD CONSTRAINT "Support_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Support"
    ADD CONSTRAINT "Support_expensePackageId_fkey" FOREIGN KEY ("expensePackageId") REFERENCES "ExpensePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Support"
    ADD CONSTRAINT "Support_expenseConceptId_fkey" FOREIGN KEY ("expenseConceptId") REFERENCES "ExpenseConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
