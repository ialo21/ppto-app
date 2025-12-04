/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Articulo` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `CostCenter` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Area_code_key";

-- DropIndex
DROP INDEX "ExpenseConcept_name_packageId_key";

-- DropIndex
DROP INDEX "ExpenseConcept_packageId_idx";

-- DropIndex
DROP INDEX "ExpensePackage_name_key";

-- DropIndex
DROP INDEX "Management_code_key";

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "googleId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "ix_user_email" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "ix_role_name" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "ix_permission_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "ix_userrole_user" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "ix_userrole_role" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "ix_rolepermission_role" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "ix_rolepermission_permission" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Articulo_code_key" ON "Articulo"("code");

-- CreateIndex
CREATE INDEX "ix_cl_period" ON "ControlLine"("periodId");

-- CreateIndex
CREATE INDEX "ix_cl_accounting_period" ON "ControlLine"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "ix_cl_type_state" ON "ControlLine"("type", "state");

-- CreateIndex
CREATE INDEX "ix_cl_support_accounting_period" ON "ControlLine"("supportId", "accountingPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ux_alloc_version_period_support_ceco" RENAME TO "BudgetAllocation_versionId_periodId_supportId_costCenterId_key";

-- RenameIndex
ALTER INDEX "ux_invoice_costcenter_pair" RENAME TO "InvoiceCostCenter_invoiceId_costCenterId_key";

-- RenameIndex
ALTER INDEX "ux_invoice_period_pair" RENAME TO "InvoicePeriod_invoiceId_periodId_key";

-- RenameIndex
ALTER INDEX "ux_oc_costcenter_pair" RENAME TO "OCCostCenter_ocId_costCenterId_key";

-- RenameIndex
ALTER INDEX "ux_support_costcenter_pair" RENAME TO "SupportCostCenter_supportId_costCenterId_key";
