-- AlterTable
-- Add solicitanteUserId field and make legacy text fields nullable
ALTER TABLE "OC" ADD COLUMN "solicitanteUserId" INTEGER;
ALTER TABLE "OC" ALTER COLUMN "nombreSolicitante" DROP NOT NULL;
ALTER TABLE "OC" ALTER COLUMN "correoSolicitante" DROP NOT NULL;

-- Migrate existing OCs: Match correoSolicitante with User.email
-- This will set solicitanteUserId for existing OCs where a matching user exists
UPDATE "OC" 
SET "solicitanteUserId" = (
  SELECT "User"."id" 
  FROM "User" 
  WHERE "User"."email" = "OC"."correoSolicitante"
  LIMIT 1
)
WHERE "correoSolicitante" IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM "User" WHERE "User"."email" = "OC"."correoSolicitante"
  );

-- CreateIndex
CREATE INDEX "ix_oc_solicitante" ON "OC"("solicitanteUserId");

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_solicitanteUserId_fkey" FOREIGN KEY ("solicitanteUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
