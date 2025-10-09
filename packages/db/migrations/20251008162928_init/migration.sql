-- CreateEnum
CREATE TYPE "ClType" AS ENUM ('PPTO', 'RPPTO', 'GASTO', 'PROVISION');

-- CreateEnum
CREATE TYPE "ClState" AS ENUM ('NO_PROCESADO', 'PROCESADO', 'PROVISIONADO');

-- CreateEnum
CREATE TYPE "InvStatus" AS ENUM ('INGRESADO', 'EN_APROBACION', 'EN_CONTABILIDAD', 'EN_TESORERIA', 'EN_ESPERA_DE_PAGO', 'PAGADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "InvDocType" AS ENUM ('FACTURA', 'NOTA_CREDITO');

-- CreateTable
CREATE TABLE "Period" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingClosure" (
    "id" SERIAL NOT NULL,
    "periodId" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3),
    "sourceRef" TEXT,

    CONSTRAINT "AccountingClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxReference" (
    "id" SERIAL NOT NULL,
    "currency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "FxReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Support" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "costCenterId" INTEGER,
    "category" TEXT,
    "subcategory" TEXT,
    "vendorId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Support_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetVersion" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "BudgetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAllocation" (
    "id" SERIAL NOT NULL,
    "versionId" INTEGER NOT NULL,
    "supportId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "amountLocal" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',

    CONSTRAINT "BudgetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "legalName" TEXT NOT NULL,
    "taxId" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "vendorId" INTEGER,
    "incCode" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER,
    "docType" "InvDocType" NOT NULL DEFAULT 'FACTURA',
    "numberNorm" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "totalForeign" DECIMAL(65,30),
    "totalLocal" DECIMAL(65,30),
    "statusCurrent" "InvStatus" NOT NULL DEFAULT 'INGRESADO',
    "ultimusIncident" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceStatusHistory" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "status" "InvStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    "note" TEXT,

    CONSTRAINT "InvoiceStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlLine" (
    "id" SERIAL NOT NULL,
    "supportId" INTEGER NOT NULL,
    "type" "ClType" NOT NULL,
    "state" "ClState" NOT NULL DEFAULT 'NO_PROCESADO',
    "periodId" INTEGER NOT NULL,
    "accountingPeriodId" INTEGER,
    "invoiceId" INTEGER,
    "poId" INTEGER,
    "description" TEXT,
    "currency" TEXT,
    "amountForeign" DECIMAL(65,30),
    "fxRateProvisional" DECIMAL(65,30) DEFAULT 1.0,
    "fxRateFinal" DECIMAL(65,30),
    "amountLocal" DECIMAL(65,30) NOT NULL,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountingClosure_periodId_key" ON "AccountingClosure"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "Support_code_key" ON "Support"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_taxId_key" ON "Vendor"("taxId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

-- AddForeignKey
ALTER TABLE "AccountingClosure" ADD CONSTRAINT "AccountingClosure_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BudgetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "Support"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAllocation" ADD CONSTRAINT "BudgetAllocation_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceStatusHistory" ADD CONSTRAINT "InvoiceStatusHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlLine" ADD CONSTRAINT "ControlLine_supportId_fkey" FOREIGN KEY ("supportId") REFERENCES "Support"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlLine" ADD CONSTRAINT "ControlLine_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlLine" ADD CONSTRAINT "ControlLine_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlLine" ADD CONSTRAINT "ControlLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlLine" ADD CONSTRAINT "ControlLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
