-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('COTIZACION', 'FACTURA', 'CONTRATO', 'OTRO');

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "category" "DocumentCategory" NOT NULL DEFAULT 'COTIZACION',
    "uploadedBy" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OCDocument" (
    "id" SERIAL NOT NULL,
    "ocId" INTEGER NOT NULL,
    "documentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OCDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_driveFileId_key" ON "Document"("driveFileId");

-- CreateIndex
CREATE INDEX "ix_document_drive_file" ON "Document"("driveFileId");

-- CreateIndex
CREATE INDEX "ix_document_category" ON "Document"("category");

-- CreateIndex
CREATE INDEX "ix_ocdocument_oc" ON "OCDocument"("ocId");

-- CreateIndex
CREATE INDEX "ix_ocdocument_document" ON "OCDocument"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ux_oc_document_pair" ON "OCDocument"("ocId", "documentId");

-- AddForeignKey
ALTER TABLE "OCDocument" ADD CONSTRAINT "OCDocument_ocId_fkey" FOREIGN KEY ("ocId") REFERENCES "OC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OCDocument" ADD CONSTRAINT "OCDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
