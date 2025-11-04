-- Migration: Hacer el nombre opcional en CostCenter
-- El código sigue siendo la clave única, el nombre puede estar vacío

ALTER TABLE "CostCenter" ALTER COLUMN "name" DROP NOT NULL;

