-- CreateTable: InvoicePeriod (Factura ↔ Periodo M:N)
CREATE TABLE "InvoicePeriod" (
  "id"        SERIAL PRIMARY KEY,
  "invoiceId" INT NOT NULL,
  "periodId"  INT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoicePeriod_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "InvoicePeriod_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: InvoiceCostCenter (Factura ↔ CostCenter M:N con distribución)
CREATE TABLE "InvoiceCostCenter" (
  "id"           SERIAL PRIMARY KEY,
  "invoiceId"    INT NOT NULL,
  "costCenterId" INT NOT NULL,
  "amount"       DECIMAL(65,30),
  "percentage"   DECIMAL(65,30),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoiceCostCenter_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "InvoiceCostCenter_costCenterId_fkey"
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique indexes
CREATE UNIQUE INDEX "ux_invoice_period_pair"
  ON "InvoicePeriod"("invoiceId", "periodId");

CREATE UNIQUE INDEX "ux_invoice_costcenter_pair"
  ON "InvoiceCostCenter"("invoiceId", "costCenterId");

-- Performance indexes
CREATE INDEX "ix_invoiceperiod_invoice" ON "InvoicePeriod"("invoiceId");
CREATE INDEX "ix_invoiceperiod_period" ON "InvoicePeriod"("periodId");
CREATE INDEX "ix_invoicecostcenter_invoice" ON "InvoiceCostCenter"("invoiceId");
CREATE INDEX "ix_invoicecostcenter_costcenter" ON "InvoiceCostCenter"("costCenterId");

