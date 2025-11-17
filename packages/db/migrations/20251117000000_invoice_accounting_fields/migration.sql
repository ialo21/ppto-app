-- AlterTable: agregar campos contables a Invoice
ALTER TABLE "Invoice" ADD COLUMN "mesContable" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "tcEstandar" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "tcReal" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "montoPEN_tcEstandar" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "montoPEN_tcReal" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "diferenciaTC" DECIMAL(65,30);

