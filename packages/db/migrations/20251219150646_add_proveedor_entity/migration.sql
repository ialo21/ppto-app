-- AlterTable
ALTER TABLE "OC" ADD COLUMN     "proveedorId" INTEGER,
ALTER COLUMN "proveedor" DROP NOT NULL,
ALTER COLUMN "ruc" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" SERIAL NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_ruc_key" ON "Proveedor"("ruc");

-- CreateIndex
CREATE INDEX "ix_proveedor_ruc" ON "Proveedor"("ruc");

-- CreateIndex
CREATE INDEX "ix_proveedor_razon_social" ON "Proveedor"("razonSocial");

-- CreateIndex
CREATE INDEX "ix_oc_proveedor" ON "OC"("proveedorId");

-- AddForeignKey
ALTER TABLE "OC" ADD CONSTRAINT "OC_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ux_oc_document_pair" RENAME TO "OCDocument_ocId_documentId_key";
