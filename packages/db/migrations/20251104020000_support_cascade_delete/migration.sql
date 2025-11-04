-- Migración para habilitar eliminación en cascada de Support
-- Permite eliminar un Sustento y todos sus registros asociados automáticamente

-- 1. Eliminar constraint existente de BudgetAllocation
ALTER TABLE "BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_supportId_fkey";

-- 2. Recrear constraint con ON DELETE CASCADE
ALTER TABLE "BudgetAllocation" 
  ADD CONSTRAINT "BudgetAllocation_supportId_fkey" 
  FOREIGN KEY ("supportId") 
  REFERENCES "Support"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 3. Eliminar constraint existente de ControlLine
ALTER TABLE "ControlLine" DROP CONSTRAINT IF EXISTS "ControlLine_supportId_fkey";

-- 4. Recrear constraint con ON DELETE CASCADE
ALTER TABLE "ControlLine" 
  ADD CONSTRAINT "ControlLine_supportId_fkey" 
  FOREIGN KEY ("supportId") 
  REFERENCES "Support"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- 5. Eliminar constraint existente de OC
ALTER TABLE "OC" DROP CONSTRAINT IF EXISTS "OC_supportId_fkey";

-- 6. Recrear constraint con ON DELETE CASCADE
ALTER TABLE "OC" 
  ADD CONSTRAINT "OC_supportId_fkey" 
  FOREIGN KEY ("supportId") 
  REFERENCES "Support"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

