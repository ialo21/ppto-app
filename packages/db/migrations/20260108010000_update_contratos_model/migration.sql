-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Actualizar Modelo de Contratos
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Cambios:
-- 1. Eliminar campo fechaCese de RecursoTercerizado
-- 2. Eliminar campo ultimaOcId (migrar a relación M:N)
-- 3. Crear tabla RecursoTercOC para relación many-to-many con OCs
-- 4. Eliminar campo fechaCese de HistoricoContrato
-- 5. Eliminar campo ocId de HistoricoContrato
-- ═══════════════════════════════════════════════════════════════════════════

-- Paso 1: Crear tabla RecursoTercOC para relación M:N
CREATE TABLE IF NOT EXISTS "RecursoTercOC" (
    "id" SERIAL NOT NULL,
    "recursoTercId" INTEGER NOT NULL,
    "ocId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecursoTercOC_pkey" PRIMARY KEY ("id")
);

-- Paso 2: Agregar constraints y índices para RecursoTercOC
CREATE UNIQUE INDEX IF NOT EXISTS "RecursoTercOC_recursoTercId_ocId_key" ON "RecursoTercOC"("recursoTercId", "ocId");
CREATE INDEX IF NOT EXISTS "ix_recurso_terc_oc_recurso" ON "RecursoTercOC"("recursoTercId");
CREATE INDEX IF NOT EXISTS "ix_recurso_terc_oc_oc" ON "RecursoTercOC"("ocId");

-- Paso 3: Agregar foreign keys para RecursoTercOC
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercOC_recursoTercId_fkey') THEN
        ALTER TABLE "RecursoTercOC" 
            ADD CONSTRAINT "RecursoTercOC_recursoTercId_fkey" 
            FOREIGN KEY ("recursoTercId") REFERENCES "RecursoTercerizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercOC_ocId_fkey') THEN
        ALTER TABLE "RecursoTercOC" 
            ADD CONSTRAINT "RecursoTercOC_ocId_fkey" 
            FOREIGN KEY ("ocId") REFERENCES "OC"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Paso 4: Migrar datos existentes de ultimaOcId a RecursoTercOC
INSERT INTO "RecursoTercOC" ("recursoTercId", "ocId", "createdAt")
SELECT "id", "ultimaOcId", NOW()
FROM "RecursoTercerizado"
WHERE "ultimaOcId" IS NOT NULL
ON CONFLICT ("recursoTercId", "ocId") DO NOTHING;

-- Paso 5: Eliminar columnas obsoletas de RecursoTercerizado
ALTER TABLE "RecursoTercerizado" DROP COLUMN IF EXISTS "fechaCese";
ALTER TABLE "RecursoTercerizado" DROP COLUMN IF EXISTS "ultimaOcId";

-- Paso 6: Eliminar columnas obsoletas de HistoricoContrato
ALTER TABLE "HistoricoContrato" DROP COLUMN IF EXISTS "fechaCese";
ALTER TABLE "HistoricoContrato" DROP COLUMN IF EXISTS "ocId";
