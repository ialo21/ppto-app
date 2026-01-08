-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Módulo de Contratos - Recursos Tercerizados
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Esta migración:
-- 1. Crea el enum RecursoStatus
-- 2. Crea las tablas RecursoTercerizado y HistoricoContrato
-- 3. Agrega relaciones inversas en Management, Proveedor, Support y OC
-- 4. Inserta permisos para el módulo de Contratos
--
-- IMPORTANTE: Esta migración es generada manualmente siguiendo los patrones
-- del proyecto. Debe ejecutarse DESPUÉS de las migraciones existentes.
-- ═══════════════════════════════════════════════════════════════════════════

-- Paso 1: Crear enum RecursoStatus
DO $$ BEGIN
    CREATE TYPE "RecursoStatus" AS ENUM ('ACTIVO', 'CESADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Paso 2: Crear tabla RecursoTercerizado
CREATE TABLE IF NOT EXISTS "RecursoTercerizado" (
    "id" SERIAL NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "managementId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "supportId" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaCese" TIMESTAMP(3),
    "montoMensual" DECIMAL(65,30) NOT NULL,
    "linkContrato" TEXT,
    "ultimaOcId" INTEGER,
    "status" "RecursoStatus" NOT NULL DEFAULT 'ACTIVO',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,

    CONSTRAINT "RecursoTercerizado_pkey" PRIMARY KEY ("id")
);

-- Paso 3: Crear tabla HistoricoContrato
CREATE TABLE IF NOT EXISTS "HistoricoContrato" (
    "id" SERIAL NOT NULL,
    "recursoTercId" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaCese" TIMESTAMP(3),
    "montoMensual" DECIMAL(65,30) NOT NULL,
    "linkContrato" TEXT,
    "ocId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoContrato_pkey" PRIMARY KEY ("id")
);

-- Paso 4: Crear índices para RecursoTercerizado
CREATE INDEX IF NOT EXISTS "ix_recurso_management" ON "RecursoTercerizado"("managementId");
CREATE INDEX IF NOT EXISTS "ix_recurso_proveedor" ON "RecursoTercerizado"("proveedorId");
CREATE INDEX IF NOT EXISTS "ix_recurso_support" ON "RecursoTercerizado"("supportId");
CREATE INDEX IF NOT EXISTS "ix_recurso_status" ON "RecursoTercerizado"("status");
CREATE INDEX IF NOT EXISTS "ix_recurso_fecha_fin" ON "RecursoTercerizado"("fechaFin");

-- Paso 5: Crear índices para HistoricoContrato
CREATE INDEX IF NOT EXISTS "ix_historico_recurso" ON "HistoricoContrato"("recursoTercId");
CREATE INDEX IF NOT EXISTS "ix_historico_periodo" ON "HistoricoContrato"("fechaInicio", "fechaFin");

-- Paso 6: Agregar foreign keys
-- Usar DO block para agregar constraints solo si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercerizado_managementId_fkey') THEN
        ALTER TABLE "RecursoTercerizado" 
            ADD CONSTRAINT "RecursoTercerizado_managementId_fkey" 
            FOREIGN KEY ("managementId") REFERENCES "Management"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercerizado_proveedorId_fkey') THEN
        ALTER TABLE "RecursoTercerizado" 
            ADD CONSTRAINT "RecursoTercerizado_proveedorId_fkey" 
            FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercerizado_supportId_fkey') THEN
        ALTER TABLE "RecursoTercerizado" 
            ADD CONSTRAINT "RecursoTercerizado_supportId_fkey" 
            FOREIGN KEY ("supportId") REFERENCES "Support"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecursoTercerizado_ultimaOcId_fkey') THEN
        ALTER TABLE "RecursoTercerizado" 
            ADD CONSTRAINT "RecursoTercerizado_ultimaOcId_fkey" 
            FOREIGN KEY ("ultimaOcId") REFERENCES "OC"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HistoricoContrato_recursoTercId_fkey') THEN
        ALTER TABLE "HistoricoContrato" 
            ADD CONSTRAINT "HistoricoContrato_recursoTercId_fkey" 
            FOREIGN KEY ("recursoTercId") REFERENCES "RecursoTercerizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Paso 7: Insertar permisos para el módulo de Contratos
-- Permiso global del módulo
INSERT INTO "Permission" ("key", "name", "description", "module", "sortOrder", "parentKey") 
VALUES ('contratos', 'Contratos', 'Acceso al módulo de contratos (recursos tercerizados)', 'contratos', 70, NULL)
ON CONFLICT ("key") DO NOTHING;

-- Nota: Se puede extender en el futuro con permisos específicos como:
-- 'contratos:recursos', 'contratos:licencias', 'contratos:servicios'
-- Por ahora, con 'contratos' es suficiente para acceder al módulo completo.
