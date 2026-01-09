-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar campo responsableId a RecursoTercerizado
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Cambios:
-- 1. Agregar campo responsableId a RecursoTercerizado (requerido)
-- 2. Agregar índice para responsableId
-- 3. Agregar foreign key constraint
-- ═══════════════════════════════════════════════════════════════════════════

-- Paso 1: Agregar columna responsableId (nullable temporalmente)
ALTER TABLE "RecursoTercerizado" ADD COLUMN IF NOT EXISTS "responsableId" INTEGER;

-- Paso 2: Asignar un valor por defecto a registros existentes
-- Usar el primer usuario activo del sistema como responsable temporal
DO $$ 
DECLARE
    first_user_id INT;
BEGIN
    -- Obtener el primer usuario activo
    SELECT id INTO first_user_id FROM "User" WHERE "active" = true ORDER BY id LIMIT 1;
    
    -- Si existe al menos un usuario, actualizar registros existentes
    IF first_user_id IS NOT NULL THEN
        UPDATE "RecursoTercerizado" 
        SET "responsableId" = first_user_id 
        WHERE "responsableId" IS NULL;
    END IF;
END $$;

-- Paso 3: Hacer la columna NOT NULL
ALTER TABLE "RecursoTercerizado" ALTER COLUMN "responsableId" SET NOT NULL;

-- Paso 4: Crear índice
CREATE INDEX IF NOT EXISTS "ix_recurso_responsable" ON "RecursoTercerizado"("responsableId");

-- Paso 5: Agregar foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercerizado_responsableId_fkey') THEN
        ALTER TABLE "RecursoTercerizado" 
            ADD CONSTRAINT "RecursoTercerizado_responsableId_fkey" 
            FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
