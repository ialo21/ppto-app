-- Add missing timestamps to Invoice table
-- Siguiendo la convención camelCase del proyecto (como OC y ControlLine)

ALTER TABLE "Invoice" 
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Invoice" 
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Las facturas existentes tendrán el timestamp actual como created/updated
-- En producción, si se requiere preservar fechas históricas, 
-- ejecutar antes: UPDATE "Invoice" SET "createdAt" = "approvedAt" WHERE "approvedAt" IS NOT NULL;

