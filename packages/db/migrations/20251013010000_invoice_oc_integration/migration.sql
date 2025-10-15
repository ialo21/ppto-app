-- AddForeignKey: Invoice.ocId → OC
-- Permite que una factura se asocie a una Orden de Compra

ALTER TABLE "Invoice" ADD COLUMN "ocId" INTEGER;

-- Deprecar vendorId manual (ahora se deriva de OC)
-- No eliminamos la columna para mantener compatibilidad con datos legacy

-- Renombrar campos para consistencia
-- totalForeign/totalLocal → montoSinIgv (unificado, usa moneda de la OC)
-- Mantenemos los campos legacy pero agregamos el nuevo

ALTER TABLE "Invoice" ADD COLUMN "montoSinIgv" DECIMAL(65,30);
ALTER TABLE "Invoice" ADD COLUMN "detalle" TEXT;

-- Crear índice para rendimiento
CREATE INDEX "ix_invoice_oc" ON "Invoice"("ocId");

-- Foreign key constraint
ALTER TABLE "Invoice" 
  ADD CONSTRAINT "Invoice_ocId_fkey" 
  FOREIGN KEY ("ocId") 
  REFERENCES "OC"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- Migrar datos existentes si aplica
-- Si hay facturas legacy, mantener montoSinIgv = totalLocal por defecto
UPDATE "Invoice" 
SET "montoSinIgv" = COALESCE("totalLocal", "totalForeign", 0)
WHERE "montoSinIgv" IS NULL;

