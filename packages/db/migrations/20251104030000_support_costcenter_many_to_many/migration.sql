-- Migración: Relación M:N entre Support (Sustento) y CostCenter (CECO)
-- Permite que un sustento tenga múltiples CECOs asociados

-- 1. Crear tabla puente para relación M:N
CREATE TABLE "SupportCostCenter" (
  "id"           SERIAL PRIMARY KEY,
  "supportId"    INT NOT NULL,
  "costCenterId" INT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportCostCenter_supportId_fkey" 
    FOREIGN KEY ("supportId") REFERENCES "Support"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
  
  CONSTRAINT "SupportCostCenter_costCenterId_fkey" 
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Índice único para evitar duplicados del mismo par (Support, CECO)
CREATE UNIQUE INDEX "ux_support_costcenter_pair" 
  ON "SupportCostCenter"("supportId", "costCenterId");

-- 3. Índices para performance
CREATE INDEX "ix_supportcostcenter_support" ON "SupportCostCenter"("supportId");
CREATE INDEX "ix_supportcostcenter_costcenter" ON "SupportCostCenter"("costCenterId");

-- 4. Migrar datos existentes: Si Support tiene costCenterId, copiar a tabla puente
INSERT INTO "SupportCostCenter" ("supportId", "costCenterId", "createdAt")
SELECT 
  s."id" AS "supportId",
  s."costCenterId" AS "costCenterId",
  NOW() AS "createdAt"
FROM "Support" s
WHERE s."costCenterId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. NOTA: No eliminamos Support.costCenterId por compatibilidad legacy
-- Marcarlo como DEPRECATED en el código y mantenerlo NULL para nuevos registros

