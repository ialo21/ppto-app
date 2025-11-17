-- Migración: Relación M:N entre OC (Orden de Compra) y CostCenter (CECO)
-- Permite que una OC tenga múltiples CECOs asociados

-- 1. Crear tabla puente para relación M:N
CREATE TABLE "OCCostCenter" (
  "id"           SERIAL PRIMARY KEY,
  "ocId"         INT NOT NULL,
  "costCenterId" INT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OCCostCenter_ocId_fkey" 
    FOREIGN KEY ("ocId") REFERENCES "OC"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
  
  CONSTRAINT "OCCostCenter_costCenterId_fkey" 
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Índice único para evitar duplicados del mismo par (OC, CECO)
CREATE UNIQUE INDEX "ux_oc_costcenter_pair" 
  ON "OCCostCenter"("ocId", "costCenterId");

-- 3. Índices para performance
CREATE INDEX "ix_occostcenter_oc" ON "OCCostCenter"("ocId");
CREATE INDEX "ix_occostcenter_costcenter" ON "OCCostCenter"("costCenterId");

-- 4. Migrar datos existentes: Si OC tiene cecoId, copiar a tabla puente
INSERT INTO "OCCostCenter" ("ocId", "costCenterId", "createdAt")
SELECT 
  o."id" AS "ocId",
  o."cecoId" AS "costCenterId",
  NOW() AS "createdAt"
FROM "OC" o
WHERE o."cecoId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. NOTA: No eliminamos OC.cecoId por compatibilidad legacy
-- Se marca como DEPRECATED en el schema y mantiene NULL para nuevos registros

