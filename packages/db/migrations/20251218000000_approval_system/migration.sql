-- CreateEnum: Add new InvStatus values
-- Note: PostgreSQL enums require ALTER TYPE to add new values
-- IMPORTANT: New enum values cannot be used in UPDATE statements in the same transaction
ALTER TYPE "InvStatus" ADD VALUE IF NOT EXISTS 'APROBACION_HEAD';
ALTER TYPE "InvStatus" ADD VALUE IF NOT EXISTS 'APROBACION_VP';

-- CreateTable: ApprovalThreshold for configurable approval thresholds
CREATE TABLE IF NOT EXISTS "ApprovalThreshold" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "amountPEN" DECIMAL(65,30) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique key for ApprovalThreshold (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalThreshold_key_key" ON "ApprovalThreshold"("key");

-- Seed: Default VP threshold for invoices (10,000 PEN con IGV)
INSERT INTO "ApprovalThreshold" ("key", "description", "amountPEN", "active", "createdAt", "updatedAt")
VALUES ('INVOICE_VP_THRESHOLD', 'Umbral para aprobación VP de facturas (monto con IGV en PEN)', 10000, true, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- NOTE: Migration of existing EN_APROBACION invoices to APROBACION_HEAD must be done
-- in a SEPARATE transaction after this migration commits. Run this manually or via seed:
-- UPDATE "Invoice" SET "statusCurrent" = 'APROBACION_HEAD' WHERE "statusCurrent" = 'EN_APROBACION';
